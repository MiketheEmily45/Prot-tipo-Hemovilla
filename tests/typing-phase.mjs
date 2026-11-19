// Teste unitario da Fase 2 (Etapa 1 ABO + Etapa 2 Anti-D / Rh, retry so da Etapa 2, tempos por cidade e ATP):
//   node tests/typing-phase.mjs
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
            width: 80, height: 36, displayWidth: 64, displayHeight: 64
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
}
[
    'setOrigin', 'setStrokeStyle', 'setScale', 'setFillStyle', 'setDisplaySize',
    'clear', 'fillStyle', 'fillRect', 'lineStyle', 'strokeRect', 'setCrop'
].forEach((name) => {
    DisplayObject.prototype[name] = function () { return this; };
});

const { MINIGAME_ASSETS, RH_RESULT_FRAMES } = await import('../src/scenes/minigameAssets.js');
const {
    EXPECTED_TYPING_SECONDS_BY_CITY,
    getExpectedTypingSecondsForCity
} = await import('../src/scenes/cityOccurrenceConfig.js');
const {
    RH_DIAGNOSIS_OPTIONS,
    RH_NEUTRAL_ERROR_HINT,
    aboAgglutinates,
    rhAgglutinates,
    getRhFailureExplanation,
    formatConfirmedBloodType
} = await import('../src/scenes/typingLogic.js');
const { AttendanceState } = await import('../src/scenes/AttendanceState.js');
const { TypingPhase } = await import('../src/scenes/TypingPhase.js');
const { getDiscoveredType } = await import('../src/scenes/discoveredTypes.js');

// 1. Assets Anti-D e Rh registrados em minigameAssets.js.
assert.equal(MINIGAME_ASSETS['bancada-antid-soro'], 'assets/Minigame/Cenario/SalaAnalise/AntiDSozinho.png');
assert.equal(MINIGAME_ASSETS['bancada-antid-sangue'], 'assets/Minigame/Cenario/SalaAnalise/AntiDcomSangue.png');
assert.equal(MINIGAME_ASSETS['bancada-antid-positivo'], 'assets/Minigame/Cenario/SalaAnalise/AntiDAglutinado.png');
assert.equal(MINIGAME_ASSETS['bancada-antid-negativo'], 'assets/Minigame/Cenario/SalaAnalise/AntiDsemAglutinar.png');
assert.equal(MINIGAME_ASSETS['frasco-anti-d'], 'assets/Minigame/FrascoAntigenos/FrascoAntigenoD.png');
assert.equal(MINIGAME_ASSETS['anticorpo-anti-d'], 'assets/Minigame/Anticorpos/AntiD.png');
assert.equal(MINIGAME_ASSETS['hemacia-rh-pos'], 'assets/Minigame/Hemacias/HemaciaRhPositivo.png');
assert.equal(MINIGAME_ASSETS['hemacia-rh-neg'], 'assets/Minigame/Hemacias/HemaciaRhNegativo.png');
assert.deepEqual(RH_RESULT_FRAMES, { '+': 'bancada-antid-positivo', '-': 'bancada-antid-negativo' });

// 2. Logica pura de tipagem ABO e Rh.
assert.equal(aboAgglutinates('A', 0), true);
assert.equal(aboAgglutinates('A', 1), false);
assert.equal(aboAgglutinates('B', 0), false);
assert.equal(aboAgglutinates('B', 1), true);
assert.equal(aboAgglutinates('AB', 0), true);
assert.equal(aboAgglutinates('AB', 1), true);
assert.equal(aboAgglutinates('O', 0), false);
assert.equal(aboAgglutinates('O', 1), false);
assert.equal(rhAgglutinates('+'), true);
assert.equal(rhAgglutinates('-'), false);
assert.deepEqual(RH_DIAGNOSIS_OPTIONS.map((o) => o.label), ['Rh+', 'Rh−']);
assert.ok(!/Rh\+|Rh−|Rh-/.test(RH_NEUTRAL_ERROR_HINT), 'dica neutra nao entrega a resposta');
assert.ok(getRhFailureExplanation('+').includes('Rh+'));
assert.ok(getRhFailureExplanation('-').includes('Rh−'));
assert.equal(formatConfirmedBloodType('O', '-', true), 'O-');
assert.equal(formatConfirmedBloodType('O', '+', false), 'O');

// 3. Tempo esperado do bonus rapido por cidade (120s Cidade 1; 150s Cidades 2 e 3; 60s sem tipagem).
assert.deepEqual(EXPECTED_TYPING_SECONDS_BY_CITY, { 1: 120, 2: 150, 3: 150 });
assert.equal(getExpectedTypingSecondsForCity(1), 120);
assert.equal(getExpectedTypingSecondsForCity(2), 150);
assert.equal(getExpectedTypingSecondsForCity(3), 150);

