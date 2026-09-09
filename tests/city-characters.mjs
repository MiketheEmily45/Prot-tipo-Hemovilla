// Teste de integracao dos modulos com objetos Phaser simulados: node tests/city-characters.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';

class DisplayObject extends EventEmitter {
    constructor(x = 0, y = 0, texture) {
        super(); Object.assign(this, { x, y, texture, visible: true, depth: 0, height: 64, displayWidth: 40 });
        this.body = { enable: true, blocked: {}, velocity: { x: 0, y: 0 } };
        this.anims = { pause() {}, resume() {}, stop() {} };
    }
    setInteractive() { this.input = { enabled: true }; return this; }
    setVisible(v) { this.visible = v; return this; }
    setTexture(v) { this.texture = v; return this; }
    setText(v) { this.texture = v; return this; }
    setDepth(v) { this.depth = v; return this; }
    setTint(v) { this.tint = v; return this; }
    clearTint() { this.tint = null; return this; }
    setPosition(x, y) { Object.assign(this, { x, y }); return this; }
    setVelocity(x, y) { this.body.velocity = { x, y }; return this; }
    setVelocityX(x) { this.body.velocity.x = x; return this; }
    setOrigin() { return this; }
    setDisplaySize() { return this; }
    setCollideWorldBounds() { return this; }
    setImmovable() { return this; }
    setMask() { return this; }
    fillStyle() { return this; }
    fillRect() { return this; }
    createGeometryMask() { return this; }
    play() { return this; }
    destroy() { this.destroyed = true; }
}
globalThis.Phaser = { Scene: class {} };
const { GameMap } = await import('../src/scenes/GameMap.js');
const { closeCharacterDescription } = await import('../src/scenes/CharacterDescriptionPanel.js');
const { triggerAllCharactersAlert } = await import('../src/scenes/ClickableCharacterManager.js');
const { city2Characters, city3Characters } = await import('../src/scenes/CityCharacters.js');
const scene = new GameMap();
const create = (...args) => new DisplayObject(...args);
Object.assign(scene, {
    load: { image(key, path) { assert.ok(fs.existsSync(path), path); } },
    add: { image: create, sprite: create, tileSprite: create, rectangle: create, text: create },
    make: { graphics: create },
    physics: { add: { sprite: create }, world: { setBounds() {} } },
    scale: { resize() {} }, cameras: { main: { setViewport() {} } },
    input: Object.assign(new EventEmitter(), { keyboard: { createCursorKeys() {} } }),
    time: { now: 100 }, anims: { exists: () => false, create() {} }
});
scene.preload(); scene.create();
const city1 = scene.clickableCharacters;
scene.cityNavigation.goTo(1);
assert.deepEqual(scene.clickableCharacters.map(c => c.iconButtonKey), ['bruno', 'beatriz', 'carlos']);
const city2 = scene.clickableCharacters;
assert.ok(city1.every(c => !c.sprite.visible && !c.sprite.body.enable));
triggerAllCharactersAlert(scene); scene.update(100);
assert.ok(city2.every(c => c.alertIcon && scene.characterIconButtons[c.iconButtonKey].tint === 0xff5555));
assert.ok(city1.every(c => !c.alertIcon));

// Em qualquer cidade, o sprite alterna balao/parada e o icone consulta dados.
city2.forEach((character) => {
    const id = character.iconButtonKey;
    const alert = character.alertIcon;
    const deadline = character.nextAlertTime;
    scene.characterIconButtons[id].emit('pointerup');
    assert.equal(scene.characterOverlay.characterId, id);
    assert.ok(scene.characterOverlay.description.texture.includes('A definir'));
    assert.notEqual(character.sprite.body.velocity.x, 0);
    assert.equal(character.alertIcon, alert);
    assert.equal(character.nextAlertTime, deadline);
    assert.equal(scene.characterIconButtons[id].tint, 0xff5555);
    closeCharacterDescription(scene);

    character.sprite.emit('pointerdown');
    assert.equal(scene.characterOverlay, null);
    assert.equal(character.sprite.body.velocity.x, 0);
    assert.equal(character.balloon.texture, 'balao_temporario');
    assert.ok(character.balloon.y < character.sprite.y);
    assert.equal(character.alertIcon, null);
    assert.equal(scene.alertedIconKeys.has(id), false);
    assert.equal(scene.characterIconButtons[id].tint, null);
    const balloon = character.balloon;
    scene.characterIconButtons[id].emit('pointerup');
    closeCharacterDescription(scene);
    assert.equal(character.balloon, balloon);
    assert.equal(character.sprite.body.velocity.x, 0);
    character.sprite.emit('pointerdown');
    assert.equal(character.balloon, null);
    assert.ok(balloon.destroyed);
    assert.notEqual(character.sprite.body.velocity.x, 0);
});
assert.equal(scene.input.listenerCount('wheel'), 0);

