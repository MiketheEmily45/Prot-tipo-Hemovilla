// Teste automatizado dos botoes ZERAR e TUTORIAL da tela de configuracoes
// (tanto aberta pelo menu inicial quanto pelo menu de pause):
//   node tests/config-reset-tutorial.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const storage = new Map();
globalThis.window = {
    location: { search: '' }, // Modo normal (sem ?debug)
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
    Math: { Clamp: (v, min, max) => Math.max(min, Math.min(max, v)) }
};

class DisplayObject extends EventEmitter {
    constructor(x = 0, y = 0, texture, extra) {
        super();
        Object.assign(this, {
            x, y, texture, visible: true, depth: 0,
            height: 54, width: 100, displayWidth: 40, displayHeight: 40
        });
        if (typeof extra === 'string') this.text = extra;
        this.body = { enable: true, blocked: {}, velocity: { x: 0, y: 0 } };
        this.anims = { isPlaying: false, isPaused: false, pause() {}, resume() {}, stop() {} };
    }
    setInteractive() { this.input = { enabled: true }; return this; }
    setVisible(v) { this.visible = v; return this; }
    setTexture(v) { this.texture = v; return this; }
    setText(v) { this.text = v; return this; }
    setDepth(v) { this.depth = v; return this; }
    setTint(v) { this.tint = v; return this; }
    clearTint() { this.tint = null; return this; }
    setPosition(x, y) { Object.assign(this, { x, y }); return this; }
    setVelocity(x, y) { this.body.velocity = { x, y }; return this; }
    setVelocityX(x) { this.body.velocity.x = x; return this; }
    getWrappedText(text) { return String(text).match(/.{1,52}(\s|$)/g) ?? ['']; }
    destroy() { this.destroyed = true; }
}
[
    'setOrigin', 'setStrokeStyle', 'setScale', 'setFillStyle', 'setScrollFactor',
    'setAlpha', 'setDisplaySize', 'setCollideWorldBounds', 'setImmovable', 'setMask',
    'createGeometryMask', 'play', 'clear', 'fillStyle', 'fillRect', 'fillTriangle',
    'lineStyle', 'strokeRect'
].forEach((name) => {
    DisplayObject.prototype[name] = function () { return this; };
});

const { ConfigMenu } = await import('../src/scenes/ConfigMenu.js');
const { GameMap } = await import('../src/scenes/GameMap.js');
const { getATP, addATP, isCharacterAttended, markCharacterAttended } = await import('../src/scenes/atpStore.js');
const { getDiscoveredType, setDiscoveredType } = await import('../src/scenes/discoveredTypes.js');
const { isCityUnlocked, isCityPurchased, purchaseCity } = await import('../src/scenes/cityUnlocks.js');
const { getOccurrence, triggerOccurrence, advanceActiveCityTimers, areOccurrenceClocksFrozen } = await import('../src/scenes/occurrenceState.js');
const { getSettings, saveSettings, skipTutorial } = await import('../src/scenes/settingsStore.js');