const runAtp = (characterId, seconds, { typeKnown = false, errors = 0 } = {}) => {
    const st = new AttendanceState({ characterId, typeKnown });
    st.advance();
    if (!typeKnown) st.advance();
    for (let i = 0; i < errors; i++) {
        st.registerError();
        if (st.isFailed) st.retry();
    }
    st.update(seconds * 1000);
    return st.complete();
};
assert.deepEqual(runAtp('joaquim', 120), { atp: 120, errors: 0, withinTime: true });
assert.deepEqual(runAtp('joaquim', 120.1), { atp: 100, errors: 0, withinTime: false });
assert.deepEqual(runAtp('bruno', 150), { atp: 170, errors: 0, withinTime: true });
assert.deepEqual(runAtp('bruno', 150.1), { atp: 150, errors: 0, withinTime: false });
assert.deepEqual(runAtp('caue', 150), { atp: 220, errors: 0, withinTime: true });
assert.deepEqual(runAtp('caue', 150.1), { atp: 200, errors: 0, withinTime: false });
assert.equal(runAtp('bruno', 60, { typeKnown: true }).withinTime, true);
assert.equal(runAtp('bruno', 60.1, { typeKnown: true }).withinTime, false);

// Helper para simular cena do Phaser no TypingPhase.
function createMockScene() {
    const pendingTimers = [];
    const makeObj = (...args) => new DisplayObject(...args);
    const scene = {
        pendingTimers,
        flushTimers() {
            while (pendingTimers.length > 0) {
                const t = pendingTimers.shift();
                if (!t.removed && !t.paused) t.cb();
            }
        },
        add: {
            image: makeObj,
            rectangle: (x, y, w, h) => Object.assign(makeObj(x, y), { width: w, height: h }),
            text: (x, y, text) => makeObj(x, y, undefined, text),
            graphics: makeObj
        },
        textures: {
            exists: () => true,
            get: () => ({ setFilter() {}, getSourceImage: () => ({ width: 216, height: 86 }) }),
            createCanvas: () => ({
                getContext: () => ({ imageSmoothingEnabled: false, drawImage() {}, fillRect() {} }),
                refresh() {},
                setFilter() {},
                getSourceImage: () => ({ width: 216, height: 86 })
            })
        },
        input: {
            activePointer: { isDown: false, x: 0, y: 0 },
            setDraggable() {},
            keyboard: { addKey: () => new EventEmitter() }
        },
        time: {
            delayedCall: (_ms, cb) => {
                const timer = { cb, paused: false, removed: false, remove() { this.removed = true; } };
                pendingTimers.push(timer);
                return timer;
            }
        },
        sound: { play: () => true, get: () => null },
        returnToMap() {}
    };
    return scene;
}

// 4. Cidade 1 (Seu Joaquim): so Etapa 1 ABO, sem Etapa 2.
{
    storage.clear();
    const scene = createMockScene();
    const state = new AttendanceState({ characterId: 'joaquim', typeKnown: false });
    state.advance(); // TIPAGEM
    let completedWith = null;
    const tp = new TypingPhase(scene, state, {
        characterId: 'joaquim',
        cityIndex: 0,
        onComplete: (t) => { completedWith = t; }
    });
    assert.equal(tp.rhEnabled, false);
    assert.equal(tp.stage, 'ABO');
    tp.handleDiagnosis('O');
    assert.equal(getDiscoveredType('joaquim'), 'O');
    assert.equal(state.phase, 'TRANSFUSAO');
    assert.equal(tp.hintText.text, 'Tipo O confirmado');
    scene.flushTimers();
    assert.equal(completedWith, 'O');
}

