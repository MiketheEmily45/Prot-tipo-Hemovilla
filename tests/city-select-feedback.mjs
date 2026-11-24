// Teste da mensagem temporaria "Cidade comprada!" na tela de selecao de cidades:
//   node tests/city-select-feedback.mjs
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
    Textures: { FilterMode: { NEAREST: 0 } }
};

class DisplayObject extends EventEmitter {
    constructor(x = 0, y = 0, texture, extra) {
        super();
        Object.assign(this, { x, y, texture, visible: true, depth: 0, width: 100, height: 24 });
        if (typeof extra === 'string') this.text = extra;
    }
    setInteractive() { this.input = { enabled: true }; return this; }
    setVisible(v) { this.visible = v; return this; }
    setText(v) { this.text = v; return this; }
    setOrigin() { return this; }
    setDepth(d) { this.depth = d; return this; }
    setScale() { return this; }
    setTint() { return this; }
    clearTint() { return this; }
    setFillStyle() { return this; }
    setStrokeStyle() { return this; }
    setPosition(x, y) { Object.assign(this, { x, y }); return this; }
    fillStyle() { return this; }
    fillRoundedRect() { return this; }
    strokeRoundedRect() { return this; }
    fillCircle() { return this; }
    fillRect() { return this; }
    fillTriangle() { return this; }
    clear() { return this; }
    lineStyle() { return this; }
    destroy() { this.destroyed = true; }
}

const makeObj = (...args) => new DisplayObject(...args);

const { CitySelect } = await import('../src/scenes/CitySelect.js');
const { addATP, markCharacterAttended } = await import('../src/scenes/atpStore.js');
const { CITY_3_PRICE, isCityPurchased } = await import('../src/scenes/cityUnlocks.js');

markCharacterAttended('joaquim');
markCharacterAttended('marlene');
markCharacterAttended('aparecida');
addATP(CITY_3_PRICE);

const timers = [];
let dialogConfig = null;
const scene = new CitySelect();
Object.assign(scene, {
    load: { image() {}, audio() {} },
    scale: { resize() {} },
    cameras: { main: { setViewport() {}, width: 512, height: 512 } },
    textures: { exists: () => false },
    add: {
        image: makeObj,
        rectangle: (x, y, w, h) => Object.assign(makeObj(x, y), { width: w, height: h }),
        text: (x, y, text) => makeObj(x, y, undefined, text),
        graphics: makeObj
    },
    input: Object.assign(new EventEmitter(), { keyboard: new EventEmitter() }),
    events: new EventEmitter(),
    tweens: { add: () => ({ stop() {} }) },
    time: {
        delayedCall: (ms, cb) => {
            const t = { ms, cb, removed: false, remove() { this.removed = true; } };
            timers.push(t);
            return t;
        }
    },
    sound: { play() {}, get: () => null, add: () => ({ play() {}, stop() {}, setVolume() {} }) }
});

scene.init({ currentCityIndex: 1 });
scene.create();
scene.setSelectedIndex(2);
scene.confirmationDialog = { show: (cfg) => { dialogConfig = cfg; } };

assert.equal(scene.feedbackText.visible, false);

// Abre o dialogo de compra na Cidade 3 (indice 2) pelo botao "Comprar (1000 ATP)"
const buyButton = scene.previewElements.find((el) => el.input && el.width === 230 && el.y === 412);
assert.ok(buyButton, 'botao Comprar da Cidade 3 encontrado');
buyButton.emit('pointerdown');
buyButton.emit('pointerup');
assert.ok(dialogConfig && typeof dialogConfig.onAccept === 'function');

dialogConfig.onAccept();
assert.equal(isCityPurchased(2), true);
assert.equal(scene.feedbackText.visible, true);
assert.equal(scene.feedbackText.text, 'Cidade comprada!');
assert.equal(timers.at(-1).ms, 2500);

// Apos ~2,5s o aviso desaparece
timers.at(-1).cb();
assert.equal(scene.feedbackText.visible, false);

console.log('OK: mensagem temporaria "Cidade comprada!" exibida e ocultada apos 2,5s.');
