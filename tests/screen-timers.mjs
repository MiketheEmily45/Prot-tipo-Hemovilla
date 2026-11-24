// Teste unitario: timers dos personagens da cidade atual continuam rodando na Loja,
// Configuracoes (minitela e cena isolada), Quiz e Tela de troca de cidades.
//   node tests/screen-timers.mjs
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
    getBounds() { return new Phaser.Geom.Rectangle(this.x - 16, this.y - 16, 32, 32); }
    getWrappedText(text) { return String(text).match(/.{1,52}(\s|$)/g) ?? ['']; }
    destroy() { this.destroyed = true; }
}
[
    'setOrigin', 'setStrokeStyle', 'setScale', 'setFillStyle', 'setScrollFactor',
    'setAlpha', 'setDisplaySize', 'setCollideWorldBounds', 'setImmovable', 'setMask',
    'createGeometryMask', 'play', 'clear', 'fillStyle', 'fillRect', 'fillTriangle',
    'lineStyle', 'strokeRect', 'strokeCircle', 'setAngle', 'setCrop', 'setFontSize'
].forEach((name) => {
    DisplayObject.prototype[name] = function () { return this; };
});

function createMapScene() {
    const childrenList = [];
    const makeObj = (...args) => {
        const o = new DisplayObject(...args);
        childrenList.push(o);
        return o;
    };
    const keyboard = Object.assign(new EventEmitter(), { createCursorKeys: () => ({}), addKey: () => new EventEmitter() });
    const scene = new GameMap();
    Object.assign(scene, {
        children: { list: childrenList },
        scene: { start() {} },
        load: { image() {}, audio() {} },
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
        add: {
            image: makeObj, sprite: makeObj, tileSprite: makeObj,
            rectangle: (x, y, w, h) => Object.assign(makeObj(x, y), { width: w, height: h }),
            text: (x, y, text) => makeObj(x, y, undefined, text),
            graphics: makeObj, line: makeObj
        },
        make: { graphics: makeObj },
        physics: {
            add: { sprite: makeObj },
            world: { isPaused: false, setBounds() {}, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } }
        },
        scale: { resize() {} },
        cameras: { main: { setViewport() {}, width: 512, height: 608 } },
        input: Object.assign(new EventEmitter(), { keyboard, activePointer: { isDown: false, x: 0, y: 0 }, setDraggable() {} }),
        events: new EventEmitter(),
        tweens: { add: () => ({ stop() {} }), pauseAll() {}, resumeAll() {} },
        time: { now: 1000, delayedCall: () => ({ remove() {} }) },
        anims: { exists: () => false, create() {} },
        sound: { sounds: [], play: () => true, get: () => null, add: () => ({ play() {}, stop() {}, setVolume() {} }), stopByKey() {} }
    });
    return scene;
}

const { Shop } = await import('../src/scenes/Shop.js');
const { CitySelect } = await import('../src/scenes/CitySelect.js');
const { ConfigMenu } = await import('../src/scenes/ConfigMenu.js');
const { GameMap } = await import('../src/scenes/GameMap.js');
const {
    getOccurrence,
    resetOccurrenceState,
    setOccurrenceClocksFrozen
} = await import('../src/scenes/occurrenceState.js');
const { skipTutorial } = await import('../src/scenes/settingsStore.js');

skipTutorial();

// 1. Loja (Shop): descontando tempo da cidade atual sem resetar e sem afetar outras cidades.
resetOccurrenceState();
setOccurrenceClocksFrozen(false);
const shop = new Shop();
shop.init({ fromScene: 'GameMap', returnData: { targetCityIndex: 0 } });
shop.update(0, 15000);
assert.equal(getOccurrence('joaquim').remainingMs, 45000);
assert.equal(getOccurrence('marlene').remainingMs, 105000);
assert.equal(getOccurrence('bruno').remainingMs, 60000, 'outras cidades permanecem congeladas na Loja');

// Loja aberta a partir do menu inicial nao descontara timers.
const shopFromStart = new Shop();
shopFromStart.init({ fromScene: 'Start' });
shopFromStart.update(0, 20000);
assert.equal(getOccurrence('joaquim').remainingMs, 45000);

// Respeita congelamento do tutorial na Loja.
setOccurrenceClocksFrozen(true);
shop.update(0, 20000);
assert.equal(getOccurrence('joaquim').remainingMs, 45000);
setOccurrenceClocksFrozen(false);

// 2. Tela de troca de cidades (CitySelect): roda timers da cidade atual (currentCityIndex), nao da cidade em preview (selectedIndex).
const citySelect = new CitySelect();
citySelect.init({ currentCityIndex: 0 });
citySelect.selectedIndex = 1; // navegou no carrossel para Cidade 2
citySelect.update(0, 10000);
assert.equal(getOccurrence('joaquim').remainingMs, 35000);
assert.equal(getOccurrence('bruno').remainingMs, 60000, 'preview da Cidade 2 nao roda timers da Cidade 2');

// 3. Configuracoes como cena isolada (vinda do GameMap).
const cfgScene = new ConfigMenu();
cfgScene.init({ fromScene: 'GameMap', returnData: { targetCityIndex: 0 } });
cfgScene.update(0, 5000);
assert.equal(getOccurrence('joaquim').remainingMs, 30000);

// 4. Configuracoes como minitela no PauseMenu do GameMap:
//    - Pause puro continua congelando timers;
//    - Ao abrir Configuracoes sobre o Pause, timers da cidade atual voltam a rodar e aplicam alerta silenciosamente.
const map = createMapScene();
map.init({ targetCityIndex: 0 });
map.preload();
map.create();

map.pauseMenu.open();
map.update(2000, 10000);
assert.equal(getOccurrence('joaquim').remainingMs, 30000, 'pause puro mantem timers congelados');

map.pauseMenu.handleButtonAction('settings');
assert.equal(Boolean(map.pauseMenu.configOverlay?.isOpen), true);
map.update(3000, 35000);
assert.equal(getOccurrence('joaquim').remainingMs, 0, 'timer roda durante Configuracoes no mapa');
assert.equal(getOccurrence('joaquim').hasAlert, true, 'alerta do Joaquim dispara durante Configuracoes');
assert.equal(map.alertedIconKeys.has('joaquim'), true, 'icone do Joaquim fica marcado ao disparar durante Configuracoes');
assert.equal(getOccurrence('bruno').remainingMs, 60000, 'outra cidade permanece congelada');

// Fecha Configuracoes de volta ao Pause -> volta a congelar no Pause puro.
map.input.keyboard.emit('keydown-ESC', { repeat: false });
assert.equal(map.pauseMenu.configOverlay, null);
const marleneBeforePause = getOccurrence('marlene').remainingMs;
map.update(4000, 10000);
assert.equal(getOccurrence('marlene').remainingMs, marleneBeforePause, 'ao voltar ao Pause puro, timer congela');

// Retoma o jogo e abre o Quiz: timers continuam rodando normalmente com o Quiz aberto.
map.pauseMenu.close();
assert.equal(map.quizPanel.open(0), true);
assert.equal(map.quizPanel.isOpen, true);
const marleneBeforeQuiz = getOccurrence('marlene').remainingMs;
map.update(5000, 12000);
assert.equal(getOccurrence('marlene').remainingMs, marleneBeforeQuiz - 12000, 'timer continua rodando com o Quiz aberto');
map.quizPanel.close();
map.events.emit('shutdown');

console.log('OK: timers da cidade atual continuam rodando na Loja, Configuracoes, Quiz e Tela de troca de cidades.');
