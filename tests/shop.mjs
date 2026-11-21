import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const storage = new Map();
globalThis.window = {
    location: { search: '' },
    localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key)
    }
};
globalThis.Phaser = { Scene: class { constructor(key) { this.key = key; } } };

const {
    assignShopCharacterReplacement,
    equipShopCharacter,
    getCharacterReplacement,
    getCharacterReplacementTarget,
    getEquippedShopCharacter,
    getCharacterReplacements,
    isReplacementTargetAccessible,
    getShopPurchases,
    isShopCharacterPurchased,
    purchaseShopCharacter,
    resetShopMemory
} = await import('../src/scenes/shopStore.js');
const { addATP, getATP, markCharacterAttended, resetInMemoryATP } = await import('../src/scenes/atpStore.js');
const { CITY_3_PRICE, isCityPurchased, resetPurchasedCitiesMemory } = await import('../src/scenes/cityUnlocks.js');
const { Shop } = await import('../src/scenes/Shop.js');

assert.equal(equipShopCharacter('douglas'), false);
assert.equal(purchaseShopCharacter('unknown'), false);
assert.equal(assignShopCharacterReplacement('douglas', 'joaquim'), false);
assert.equal(purchaseShopCharacter('douglas'), true);
assert.equal(purchaseShopCharacter('douglas'), false);
assert.equal(isShopCharacterPurchased('douglas'), true);
assert.deepEqual(getShopPurchases(), ['douglas']);
assert.equal(equipShopCharacter('douglas'), true);
assert.equal(getEquippedShopCharacter(), 'douglas');
assert.equal(isReplacementTargetAccessible('bruno'), false);
assert.equal(assignShopCharacterReplacement('douglas', 'bruno'), false);
assert.equal(assignShopCharacterReplacement('douglas', 'joaquim'), true);
assert.equal(getCharacterReplacement('joaquim'), 'douglas');
assert.equal(getCharacterReplacementTarget('douglas'), 'joaquim');
assert.deepEqual(getCharacterReplacements(), { joaquim: 'douglas' });
assert.equal(assignShopCharacterReplacement('douglas', 'marlene'), true);
assert.deepEqual(getCharacterReplacements(), { marlene: 'douglas' });
const reloadedShopStore = await import('../src/scenes/shopStore.js?replacement-persistence');
assert.equal(reloadedShopStore.isShopCharacterPurchased('douglas'), true);
assert.deepEqual(reloadedShopStore.getCharacterReplacements(), { marlene: 'douglas' });
const { getPatientSpriteKey } = await import('../src/scenes/Minigame.js');
assert.equal(getPatientSpriteKey('marlene'), 'paciente-douglas');
const { getCharacterPortraitKey } = await import('../src/scenes/TransfusionPhase.js');
assert.equal(getCharacterPortraitKey('marlene'), 'extra-douglas-icon');