function attachMockScene(scene, { width = 512, height = 512 } = {}) {
    const childrenList = [];
    const makeObj = (...args) => {
        const obj = new DisplayObject(...args);
        childrenList.push(obj);
        return obj;
    };
    const keyboard = Object.assign(new EventEmitter(), {
        createCursorKeys: () => ({}),
        addKey: () => new EventEmitter()
    });
    const transitions = [];
    const game = { events: new EventEmitter() };

    Object.assign(scene, {
        game,
        transitions,
        children: { list: childrenList },
        scene: {
            start: (target, data) => { transitions.push({ target, data }); }
        },
        load: { image() {}, audio() {} },
        textures: {
            exists: (key) => !String(key).endsWith('-trimmed'),
            get: () => ({
                setFilter() {},
                getSourceImage: () => ({ width: 110, height: 35 })
            }),
            createCanvas: () => ({
                getContext: () => ({
                    imageSmoothingEnabled: false,
                    drawImage() {},
                    fillRect() {}
                }),
                refresh() {},
                setFilter() {},
                getSourceImage: () => ({ width: 216, height: 86 })
            })
        },
        add: {
            image: makeObj,
            sprite: makeObj,
            tileSprite: makeObj,
            rectangle: (x, y, w, h) => Object.assign(makeObj(x, y), { width: w, height: h }),
            text: (x, y, text) => makeObj(x, y, undefined, text),
            graphics: makeObj
        },
        make: { graphics: makeObj },
        physics: {
            add: { sprite: makeObj },
            world: { isPaused: false, setBounds() {}, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } }
        },
        scale: { resize() {} },
        cameras: { main: { setViewport() {}, width, height } },
        input: Object.assign(new EventEmitter(), {
            keyboard,
            activePointer: { isDown: false, x: 0, y: 0 },
            setDraggable() {}
        }),
        events: new EventEmitter(),
        tweens: { add: () => ({ stop() {} }), pauseAll() {}, resumeAll() {} },
        time: { now: 1000, delayedCall: () => ({ remove() {} }) },
        anims: { exists: () => false, create() {} },
        sound: {
            sounds: [],
            play: () => true,
            get: () => null,
            add: () => ({ play() {}, stop() {}, setVolume() {}, isPlaying: false }),
            stopByKey: () => {}
        }
    });
    return scene;
}

function seedProgress() {
    storage.clear();
    addATP(500);
    markCharacterAttended('joaquim');
    markCharacterAttended('marlene');
    markCharacterAttended('aparecida');
    setDiscoveredType('joaquim', 'O+');
    setDiscoveredType('marlene', 'A+');
    purchaseCity(2);
    saveSettings({ musicVolume: 0.25, musicMuted: false, sfxVolume: 0.4, sfxMuted: true });
    skipTutorial();
    triggerOccurrence('joaquim');
    advanceActiveCityTimers(0, 30000);
}

function clickButton(btn) {
    btn.emit('pointerdown', null, 0, 0, {});
    btn.emit('pointerup', null, 0, 0, {});
}

// 1. ZERAR a partir do Menu Inicial (ConfigMenu como cena)
seedProgress();
const configScene = attachMockScene(new ConfigMenu(), { width: 512, height: 512 });
configScene.init({ fromScene: 'Start' });
configScene.preload();
configScene.create();

clickButton(configScene.resetButton);
assert.equal(configScene.confirmPopup.isOpen, true, 'ConfirmPopup deve abrir ao clicar em ZERAR');

const simBtn1 = configScene.confirmPopup.elements.find((el) => el.texture === 'config-reset-yes');
assert.ok(simBtn1, 'Botao SIM deve existir no ConfirmPopup');
clickButton(simBtn1);

assert.equal(getATP(), 0, 'ATP zerado');
assert.equal(isCharacterAttended('joaquim'), false, 'atendidos zerados');
assert.equal(getDiscoveredType('joaquim'), null, 'tipos revelados zerados');
assert.equal(isCityUnlocked(1), false, 'Cidade 2 volta a ficar bloqueada');
assert.equal(isCityPurchased(2), false, 'Cidade 3 comprada zerada');
assert.equal(getOccurrence('joaquim').hasAlert, false, 'ocorrencia pendente zerada');
assert.equal(getOccurrence('marlene').remainingMs, 120000, 'relogios reiniciados');
assert.equal(getSettings().musicVolume, 0.25, 'volume de musica preservado');
assert.equal(getSettings().sfxVolume, 0.4, 'volume de efeitos preservado');
assert.equal(getSettings().sfxMuted, true, 'mute de efeitos preservado');
assert.equal(getSettings().tutorialHintsEnabled, true, 'tutorial reativado apos zerar');
assert.deepEqual(configScene.transitions.at(-1), { target: 'Start', data: undefined });

// 2. ZERAR a partir do Menu de Pause (ConfigMenu como overlay sobre GameMap)
seedProgress();
const mapForReset = attachMockScene(new GameMap(), { width: 512, height: 608 });
mapForReset.init({});
mapForReset.preload();
mapForReset.create();
mapForReset.pauseMenu.open();
mapForReset.pauseMenu.handleButtonAction('settings');
assert.equal(Boolean(mapForReset.pauseMenu.configOverlay?.isOpen), true);

