// Testes do Item 13: personagem extra Cristina tem tipo sanguineo B+ proprio (separado dos demais).
//   node tests/cristina-blood-type.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const storage = new Map();
globalThis.window = {
    location: { search: '' },
    localStorage: {
        getItem: (key) => (storage.has(key) ? storage.get(key) : null),
        setItem: (key, value) => { storage.set(key, String(value)); },
        removeItem: (key) => { storage.delete(key); }
    }
};
String.prototype.setFilter = function () {};
globalThis.Phaser = {
    Scene: class {},
    Textures: { FilterMode: { NEAREST: 0 } },
    Math: {
        Clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
        Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) }
    },
    Geom: {
        Rectangle: class {
            constructor(x, y, w, h) { Object.assign(this, { x, y, width: w, height: h }); }
            contains(x, y) { return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height; }
        }
    },
    Input: { Keyboard: { KeyCodes: { D: 68 } } }
};

class DisplayObject extends EventEmitter {
    constructor(x = 0, y = 0, texture, extra) {
        super();
        Object.assign(this, {
            x, y, texture, visible: true, depth: 0, alpha: 1,
            width: 200, height: 24, displayWidth: 64, displayHeight: 64
        });
        if (typeof extra === 'string') this.text = extra;
    }
    setInteractive() { this.input = { enabled: true }; return this; }
    setVisible(v) { this.visible = v; return this; }
    setTexture(v) { this.texture = v; return this; }
    setText(v) { this.text = v; return this; }
    setDepth(v) { this.depth = v; return this; }
    setAlpha(v) { this.alpha = v; return this; }
    setTint(v) { this.tint = v; return this; }
    clearTint() { this.tint = null; return this; }
    setPosition(x, y) { Object.assign(this, { x, y }); return this; }
    destroy() { this.destroyed = true; }
    getWrappedText(text) { return String(text).split('\n'); }
}
[
    'setOrigin', 'setStrokeStyle', 'setScale', 'setFillStyle', 'setDisplaySize',
    'clear', 'fillStyle', 'fillRect', 'lineStyle', 'strokeRect', 'setCrop',
    'setMask', 'createGeometryMask', 'setFontSize', 'setWordWrapWidth', 'setY'
].forEach((name) => {
    DisplayObject.prototype[name] = function () { return this; };
});

function createSceneMock() {
    const keyboard = Object.assign(new EventEmitter(), { addKey: () => new EventEmitter() });
    const makeObj = (x, y, tex, extra) => new DisplayObject(x, y, tex, extra);
    return {
        add: {
            image: makeObj,
            rectangle: (x, y, width, height) => Object.assign(makeObj(x, y), { width, height }),
            circle: makeObj,
            graphics: makeObj,
            text: (x, y, text) => makeObj(x, y, undefined, text)
        },
        make: { graphics: makeObj },
        input: Object.assign(new EventEmitter(), { keyboard, setDraggable() {} }),
        tweens: { add: () => ({ pause() {}, resume() {}, stop() {} }) },
        time: {
            delayedCall: (_ms, cb) => {
                const timer = { paused: false, remove() {}, trigger: cb };
                return timer;
            }
        },
        sound: { play() {} },
        textures: { exists: () => true, get: () => ({ setFilter() {} }) }
    };
}

const { purchaseShopCharacter, assignShopCharacterReplacement, resetShopMemory } = await import('../src/scenes/shopStore.js');
const { getShopCharacterBloodType } = await import('../src/scenes/shopCharacterPresentation.js');
const { markCharacterAttended, resetInMemoryATP } = await import('../src/scenes/atpStore.js');
const { purchaseCity, resetPurchasedCitiesMemory } = await import('../src/scenes/cityUnlocks.js');
const {
    getEffectiveFixedBloodType,
    getCityOccurrenceRules,
    getCharacterOccurrenceRules,
    getCharacterRh,
    resolveBloodTypeWithRh
} = await import('../src/scenes/cityOccurrenceConfig.js');
const { characterData } = await import('../src/scenes/characterData.js');
const { getDiscoveredType, setDiscoveredType, resolveDiscoveredCharacterId } = await import('../src/scenes/discoveredTypes.js');
const { CharacterDescriptionPanel } = await import('../src/scenes/CharacterDescriptionPanel.js');
const { TypingPhase } = await import('../src/scenes/TypingPhase.js');
const { TransfusionPhase } = await import('../src/scenes/TransfusionPhase.js');
const { Minigame } = await import('../src/scenes/Minigame.js');
const { AttendanceState } = await import('../src/scenes/AttendanceState.js');
const { canReceive, drawRound, isContaminated } = await import('../src/scenes/bloodCompatibility.js');