class FakeDisplayObject extends EventEmitter {
    constructor(x = 0, y = 0, texture = '') {
        super();
        Object.assign(this, { x, y, texture, width: 200, height: 20 });
    }
    setInteractive() { this.input = { enabled: true }; return this; }
    setOrigin() { return this; }
    setDepth() { return this; }
    setPosition(x, y) { Object.assign(this, { x, y }); return this; }
    setDisplaySize() { return this; }
    setMask() { return this; }
    setText(text) { this.texture = text; return this; }
    setTint() { return this; }
    clearTint() { return this; }
    setVelocity() { return this; }
    setVelocityX() { return this; }
    setCollideWorldBounds() { return this; }
    setImmovable() { return this; }
    setStrokeStyle() { return this; }
    setFillStyle() { return this; }
    play() { return this; }
    fillStyle() { return this; }
    fillRect() { return this; }
    createGeometryMask() { return this; }
    destroy() { this.destroyed = true; }
}
const sceneMock = {
    time: { now: 0 },
    input: new EventEmitter(),
    sound: { play() {} },
    add: {
        image: (...args) => new FakeDisplayObject(...args),
        rectangle: (...args) => new FakeDisplayObject(...args),
        text: (...args) => new FakeDisplayObject(...args)
    },
    make: { graphics: () => new FakeDisplayObject() },
    physics: {
        add: { sprite: (...args) => new FakeDisplayObject(...args) }
    },
    anims: { exists: () => false, create() {} }
};
const { city1Characters, createCityCharacter } = await import('../src/scenes/CityCharacters.js');
const { createCharacterIconButtons } = await import('../src/scenes/IconButtons.js');
const { character } = createCityCharacter(sceneMock, city1Characters[0]);
assert.equal(character.displayName, 'Professor Doug');
assert.equal(character.sprite.texture, 'extra-douglas-idle-left');
const icons = createCharacterIconButtons(sceneMock, ['marlene']);
assert.equal(icons.marlene.texture, 'extra-douglas-icon');
icons.marlene.emit('pointerup');
assert.equal(sceneMock.characterOverlay.title.texture, 'Professor Doug');
assert.match(sceneMock.characterOverlay.description.texture, /programador Python/);
const replacementShop = new Shop();
Object.assign(replacementShop, sceneMock, {
    modalOpen: false,
    modalElements: [],
    cardElements: [],
    renderCards() {},
    showFeedback(message) { this.lastFeedback = message; }
});
replacementShop.openReplacementDialog({ id: 'douglas', name: 'Douglas' });
const lockedCityTwo = replacementShop.modalElements.find(
    (element) => element.x === 108 && element.y === 250 && element.texture === 132
);
assert.ok(lockedCityTwo);
assert.equal(lockedCityTwo.input.enabled, true);
lockedCityTwo.emit('pointerup', {}, 0, 0, { stopPropagation() {} });
assert.equal(replacementShop.modalOpen, true);
assert.equal(replacementShop.lastFeedback, 'A Cidade 2 ainda está bloqueada.');
const firstCityTarget = replacementShop.modalElements.find(
    (element) => element.x === 108 && element.y === 154 && element.texture === 132
);
assert.ok(firstCityTarget.input);
firstCityTarget.emit('pointerdown');
firstCityTarget.emit('pointerup', {}, 0, 0, { stopPropagation() {} });
assert.equal(getCharacterReplacement('joaquim'), 'douglas');
assert.equal(getCharacterReplacement('marlene'), null);

storage.clear();
resetShopMemory();
assert.deepEqual(getShopPurchases(), []);
assert.equal(getEquippedShopCharacter(), null);
assert.deepEqual(getCharacterReplacements(), {});

const shop = new Shop();
Object.assign(shop, {
    renderCards() {},
    updateBalance() {},
    showFeedback(message) { this.lastFeedback = message; }
});

addATP(600);
shop.completePurchase({ id: 'douglas', name: 'Douglas', kind: 'character', price: 600 });
assert.equal(getATP(), 0);
assert.equal(isShopCharacterPurchased('douglas'), true);
assert.equal(storage.get('hemovilla-shop-purchases'), '["douglas"]');
const reloadedPurchaseStore = await import('../src/scenes/shopStore.js?purchase-persistence');
assert.equal(reloadedPurchaseStore.isShopCharacterPurchased('douglas'), true);
const reloadedAtpStore = await import('../src/scenes/atpStore.js?atp-persistence');
assert.equal(reloadedAtpStore.getATP(), 0);

markCharacterAttended('joaquim');
markCharacterAttended('marlene');
markCharacterAttended('aparecida');
assert.equal(isReplacementTargetAccessible('bruno'), true);
resetInMemoryATP();
addATP(CITY_3_PRICE);
shop.completePurchase({ id: 'cidade3', name: 'Cidade 3', kind: 'city', price: CITY_3_PRICE });
assert.equal(getATP(), 0);
assert.equal(isCityPurchased(2), true);
assert.equal(storage.get('hemovilla-purchased-cities'), '[2]');

storage.clear();
resetShopMemory();
resetInMemoryATP();
resetPurchasedCitiesMemory();
