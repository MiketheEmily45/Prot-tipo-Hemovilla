// Testes da Etapa 4: avisos de liberacao da Cidade 2 e Quiz por cidade, legenda do guia e dicas no minigame.
//   node tests/notices-and-hints.mjs
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
            width: 100, height: 54, displayWidth: 40, displayHeight: 40
        });
        if (typeof extra === 'string') this.text = extra;
        this.body = { enable: true, blocked: {}, velocity: { x: 0, y: 0 } };
        this.anims = { pause() {}, resume() {}, stop() {} };
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
    setVelocity(x, y) { this.body.velocity = { x, y }; return this; }
    setVelocityX(x) { this.body.velocity.x = x; return this; }
    getWrappedText(text) { return String(text).match(/.{1,52}(\s|$)/g) ?? ['']; }
    destroy() { this.destroyed = true; }
}
[
    'setOrigin', 'setStrokeStyle', 'setScale', 'setFillStyle', 'setScrollFactor', 'setDisplaySize',
    'setCollideWorldBounds', 'setImmovable', 'setMask', 'createGeometryMask', 'play', 'clear',
    'fillStyle', 'fillRect', 'fillTriangle', 'lineStyle', 'strokeRect', 'setCrop'
].forEach((name) => {
    DisplayObject.prototype[name] = function () { return this; };
});

const makeObj = (...args) => new DisplayObject(...args);

const { GameMap } = await import('../src/scenes/GameMap.js');
const { markCharacterAttended } = await import('../src/scenes/atpStore.js');
const { skipTutorial, reactivateTutorial } = await import('../src/scenes/settingsStore.js');
const { purchaseCity } = await import('../src/scenes/cityUnlocks.js');
const { clearAllProgress } = await import('../src/scenes/debugTools.js');
const {
    CITY_2_UNLOCKED_NOTICE_TEXT,
    QUIZ_NEW_TYPES_NOTICE_TEXT,
    hasSeenCity2UnlockedNotice,
    hasSeenQuizCityNotice,
    shouldShowCity2UnlockedNotice,
    shouldShowQuizCityNotice,
    resetMapNoticesMemory
} = await import('../src/scenes/mapNotices.js');
const { TUTORIAL_STEPS } = await import('../src/scenes/tutorialSteps.js');
const { MinigameHintHelper, MINIGAME_HINTS, MINIGAME_HINT_IDLE_MS } = await import('../src/scenes/MinigameHintHelper.js');
const { AttendanceState } = await import('../src/scenes/AttendanceState.js');
const { TypingPhase } = await import('../src/scenes/TypingPhase.js');

function openMap(initData = {}) {
    const scene = new GameMap();
    const keyboard = Object.assign(new EventEmitter(), { createCursorKeys() {} });
    Object.assign(scene, {
        scene: { start() {} },
        load: { image() {}, audio() {} },
        add: {
            image: makeObj, sprite: makeObj, tileSprite: makeObj,
            rectangle: (x, y, width, height) => Object.assign(makeObj(x, y), { width, height }),
            text: (x, y, text) => makeObj(x, y, undefined, text),
            graphics: makeObj
        },
        make: { graphics: makeObj },
        physics: { add: { sprite: makeObj }, world: { setBounds() {} } },
        scale: { resize() {} },
        cameras: { main: { setViewport() {}, width: 512, height: 608 } },
        input: Object.assign(new EventEmitter(), { keyboard }),
        events: new EventEmitter(),
        tweens: { add: () => ({ stop() {} }) },
        time: { now: 100, delayedCall: () => ({ remove() {} }) },
        anims: { exists: () => false, create() {} },
        sound: { play() {}, get: () => null, add: () => ({ play() {}, stop() {}, setVolume() {} }) }
    });
    scene.init(initData);
    scene.preload();
    scene.create();
    return scene;
}

// ===== 1. Item 7: aviso ao liberar a Cidade 2 (3 personagens da Cidade 1) =====
storage.clear();
clearAllProgress();
resetMapNoticesMemory();
skipTutorial();

markCharacterAttended('joaquim');
markCharacterAttended('marlene');
assert.equal(shouldShowCity2UnlockedNotice(), false);

let map = openMap();
assert.equal(map.noticeCaption.isOpen, false, 'nao avisa antes do 3o atendimento');
map.events.emit('shutdown');

markCharacterAttended('aparecida');
assert.equal(shouldShowCity2UnlockedNotice(), true);
map = openMap();
assert.equal(map.noticeCaption.isOpen, true, 'avisa ao voltar ao mapa apos o 3o atendimento');
assert.equal(map.noticeCaption.showSkipButton, false, 'aviso unico nao exibe botao Pular tutorial');
assert.equal(map.noticeCaption.pages[0].text, CITY_2_UNLOCKED_NOTICE_TEXT);
assert.equal(hasSeenCity2UnlockedNotice(), true);
map.noticeCaption.advance();
assert.equal(map.noticeCaption.isOpen, false);
map.events.emit('shutdown');

// Reabrir mapa nao repete o aviso da Cidade 2.
map = openMap();
assert.equal(map.noticeCaption.isOpen, false);
map.events.emit('shutdown');

// ===== 2. Item 8: aviso do Quiz na 1a entrada em Cidade 2 e Cidade 3 (persistido, limpo ao zerar) =====
assert.equal(shouldShowQuizCityNotice(0), false, 'Cidade 1 nao mostra aviso de novos tipos no quiz');
assert.equal(shouldShowQuizCityNotice(1), true);
assert.equal(shouldShowQuizCityNotice(2), true);