clickButton(mapForReset.pauseMenu.configOverlay.resetButton);
assert.equal(mapForReset.pauseMenu.configOverlay.confirmPopup.isOpen, true);
const simBtn2 = mapForReset.pauseMenu.configOverlay.confirmPopup.elements.find((el) => el.texture === 'config-reset-yes');
clickButton(simBtn2);

assert.equal(getATP(), 0, 'ATP zerado pelo pause');
assert.equal(isCharacterAttended('joaquim'), false, 'atendidos zerados pelo pause');
assert.equal(getDiscoveredType('marlene'), null, 'tipos zerados pelo pause');
assert.equal(isCityPurchased(2), false, 'cidade comprada zerada pelo pause');
assert.equal(getOccurrence('joaquim').hasAlert, false, 'ocorrencia zerada pelo pause');
assert.equal(getSettings().musicVolume, 0.25, 'som preservado pelo pause');
assert.deepEqual(mapForReset.transitions.at(-1), { target: 'Start', data: undefined });

// 3. TUTORIAL pelo Pause quando Seu Joaquim JA foi atendido: roda A1-A3, NAO forca nova ocorrencia
seedProgress();
const mapAttended = attachMockScene(new GameMap(), { width: 512, height: 608 });
mapAttended.init({});
mapAttended.preload();
mapAttended.create();
// Limpa alerta do Joaquim para verificar que o tutorial nao forca outro
mapAttended.clickableCharacterManager.getAlertManager().removeAlert(
    mapAttended.clickableCharacters.find((c) => c.iconButtonKey === 'joaquim')
);
const occJoaquim = getOccurrence('joaquim');
occJoaquim.hasAlert = false;
occJoaquim.remainingMs = 60000;

mapAttended.pauseMenu.open();
mapAttended.pauseMenu.handleButtonAction('settings');
clickButton(mapAttended.pauseMenu.configOverlay.tutorialButton);
assert.equal(getSettings().tutorialHintsEnabled, true);
assert.equal(getSettings().tutorialProgress.intro, false);

mapAttended.pauseMenu.configOverlay.closeOverlay(true);
mapAttended.pauseMenu.close();
assert.equal(mapAttended.tutorialManager.caption.isOpen, true, 'legendas A1-A3 abrem ao voltar ao mapa');
assert.equal(areOccurrenceClocksFrozen(), false, 'relogios nao congelam se Joaquim ja foi atendido');
mapAttended.tutorialManager.caption.advance();
mapAttended.tutorialManager.caption.advance();
mapAttended.tutorialManager.caption.advance();
assert.equal(getOccurrence('joaquim').hasAlert, false, 'nao forca nova ocorrencia se Joaquim ja foi atendido');

// 4. TUTORIAL pelo Pause quando Seu Joaquim NAO foi atendido: roda A1-A3 e FORCA ocorrencia do Joaquim
storage.clear();
skipTutorial();
const mapUnattended = attachMockScene(new GameMap(), { width: 512, height: 608 });
mapUnattended.init({});
mapUnattended.preload();
mapUnattended.create();

mapUnattended.pauseMenu.open();
mapUnattended.pauseMenu.handleButtonAction('settings');
clickButton(mapUnattended.pauseMenu.configOverlay.tutorialButton);
mapUnattended.pauseMenu.configOverlay.closeOverlay(true);
mapUnattended.pauseMenu.close();

assert.equal(mapUnattended.tutorialManager.caption.isOpen, true, 'legendas A1-A3 abrem ao voltar ao mapa');
assert.equal(areOccurrenceClocksFrozen(), true, 'relogios congelam se Joaquim ainda nao foi atendido');
mapUnattended.tutorialManager.caption.advance();
mapUnattended.tutorialManager.caption.advance();
mapUnattended.tutorialManager.caption.advance();
assert.equal(getOccurrence('joaquim').hasAlert, true, 'forca ocorrencia do Joaquim quando ainda nao foi atendido');

console.log('OK: ZERAR e TUTORIAL nas configuracoes (menu inicial e pause), limpeza completa de progresso e preservacao de som.');