city2Characters.forEach((config, index) => {
    const walker = scene.horizontalNPCs[index];
    walker.sprite.x = config.maxX; walker.direction = 'right'; scene.update(100);
    assert.ok(walker.sprite.body.velocity.x < 0);
    walker.sprite.x = config.minX; scene.update(100);
    assert.ok(walker.sprite.body.velocity.x > 0);
});
scene.characterIconButtons.carlos.emit('pointerup');
scene.cityNavigation.goTo(2);
assert.equal(scene.characterOverlay, null);
const city3 = scene.clickableCharacters;
assert.deepEqual(city3.map(c => c.iconButtonKey), ['caue', 'yasmin', 'teo']);
assert.equal(scene.alertButton.visible, true);
assert.ok(city2.every(c => !c.sprite.visible && !c.sprite.body.enable));
scene.alertButton.emit('pointerup'); scene.update(100);
assert.ok(city3.every(c => c.alertIcon && scene.characterIconButtons[c.iconButtonKey].tint === 0xff5555));
assert.ok([...city1, ...city2].every(c => !c.alertIcon));
city3.forEach((character, index) => {
    const id = character.iconButtonKey;
    const alert = character.alertIcon;
    scene.characterIconButtons[id].emit('pointerup');
    assert.equal(scene.characterOverlay.characterId, id);
    assert.ok(scene.characterOverlay.description.texture.includes('A definir'));
    assert.equal(character.alertIcon, alert);
    closeCharacterDescription(scene);
    character.sprite.emit('pointerdown');
    assert.equal(scene.characterOverlay, null);
    assert.equal(character.balloon.texture, 'balao_temporario');
    assert.equal(character.sprite.body.velocity.x, 0);
    assert.equal(character.alertIcon, null);
    scene.characterIconButtons[id].emit('pointerup');
    closeCharacterDescription(scene);
    assert.equal(character.sprite.body.velocity.x, 0);
    character.sprite.emit('pointerdown');
    assert.equal(character.balloon, null);
    const walker = scene.horizontalNPCs[index];
    walker.sprite.x = city3Characters[index].maxX;
    walker.direction = 'right'; scene.update(100);
    assert.ok(walker.sprite.body.velocity.x < 0);
    walker.sprite.x = city3Characters[index].minX; scene.update(100);
    assert.ok(walker.sprite.body.velocity.x > 0);
});
// O balao e a parada tambem persistem ao sair e retornar a Cidade3.
city3[0].sprite.emit('pointerdown');
scene.time.now = 1100;
scene.cityNavigation.goTo(1);
assert.ok(city3.every(c => !c.sprite.visible && !c.sprite.body.enable));
assert.equal(city3[0].balloon.visible, false);
assert.equal(scene.clickableCharacters, city2);
assert.equal(city2[0].nextAlertTime, 61100);
assert.ok(city2.every(c => c.sprite.visible && c.sprite.body.enable));
assert.equal(scene.alertButton.visible, true);
scene.cityNavigation.goTo(0);
assert.equal(scene.clickableCharacters, city1);
assert.deepEqual(Object.keys(scene.characterIconButtons), ['joaquim', 'marlene', 'aparecida']);
assert.equal(scene.nextDirectionChange, 1800);
scene.update(1100);
// O campo de tipo sanguineo tambem aparece nos tres paineis da Cidade1.
for (const id of Object.keys(scene.characterIconButtons)) {
    scene.characterIconButtons[id].emit('pointerup');
    assert.ok(scene.characterOverlay.description.texture.includes('A definir'));
    closeCharacterDescription(scene);
}
scene.time.now = 2100;
scene.cityNavigation.goTo(2);
assert.equal(scene.clickableCharacters, city3);
assert.equal(city3[0].balloon.visible, true);
assert.equal(city3[0].sprite.body.velocity.x, 0);
assert.equal(city3[0].nextAlertTime, 61100);
city3[0].sprite.emit('pointerdown');
assert.notEqual(city3[0].sprite.body.velocity.x, 0);
console.log('OK: assets, grupos, alertas isolados, painel, retomada, bounds e contadores.');
