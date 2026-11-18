// Teste do tutorial (legendas, estado e ocorrencia inicial) com objetos Phaser simulados:
//   node tests/tutorial.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

// ===== Ambiente minimo de navegador =====
const storage = new Map();
globalThis.window = {
    location: { search: '?debug' },
    localStorage: {
        getItem: (key) => (storage.has(key) ? storage.get(key) : null),
        setItem: (key, value) => { storage.set(key, String(value)); },
        removeItem: (key) => { storage.delete(key); }
    }
};
String.prototype.setFilter = function () {};
globalThis.Phaser = { Scene: class {}, Textures: { FilterMode: { NEAREST: 0 } } };

class DisplayObject extends EventEmitter {
    constructor(x = 0, y = 0, texture, extra) {
        super();
        Object.assign(this, { x, y, texture, visible: true, depth: 0, height: 54, width: 100, displayWidth: 40, displayHeight: 40 });
        if (typeof extra === 'string') this.text = extra;
        this.body = { enable: true, blocked: {}, velocity: { x: 0, y: 0 } };
        this.anims = { pause() {}, resume() {}, stop() {} };
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
['setOrigin', 'setStrokeStyle', 'setScale', 'setFillStyle', 'setScrollFactor', 'setAlpha', 'setDisplaySize',
    'setCollideWorldBounds', 'setImmovable', 'setMask', 'createGeometryMask', 'play', 'clear', 'fillStyle',
    'fillRect', 'fillTriangle', 'lineStyle', 'strokeRect'].forEach((name) => {
    DisplayObject.prototype[name] = function () { return this; };
});

const { GameMap } = await import('../src/scenes/GameMap.js');
const { getOccurrence, updateActiveCityTimers, resetOccurrenceState } = await import('../src/scenes/occurrenceState.js');
const { getSettings, reactivateTutorial, DEFAULT_TUTORIAL_PROGRESS, TUTORIAL_FLAG_KEYS } = await import('../src/scenes/settingsStore.js');
const { TUTORIAL_STEPS } = await import('../src/scenes/tutorialSteps.js');
const { paginateCaption } = await import('../src/scenes/TutorialCaption.js');
const { setAllCitiesUnlocked } = await import('../src/scenes/debugState.js');
const { markAttendanceJustCompleted } = await import('../src/scenes/tutorialState.js');
const { markCharacterAttended } = await import('../src/scenes/atpStore.js');
const { clearAllProgress } = await import('../src/scenes/debugTools.js');

const makeObject = (...args) => new DisplayObject(...args);
const soundsPlayed = [];

function openMap(initData = {}) {
    const scene = new GameMap();
    const keyboard = Object.assign(new EventEmitter(), { createCursorKeys() {} });
    Object.assign(scene, {
        scene: { start() {} },
        load: { image() {}, audio() {} },
        add: {
            image: makeObject, sprite: makeObject, tileSprite: makeObject,
            rectangle: (x, y, width, height) => Object.assign(makeObject(x, y), { width, height }),
            text: (x, y, text) => makeObject(x, y, undefined, text), graphics: makeObject
        },
        make: { graphics: makeObject },
        physics: { add: { sprite: makeObject }, world: { setBounds() {} } },
        scale: { resize() {} },
        cameras: { main: { setViewport() {}, width: 512, height: 608 } },
        input: Object.assign(new EventEmitter(), { keyboard }),
        events: new EventEmitter(),
        tweens: { add: () => ({ stop() {} }) },
        time: { now: 100, delayedCall: () => ({ remove() {} }) },
        anims: { exists: () => false, create() {} },
        sound: { play: (key) => { soundsPlayed.push(key); }, get: () => null }
    });
    scene.init(initData);
    scene.preload();
    scene.create();
    return scene;
}

const caption = (scene) => scene.tutorialManager.caption;
const pageText = (scene) => caption(scene).pages[caption(scene).pageIndex]?.text;
const closeScene = (scene) => scene.events.emit('shutdown');
const joaquimOf = (scene) => scene.clickableCharacters.find((c) => c.iconButtonKey === 'joaquim');
const alertedIds = (scene) => scene.clickableCharacters.filter((c) => c.alertIcon).map((c) => c.iconButtonKey);
const progress = () => getSettings().tutorialProgress;

function resetEverything() {
    storage.clear();
    clearAllProgress();
    resetOccurrenceState();
    setAllCitiesUnlocked(false);
}

// ===== Paginacao: legenda com mais de 3 linhas e dividida =====
{
    const fits = (text) => text.length <= 156;
    const long = 'Primeira frase longa para preencher mais de uma linha na caixa de legenda do tutorial. Segunda frase complementar que faz o texto ultrapassar o limite de tres linhas na tela.';
    const pages = paginateCaption(long, fits);
    assert.ok(pages.length >= 2, 'texto longo deve virar 2 legendas ou mais');
    assert.ok(pages.every(fits));
    assert.equal(pages.join(' '), long);
    assert.deepEqual(paginateCaption('Curta.', fits), ['Curta.']);
}

// ===== Etapa 1: estado, introducao (A) e ocorrencia inicial (B) =====
resetEverything();
assert.equal(getSettings().tutorialHintsEnabled, true);
assert.deepEqual(progress(), DEFAULT_TUTORIAL_PROGRESS);

let scene = openMap();
assert.ok(caption(scene).isOpen, 'A1 abre na primeira vez');
assert.equal(pageText(scene), TUTORIAL_STEPS.intro[0].text);
assert.equal(caption(scene).blocking, true);
assert.ok(caption(scene).elements.some((el) => el.input && el.width === 512 && el.depth === caption(scene).depth), 'camada que bloqueia cliques');
assert.deepEqual(alertedIds(scene), []);
// Relogios parados enquanto o tutorial nao termina.
assert.deepEqual(updateActiveCityTimers(0, 10 * 60 * 1000), []);
assert.equal(getOccurrence('marlene').hasAlert, false);
assert.equal(getOccurrence('marlene').remainingMs, 120000);

// A1 -> A2 e fechar o jogo no meio: retoma em A2.
caption(scene).advance();
assert.equal(progress().introStep, 1);
assert.equal(pageText(scene), TUTORIAL_STEPS.intro[1].text);
assert.ok(soundsPlayed.includes('clique'));
closeScene(scene);
scene = openMap();
assert.equal(pageText(scene), TUTORIAL_STEPS.intro[1].text, 'retoma no passo salvo');

// Espaco e Enter tambem avancam.
scene.input.keyboard.emit('keydown-SPACE', { repeat: false });
assert.equal(pageText(scene), TUTORIAL_STEPS.intro[2].text);
scene.input.keyboard.emit('keydown-SPACE', { repeat: true });
assert.equal(pageText(scene), TUTORIAL_STEPS.intro[2].text, 'repeticao da tecla nao avanca');
assert.deepEqual(alertedIds(scene), []);
scene.input.keyboard.emit('keydown-ENTER', { repeat: false });

// A4: so o Seu Joaquim recebe o alerta; legenda sem bloquear; relogios continuam parados.
assert.equal(progress().intro, true);
assert.deepEqual(alertedIds(scene), ['joaquim']);
assert.equal(getOccurrence('joaquim').hasAlert, true);
assert.equal(getOccurrence('marlene').hasAlert, false);
assert.equal(getOccurrence('aparecida').hasAlert, false);
assert.equal(pageText(scene), TUTORIAL_STEPS.ocorrenciaInicial[0].text);
assert.equal(caption(scene).blocking, false);
assert.ok(!caption(scene).elements.some((el) => el.width === 512 && el.height === 608), 'A4 nao bloqueia o jogo');
// A4 fica na tela ate abrir o minigame (clicar na legenda ou apertar Espaco/Enter nao fecha A4).
caption(scene).advance();
scene.input.keyboard.emit('keydown-SPACE', { repeat: false });
assert.equal(caption(scene).isOpen, true, 'A4 permanece na tela ate abrir o minigame');
assert.equal(progress().ocorrenciaInicial, false);
assert.deepEqual(updateActiveCityTimers(0, 10 * 60 * 1000), []);
assert.equal(getOccurrence('marlene').hasAlert, false);
assert.equal(scene.clickableCharacters.find((c) => c.iconButtonKey === 'marlene').alertIcon ?? null, null);

// Fechar o jogo depois do alerta e antes de concluir: o alerta volta ao reabrir (estado de ocorrencia e memoria).
closeScene(scene);
resetOccurrenceState();
scene = openMap();
assert.deepEqual(alertedIds(scene), ['joaquim'], 'alerta do Joaquim volta ao reabrir');
assert.equal(getOccurrence('joaquim').hasAlert, true);
assert.equal(caption(scene).isOpen, true, 'A4 reaparece se o minigame ainda nao foi aberto');

// Pular tutorial: tudo visto, dicas desligadas, relogios voltam a contar, nada forcado depois.
const skipHit = caption(scene).elements.filter((el) => el.input && el.width < 512).at(-1);
skipHit.emit('pointerdown', null, 0, 0, {});
skipHit.emit('pointerup', null, 0, 0, {});
assert.equal(caption(scene).isOpen, false);
assert.equal(getSettings().tutorialHintsEnabled, false);
assert.ok(TUTORIAL_FLAG_KEYS.every((key) => progress()[key] === true));
assert.ok(updateActiveCityTimers(0, 10 * 60 * 1000).length > 0, 'relogios voltam a contar apos pular');
closeScene(scene);
resetOccurrenceState();
scene = openMap();
assert.equal(caption(scene).isOpen, false);
assert.deepEqual(alertedIds(scene), [], 'nada e forcado depois de pular');
closeScene(scene);

// Zerar progresso nao reseta o tutorial.
clearAllProgress();
assert.equal(getSettings().tutorialHintsEnabled, false);

// Botao TUTORIAL: limpa flags e religa as dicas.
reactivateTutorial();
assert.equal(getSettings().tutorialHintsEnabled, true);
assert.deepEqual(progress(), DEFAULT_TUTORIAL_PROGRESS);

// Seu Joaquim ja atendido: a introducao informativa roda, mas nada e forcado.
markCharacterAttended('joaquim');
resetOccurrenceState();
scene = openMap();
assert.equal(pageText(scene), TUTORIAL_STEPS.intro[0].text);
assert.deepEqual(updateActiveCityTimers(0, 10 * 60 * 1000).map((o) => o.id).sort(), ['aparecida', 'joaquim', 'marlene'], 'sem forcar, os relogios correm');
resetOccurrenceState();
['keydown-SPACE', 'keydown-SPACE', 'keydown-SPACE'].forEach((key) => scene.input.keyboard.emit(key, {}));
assert.equal(caption(scene).isOpen, false);
assert.deepEqual(alertedIds(scene), []);
assert.equal(getOccurrence('joaquim').hasAlert, false);
closeScene(scene);

// Fora da Cidade 1 nao forca: a introducao espera o jogador voltar a ela.
resetEverything();
setAllCitiesUnlocked(true);
scene = openMap({ targetCityIndex: 1 });
assert.equal(scene.currentCityIndex, 1);
assert.equal(caption(scene).isOpen, false);
assert.equal(getOccurrence('joaquim').hasAlert, false);
scene.cityNavigation.goTo(0);
assert.equal(caption(scene).isOpen, true);
assert.equal(pageText(scene), TUTORIAL_STEPS.intro[0].text);
closeScene(scene);

// Nada aparece com as dicas desligadas.
resetEverything();
window.localStorage.setItem('hemovilla-settings', JSON.stringify({ tutorialHintsEnabled: false }));
scene = openMap();
assert.equal(caption(scene).isOpen, false);
closeScene(scene);

// ===== Etapa 2: secoes C (minigame Fases 1, 2 e 3), D (apos 1o atendimento) e E (selecao de cidade) =====
const { TutorialManager } = await import('../src/scenes/TutorialManager.js');
const { addATP, getATP, isCharacterAttended } = await import('../src/scenes/atpStore.js');

function createDummyScene(width = 512, height = 512) {
    const keyboard = Object.assign(new EventEmitter(), { createCursorKeys() {} });
    return {
        cameras: { main: { width, height } },
        add: {
            image: makeObject,
            rectangle: (x, y, w, h) => Object.assign(makeObject(x, y), { width: w, height: h }),
            text: (x, y, text) => makeObject(x, y, undefined, text),
            graphics: makeObject
        },
        input: Object.assign(new EventEmitter(), { keyboard }),
        events: new EventEmitter(),
        tweens: { add: () => ({ stop() {} }) },
        sound: { play: (key) => { soundsPlayed.push(key); }, get: () => null }
    };
}

resetEverything();
scene = openMap();
['keydown-SPACE', 'keydown-SPACE', 'keydown-SPACE'].forEach((key) => scene.input.keyboard.emit(key, { repeat: false }));
assert.equal(pageText(scene), TUTORIAL_STEPS.ocorrenciaInicial[0].text);
closeScene(scene);

// Abre o minigame: cumpre A4 e mostra C1 (Fase 1) sem bloquear.
const mgScene = createDummyScene(512, 512);
mgScene.tutorialManager = new TutorialManager(mgScene);
mgScene.tutorialManager.startMinigame();
assert.equal(progress().ocorrenciaInicial, true);
assert.equal(caption(mgScene).isOpen, true);
assert.equal(caption(mgScene).blocking, false);
assert.equal(pageText(mgScene), TUTORIAL_STEPS.minigameFase1[0].text);

// Avanca para Fase 2: encerra C1 e mostra C2, C3, C4 e C5 (so ABO, sem Anti-D).
mgScene.tutorialManager.startMinigamePhase('minigameFase2');
assert.equal(progress().minigameFase1, true);
assert.equal(caption(mgScene).blocking, false);
assert.equal(pageText(mgScene), 'Fase 2 — Tipagem: descubra o tipo sanguíneo! Misture o sangue com os soros e observe se ele forma grumos (aglutinação).');
caption(mgScene).advance();
assert.equal(pageText(mgScene), 'Aglutinou com o Anti-A: tem antígeno A. Com o Anti-B: tem B. Com os dois: AB. Sem reação: tipo O.');
caption(mgScene).advance();
assert.equal(pageText(mgScene), 'Agora escolha o tipo sanguíneo certo. Cada erro tira um dos seus 3 corações.');
caption(mgScene).advance();
assert.equal(pageText(mgScene), TUTORIAL_STEPS.minigameFase2[3].text);
assert.ok(!TUTORIAL_STEPS.minigameFase2.some((s) => /Anti-D|Rh/i.test(s.text)), 'Fase 2 nao cita Anti-D nem Rh');

// Avanca para Fase 3: encerra Fase 2 e mostra C6 e C7.
mgScene.tutorialManager.startMinigamePhase('minigameFase3');
assert.equal(progress().minigameFase2, true);
assert.equal(pageText(mgScene), TUTORIAL_STEPS.minigameFase3[0].text);
caption(mgScene).advance();
assert.equal(pageText(mgScene), TUTORIAL_STEPS.minigameFase3[1].text);
// Mesmo se o jogador fechar C7 antes de concluir a transfusao, os relogios continuam parados ate concluir.
caption(mgScene).advance();
assert.equal(caption(mgScene).isOpen, false);
assert.deepEqual(updateActiveCityTimers(0, 10 * 60 * 1000), [], 'relogios continuam parados ate concluir o atendimento');

// Conclui o atendimento do Seu Joaquim: paga ATP, marca como atendido e solta os relogios.
addATP(120);
markCharacterAttended('joaquim');
markAttendanceJustCompleted();
mgScene.tutorialManager.onAttendanceCompleted();
mgScene.events.emit('shutdown');

assert.equal(getATP(), 120);
assert.equal(isCharacterAttended('joaquim'), true);
assert.ok(updateActiveCityTimers(0, 10 * 60 * 1000).length > 0, 'relogios voltam a contar apos concluir o minigame');

// Volta ao mapa: secao D (D1 e D2, bloqueando).
scene = openMap();
assert.equal(caption(scene).isOpen, true);
assert.equal(caption(scene).blocking, true);
assert.equal(pageText(scene), TUTORIAL_STEPS.aposPrimeiroAtendimento[0].text);
caption(scene).advance();
assert.equal(pageText(scene), TUTORIAL_STEPS.aposPrimeiroAtendimento[1].text);
caption(scene).advance();
assert.equal(caption(scene).isOpen, false);
assert.equal(progress().aposPrimeiroAtendimento, true);
closeScene(scene);

// Abre a selecao de cidade (1a vez): secao E (E1, bloqueando); na 2a vez nao repete.
const csScene = createDummyScene(512, 512);
csScene.tutorialManager = new TutorialManager(csScene);
csScene.tutorialManager.startCitySelect();
assert.equal(caption(csScene).isOpen, true);
assert.equal(caption(csScene).blocking, true);
assert.equal(pageText(csScene), TUTORIAL_STEPS.selecaoCidade[0].text);
caption(csScene).advance();
assert.equal(caption(csScene).isOpen, false);
assert.equal(progress().selecaoCidade, true);
csScene.events.emit('shutdown');

const csScene2 = createDummyScene(512, 512);
csScene2.tutorialManager = new TutorialManager(csScene2);
csScene2.tutorialManager.startCitySelect();
assert.equal(caption(csScene2).isOpen, false, 'E1 nao repete na 2a vez');
csScene2.events.emit('shutdown');

console.log('OK: legendas, estado do tutorial, secoes A-E, ocorrencia inicial, relogios parados e botao TUTORIAL.');