// 5. Cidade 2 (Bruno O-): Etapa 1 ABO -> Etapa 2 Anti-D -> erro neutro -> falha e retry SO da Etapa 2 -> acerto.
{
    storage.clear();
    const scene = createMockScene();
    const state = new AttendanceState({ characterId: 'bruno', typeKnown: false });
    state.advance(); // TIPAGEM
    let completedWith = null;
    const tp = new TypingPhase(scene, state, {
        characterId: 'bruno',
        cityIndex: 1,
        onComplete: (t) => { completedWith = t; }
    });
    assert.equal(tp.rhEnabled, true);
    assert.equal(tp.patientType, 'O');
    assert.equal(tp.patientRh, '-');

    // Acerta Etapa 1 (ABO): NAO salva tipo ainda, NAO sai de TIPAGEM.
    tp.handleDiagnosis('O');
    assert.equal(getDiscoveredType('bruno'), null, 'nao salva tipo antes da Etapa 2');
    assert.equal(state.phase, 'TIPAGEM', 'continua na fase TIPAGEM ate concluir a Etapa 2');

    // Passa o timer de confirmacao: abre Etapa 2 (Rh).
    scene.flushTimers();
    assert.equal(tp.stage, 'RH');
    assert.equal(tp.well2Overlay.visible, true, 'poco 2 escurecido');
    assert.equal(tp.items.antiD.sprite.visible, true, 'frasco Anti-D visivel');
    assert.equal(tp.items.antiA.sprite.visible, false, 'frasco Anti-A escondido');
    assert.deepEqual(tp.rhDiagnosisButtons.map((b) => b.label), ['Rh+', 'Rh−']);

    // Soltar Anti-D no poco 2: bloqueado sem perder coracao.
    tp.items.antiD.sprite.setPosition(350, 240);
    tp.dropSerum(tp.items.antiD);
    assert.equal(state.hearts, 3);
    assert.equal(tp.wells[0].state, 'EMPTY');

    // Soltar sangue no poco 1 antes do Anti-D: bloqueado sem perder coracao.
    tp.items.tube.sprite.setPosition(150, 240);
    tp.dropTube(tp.items.tube);
    assert.equal(state.hearts, 3);
    assert.equal(tp.wells[0].state, 'EMPTY');

    // Fluxo correto no poco 1: Anti-D -> sangue -> mistura.
    tp.items.antiD.sprite.setPosition(150, 240);
    tp.dropSerum(tp.items.antiD);
    assert.equal(tp.wells[0].state, 'SERUM');
    assert.equal(tp.wells[0].image.texture, 'bancada-antid-soro');

    tp.items.tube.sprite.setPosition(150, 240);
    tp.dropTube(tp.items.tube);
    assert.equal(tp.wells[0].state, 'BLOOD');
    assert.equal(tp.wells[0].image.texture, 'bancada-antid-sangue');

    // Mistura no poco 1.
    scene.input.activePointer = { isDown: true, x: 100, y: 200 };
    tp.update();
    for (let i = 0; i < 10; i++) {
        scene.input.activePointer = { isDown: true, x: i % 2 === 0 ? 180 : 100, y: 200 };
        tp.update();
    }
    assert.equal(tp.wells[0].state, 'MIXED');
    assert.equal(tp.wells[0].image.texture, 'bancada-antid-negativo');
    assert.equal(tp.rhDiagnosisButtons[0].button.enabled, true);

    // 1o erro (escolher Rh+ para Bruno O-): perde 1 coracao e mostra dica neutra.
    tp.handleRhDiagnosis('+');
    assert.equal(state.hearts, 2);
    assert.equal(state.errors, 1);
    assert.equal(tp.hintText.text, RH_NEUTRAL_ERROR_HINT);

    // 2o e 3o erros -> zera coracoes e mostra explicacao da reacao.
    tp.handleRhDiagnosis('+');
    tp.handleRhDiagnosis('+');
    assert.equal(state.hearts, 0);
    assert.equal(state.isFailed, true);
    assert.equal(tp.hintText.text, getRhFailureExplanation('-'));
    assert.equal(tp.retryButton.visible, true);

    // Retry refaz SO a Etapa 2 (sem repetir ABO) e mantem erros acumulados.
    tp.retry();
    assert.equal(tp.stage, 'RH', 'retry mantem na Etapa 2 sem voltar ao ABO');
    assert.equal(state.hearts, 3);
    assert.equal(state.errors, 3);
    assert.equal(tp.wells[0].state, 'EMPTY');

    // Conclui Etapa 2 escolhendo Rh-: salva tipo completo 'O-' e avanca para TRANSFUSAO.
    tp.wells[0].state = 'MIXED';
    tp.handleRhDiagnosis('-');
    assert.equal(getDiscoveredType('bruno'), 'O-');
    assert.equal(state.phase, 'TRANSFUSAO');
    assert.equal(tp.hintText.text, 'Tipo O- confirmado');
    assert.equal(tp.cellSprite.texture, 'hemacia-rh-neg');
    scene.flushTimers();
    assert.equal(completedWith, 'O-');
}

// 6. Cidade 2 (Beatriz AB+): resultado positivo usa AntiDAglutinado e HemaciaRhPositivo.
{
    storage.clear();
    const scene = createMockScene();
    const state = new AttendanceState({ characterId: 'beatriz', typeKnown: false });
    state.advance();
    const tp = new TypingPhase(scene, state, { characterId: 'beatriz', cityIndex: 1 });
    tp.handleDiagnosis('AB');
    scene.flushTimers();
    assert.equal(tp.stage, 'RH');
    tp.wells[0].state = 'MIXED';
    tp.updateWellImage(tp.wells[0]);
    assert.equal(tp.wells[0].image.texture, 'bancada-antid-positivo');
    tp.handleRhDiagnosis('+');
    assert.equal(getDiscoveredType('beatriz'), 'AB+');
    assert.equal(tp.hintText.text, 'Tipo AB+ confirmado');
    assert.equal(tp.cellSprite.texture, 'hemacia-rh-pos');
}

console.log('OK: Etapa 2 (Anti-D / Rh), retry isolado da Etapa 2, tempo por cidade e ATP.');