// Compra Cidade 3 para liberar acesso sem ?debug
purchaseCity(2);
map = openMap({ targetCityIndex: 0 });
assert.equal(map.noticeCaption.isOpen, false);

// Entra na Cidade 2 pela 1a vez
map.cityNavigation.goTo(1);
assert.equal(map.noticeCaption.isOpen, true);
assert.equal(map.noticeCaption.pages[0].text, QUIZ_NEW_TYPES_NOTICE_TEXT);
assert.equal(hasSeenQuizCityNotice(1), true);
map.noticeCaption.advance();
assert.equal(map.noticeCaption.isOpen, false);

// Volta para Cidade 1 e retorna a Cidade 2: nao repete
map.cityNavigation.goTo(0);
map.cityNavigation.goTo(1);
assert.equal(map.noticeCaption.isOpen, false);

// Entra na Cidade 3 pela 1a vez
map.cityNavigation.goTo(2);
assert.equal(map.noticeCaption.isOpen, true);
assert.equal(map.noticeCaption.pages[0].text, QUIZ_NEW_TYPES_NOTICE_TEXT);
assert.equal(hasSeenQuizCityNotice(2), true);
map.noticeCaption.advance();

// Reabrir direto na Cidade 3 nao repete
map.events.emit('shutdown');
map = openMap({ targetCityIndex: 2 });
assert.equal(map.noticeCaption.isOpen, false);
map.events.emit('shutdown');

// Zerar progresso limpa os avisos
clearAllProgress();
assert.equal(hasSeenCity2UnlockedNotice(), false);
assert.equal(hasSeenQuizCityNotice(1), false);
assert.equal(hasSeenQuizCityNotice(2), false);

// ===== 3. Item 9: guia em destaque na Fase 2 e mencionado na Fase 3 =====
assert.equal(TUTORIAL_STEPS.minigameFase2[0].id, 'C5');
assert.match(TUTORIAL_STEPS.minigameFase2[0].text, /guia/i);
assert.match(TUTORIAL_STEPS.minigameFase2[0].text, /canto superior direito/i);
assert.match(TUTORIAL_STEPS.minigameFase3[0].text, /guia/i);

// ===== 4. Item 10: dicas no minigame (1o atendimento imediato; depois apos 6s parado) =====
storage.clear();
reactivateTutorial();

const dummyScene = {
    add: {
        image: makeObj,
        rectangle: (x, y, w, h) => Object.assign(makeObj(x, y), { width: w, height: h }),
        circle: makeObj,
        graphics: makeObj,
        text: (x, y, text) => makeObj(x, y, undefined, text)
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
    time: { delayedCall: () => ({ remove() {} }) },
    sound: { play: () => true, get: () => null },
    returnToMap() {}
};

// 1o atendimento: mostra imediatamente quando nao suprimido
const helper = new MinigameHintHelper(dummyScene);
helper.update(16, { stepKey: 'MOVE_TO_CHAIR', suppressed: true });
assert.equal(helper.isVisible, false, 'suprimido enquanto legenda principal esta aberta');
helper.update(16, { stepKey: 'MOVE_TO_CHAIR', suppressed: false });
assert.equal(helper.isVisible, true, 'aparece imediatamente no 1o atendimento');
assert.equal(helper.text.text, MINIGAME_HINTS.MOVE_TO_CHAIR);

// Apos 1o atendimento concluido: so aparece apos 6s parado e some com acao
skipTutorial();
helper.notifyAction();
helper.update(2000, { stepKey: 'ABO_BLOOD', suppressed: false });
assert.equal(helper.isVisible, false, 'nao aparece antes de 6s parado');
helper.notifyAction(); // acao zera o contador
helper.update(4500, { stepKey: 'ABO_BLOOD', suppressed: false });
assert.equal(helper.isVisible, false, 'contador zerado apos acao');
helper.update(1500, { stepKey: 'ABO_BLOOD', suppressed: false });
assert.equal(helper.isVisible, true, `aparece apos ${MINIGAME_HINT_IDLE_MS}ms parado`);
assert.equal(helper.text.text, MINIGAME_HINTS.ABO_BLOOD);
helper.notifyAction();
assert.equal(helper.isVisible, false, 'acao oculta a dica');

// TypingPhase sub-etapas ABO e Rh
const state = new AttendanceState({ characterId: 'bruno', typeKnown: false });
state.advance();
const tp = new TypingPhase(dummyScene, state, { characterId: 'bruno', cityIndex: 1 });
assert.equal(tp.getCurrentHintStepKey(), 'ABO_BLOOD');
tp.wells[0].state = 'BLOOD';
tp.wells[1].state = 'BLOOD';
assert.equal(tp.getCurrentHintStepKey(), 'ABO_SERUM');
tp.wells[0].state = 'READY';
tp.wells[1].state = 'READY';
assert.equal(tp.getCurrentHintStepKey(), 'ABO_MIX');
tp.wells[0].state = 'MIXED';
tp.wells[1].state = 'MIXED';
assert.equal(tp.getCurrentHintStepKey(), 'ABO_DIAGNOSE');

tp.startRhStage();
assert.equal(tp.getCurrentHintStepKey(), 'RH_BLOOD');
tp.wells[0].state = 'BLOOD';
assert.equal(tp.getCurrentHintStepKey(), 'RH_SERUM');
tp.wells[0].state = 'READY';
assert.equal(tp.getCurrentHintStepKey(), 'RH_MIX');
tp.wells[0].state = 'MIXED';
assert.equal(tp.getCurrentHintStepKey(), 'RH_DIAGNOSE');
tp.destroy();

console.log('OK: avisos de Cidade 2 e Quiz, guia em destaque e dicas passo a passo no minigame.');