function resetAll() {
    storage.clear();
    resetShopMemory();
    resetInMemoryATP();
    resetPurchasedCitiesMemory();
}

// 1. Somente Cristina tem bloodType proprio ('B+'); Douglas e Enfermeira nao.
assert.equal(getShopCharacterBloodType('cristina'), 'B+');
assert.equal(getShopCharacterBloodType('douglas'), null);
assert.equal(getShopCharacterBloodType('enfermeira'), null);

// 2. Compra Cristina, libera Cidades 2 e 3 e testa substituicao em Bruno (O-, Cidade 2).
resetAll();
purchaseShopCharacter('cristina');
markCharacterAttended('joaquim');
markCharacterAttended('marlene');
markCharacterAttended('aparecida');
purchaseCity(2);

assert.equal(assignShopCharacterReplacement('cristina', 'bruno'), true);
assert.equal(getEffectiveFixedBloodType('bruno'), 'B+');
assert.equal(resolveBloodTypeWithRh('bruno', characterData.bruno.tipoSanguineo, 2), 'B+');
assert.equal(getCharacterRh('bruno', 2), '+');

// Regra de Rh- por cidade: Cristina nao conta como Rh- e nao empurra Beatriz para Rh-.
const c2Rules = getCityOccurrenceRules(1);
assert.deepEqual(c2Rules.rhNegativeCharacters, ['carlos']);
assert.equal(c2Rules.rhNegativeCount, 1);
assert.equal(getCharacterRh('beatriz', 2), '+');
assert.equal(resolveBloodTypeWithRh('beatriz', characterData.beatriz.tipoSanguineo, 2), 'AB+');

// 3. Cristina substituindo Caue (B-, Cidade 3) e Joaquim (O+, Cidade 1).
assert.equal(assignShopCharacterReplacement('cristina', 'caue'), true);
assert.equal(resolveBloodTypeWithRh('caue', characterData.caue.tipoSanguineo, 3), 'B+');
assert.equal(getCharacterRh('caue', 3), '+');
const c3Rules = getCityOccurrenceRules(2);
assert.deepEqual(c3Rules.rhNegativeCharacters, ['yasmin', 'teo']);
assert.equal(c3Rules.rhNegativeCount, 2);

assert.equal(assignShopCharacterReplacement('cristina', 'joaquim'), true);
assert.equal(resolveBloodTypeWithRh('joaquim', characterData.joaquim.tipoSanguineo, 1), 'B+');
assert.equal(getCharacterRh('joaquim', 1), '+');

// 4. Descricao + tipo descoberto separado de Bruno + TypingPhase e TransfusionPhase com B+.
assert.equal(assignShopCharacterReplacement('cristina', 'bruno'), true);
// Simula que Bruno ja tinha sido descoberto como O- antes da substituicao.
storage.set('hemovilla-discovered-types', JSON.stringify({ bruno: 'O-' }));
assert.equal(resolveDiscoveredCharacterId('bruno'), 'cristina');
assert.equal(getDiscoveredType('bruno'), null, 'Cristina comeca sem tipo descoberto ("?") mesmo se Bruno ja foi descoberto');

const panelScene = createSceneMock();
const descPanel = new CharacterDescriptionPanel(panelScene, characterData);
descPanel.open('bruno');
assert.equal(panelScene.characterOverlay.title.text, 'Cristina');
assert.match(panelScene.characterOverlay.description.text, /^Tipo sanguíneo: \?/);
descPanel.close();

// Fase 2 (Bruno substituido por Cristina): deve resolver tipo 'B' e Rh '+'
const typingScene = createSceneMock();
const typingState = new AttendanceState({ characterId: 'bruno', cityIndex: 1, typeKnown: false });
typingState.advance(); // TIPAGEM
const typing = new TypingPhase(typingScene, typingState, { characterId: 'bruno', cityIndex: 1 });
assert.equal(typing.patientType, 'B');
assert.equal(typing.patientRh, '+');
typing.handleDiagnosis('B');
assert.ok(typing.confirmTimer);
typing.confirmTimer.trigger();
assert.equal(typing.stage, 'RH');
typing.handleRhDiagnosis('+');

const savedTypes = JSON.parse(storage.get('hemovilla-discovered-types'));
assert.equal(savedTypes.cristina, 'B+');
assert.equal(savedTypes.bruno, 'O-', 'Tipo descoberto original de Bruno permanece intacto');

descPanel.open('bruno');
assert.match(panelScene.characterOverlay.description.text, /^Tipo sanguíneo: B\+/);
descPanel.close();

// Ao mover Cristina para Joaquim, Bruno volta a mostrar 'O-' e Cristina mantem 'B+'.
assert.equal(assignShopCharacterReplacement('cristina', 'joaquim'), true);
assert.equal(getDiscoveredType('bruno'), 'O-');
assert.equal(getDiscoveredType('joaquim'), 'B+');

// 5. Se Cristina for tipada na Cidade 1 (salva 'B' sem Rh) e depois colocada na Cidade 2, exige tipagem de Rh; depois de 'B+', pula Fase 2.
storage.set('hemovilla-discovered-types', JSON.stringify({ bruno: 'O-', cristina: 'B' }));
assert.equal(assignShopCharacterReplacement('cristina', 'bruno'), true);
const mgNeedRh = new Minigame();
mgNeedRh.characterId = 'bruno';
mgNeedRh.cityIndex = 1;
mgNeedRh.setupAttendanceState();
assert.equal(mgNeedRh.attendanceState.typeKnown, false);

setDiscoveredType('bruno', 'B+');
const mgKnownRh = new Minigame();
mgKnownRh.characterId = 'bruno';
mgKnownRh.cityIndex = 1;
mgKnownRh.setupAttendanceState();
assert.equal(mgKnownRh.attendanceState.typeKnown, true);

// 6. Fase 3 e regra do item 6 (nunca oferecer bolsa B+ para Cristina) nas Cidades 1, 2 e 3.
for (const [targetId, cityIndex, expectedBags] of [
    ['joaquim', 0, 3],
    ['bruno', 1, 4],
    ['caue', 2, 5]
]) {
    assert.equal(assignShopCharacterReplacement('cristina', targetId), true);
    const rules = getCharacterOccurrenceRules(targetId, cityIndex);

    const tScene = createSceneMock();
    const tState = new AttendanceState({ characterId: targetId, cityIndex, typeKnown: true });
    tState.advance(); // TIPAGEM
    tState.advance(); // TRANSFUSAO
    const transfusion = new TransfusionPhase(tScene, tState, { characterId: targetId, cityIndex });
    assert.equal(transfusion.patientType, 'B+');

    for (let i = 0; i < 100; i++) {
        const bags = drawRound({
            patientType: transfusion.patientType,
            count: rules.totalBags,
            contaminatedCount: rules.contaminatedBags,
            rhEnabled: rules.rhEnabled
        });
        assert.equal(bags.length, expectedBags, `${targetId} (Cidade ${cityIndex + 1}): total de bolsas`);
        assert.ok(!bags.includes('B+'), `${targetId} (Cidade ${cityIndex + 1}): nunca oferece B+`);
        assert.ok(bags.some((b) => canReceive('B+', b, { rhEnabled: rules.rhEnabled })), `${targetId}: >=1 bolsa compativel`);
        assert.equal(bags.filter(isContaminated).length, cityIndex === 2 ? 1 : 0);
        if (cityIndex === 0) {
            assert.ok(bags.every((b) => b.endsWith('+')));
        }
    }
}

// 7. Douglas e Enfermeira continuam herdando o tipo e a descoberta do personagem substituido.
purchaseShopCharacter('douglas');
purchaseShopCharacter('enfermeira');
assert.equal(assignShopCharacterReplacement('douglas', 'bruno'), true);
assert.equal(resolveBloodTypeWithRh('bruno', characterData.bruno.tipoSanguineo, 2), 'O-');
assert.equal(getCharacterRh('bruno', 2), '-');
assert.deepEqual(getCityOccurrenceRules(1).rhNegativeCharacters, ['bruno', 'carlos']);
assert.equal(getCityOccurrenceRules(1).rhNegativeCount, 2);
assert.equal(resolveDiscoveredCharacterId('bruno'), 'bruno');
assert.equal(getDiscoveredType('bruno'), 'O-');

assert.equal(assignShopCharacterReplacement('enfermeira', 'caue'), true);
assert.equal(resolveBloodTypeWithRh('caue', characterData.caue.tipoSanguineo, 3), 'B-');
assert.equal(getCityOccurrenceRules(2).rhNegativeCount, 3);

resetAll();
console.log('OK: Cristina possui tipo B+ proprio, nao altera contagem de Rh- e respeita exclusao de bolsa B+.');
