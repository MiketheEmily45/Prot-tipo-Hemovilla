// Teste unitario da minitela de pause (cidade, minigame, configuracoes, confirmacao e tutorial):
//   node tests/pause-menu.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

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
            x, y, texture, visible: true, depth: 0,
            height: 54, width: 100, displayWidth: 40, displayHeight: 40
        });
        if (typeof extra === 'string') this.text = extra;
        this.body = { enable: true, blocked: {}, velocity: { x: 0, y: 0 } };
        this.anims = {
            isPlaying: true,
            isPaused: false,
            pause() { this.isPaused = true; },
            resume() { this.isPaused = false; },
            stop() { this.isPlaying = false; }
        };
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
    'lineStyle', 'strokeRect', 'strokeCircle', 'setAngle', 'setCrop'
].forEach((name) => {
    DisplayObject.prototype[name] = function () { return this; };
});

const {
    PauseMenu,
    PAUSE_TEXTS,
    PAUSE_MUSIC_VOLUME_FACTOR,
    getPauseButtonDefinitions
} = await import('../src/scenes/PauseMenu.js');
const { GameMap } = await import('../src/scenes/GameMap.js');
const { Minigame } = await import('../src/scenes/Minigame.js');
const {
    TIMERS_RUN_DURING_MINIGAME,
    getOccurrence,
    resetOccurrenceState,
    triggerOccurrence,
    startMinigameSession,
    endMinigameSession,
    onAttendanceSuccess
} = await import('../src/scenes/occurrenceState.js');
const { skipTutorial, reactivateTutorial, getSettings } = await import('../src/scenes/settingsStore.js');
const { refreshOccurrenceClockFreeze } = await import('../src/scenes/tutorialState.js');
const { getATP, isCharacterAttended } = await import('../src/scenes/atpStore.js');
const { clearAllProgress } = await import('../src/scenes/debugTools.js');

function attachMockPhaserScene(scene, { width = 512, height = 512 } = {}) {
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
    const musicSound = {
        key: 'city-music',
        isPlaying: true,
        volume: 0.1,
        setVolume(v) { this.volume = v; },
        play() { this.isPlaying = true; },
        stop() { this.isPlaying = false; }
    };
    const sfxSound = {
        key: 'transfusao',
        isPlaying: true,
        stop() { this.isPlaying = false; }
    };
    const transitions = [];

    Object.assign(scene, {
        transitions,
        musicSound,
        sfxSound,
        children: { list: childrenList },
        scene: {
            start: (target, data) => { transitions.push({ target, data }); }
        },
        load: { image() {}, audio() {} },
        textures: {
            exists: () => true,
            get: () => ({
                setFilter() {},
                getSourceImage: () => ({ width: 216, height: 86 })
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
            graphics: makeObj,
            line: makeObj
        },
        make: { graphics: makeObj },
        physics: {
            add: { sprite: makeObj },
            world: {
                isPaused: false,
                setBounds() {},
                pause() { this.isPaused = true; },
                resume() { this.isPaused = false; }
            }
        },
        scale: { resize() {} },
        cameras: { main: { setViewport() {}, width, height } },
        input: Object.assign(new EventEmitter(), {
            keyboard,
            activePointer: { isDown: false, x: 0, y: 0 },
            setDraggable() {}
        }),
        events: new EventEmitter(),
        tweens: {
            pausedAll: false,
            add: () => ({ stop() {} }),
            pauseAll() { this.pausedAll = true; },
            resumeAll() { this.pausedAll = false; }
        },
        time: { now: 1000, delayedCall: () => ({ remove() {} }) },
        anims: { exists: () => false, create() {} },
        sound: {
            sounds: [musicSound, sfxSound],
            play: () => true,
            get: (key) => (key === 'city-music' ? musicSound : null),
            add: () => musicSound,
            stopByKey: (key) => {
                if (key === 'city-music') musicSound.stop();
                if (key === 'transfusao') sfxSound.stop();
            }
        }
    });
    return scene;
}

// 1. Constantes e definicoes de botoes por modo e tutorial.
assert.equal(PAUSE_MUSIC_VOLUME_FACTOR, 1.0);
assert.deepEqual(
    getPauseButtonDefinitions({ mode: 'city', isTutorial: false }).map((b) => b.label),
    [PAUSE_TEXTS.CONTINUE, PAUSE_TEXTS.SETTINGS, PAUSE_TEXTS.MAIN_MENU]
);
assert.deepEqual(
    getPauseButtonDefinitions({ mode: 'minigame', isTutorial: false }).map((b) => b.label),
    [PAUSE_TEXTS.CONTINUE, PAUSE_TEXTS.RETURN_TO_CITY, PAUSE_TEXTS.SETTINGS, PAUSE_TEXTS.MAIN_MENU]
);
assert.deepEqual(
    getPauseButtonDefinitions({ mode: 'minigame', isTutorial: true }).map((b) => b.label),
    [PAUSE_TEXTS.CONTINUE, PAUSE_TEXTS.SETTINGS, PAUSE_TEXTS.MAIN_MENU]
);

// 2. Cidade (GameMap): pausar/retomar congela relogios de ocorrencia, fisica, animacoes e SFX (sem alterar volume da musica).
storage.clear();
clearAllProgress();
resetOccurrenceState();
skipTutorial(); // Desliga o congelamento do tutorial para testar os relogios de ocorrencia na cidade.

const mapScene = attachMockPhaserScene(new GameMap(), { width: 512, height: 608 });
mapScene.init({});
mapScene.preload();
mapScene.create();

// Avanca 5 segundos com o jogo rodando: relogio do Joaquim cai de 60000 para 55000.
mapScene.update(1000, 5000);
assert.equal(getOccurrence('joaquim').remainingMs, 55000);

// Clica no botao de pausa na cidade.
const initialMusicVolume = mapScene.musicSound.volume;
mapScene.mapControls.pauseButton.emit('pointerdown');
mapScene.mapControls.pauseButton.emit('pointerup');
assert.equal(mapScene.pauseMenu.isOpen, true);
assert.equal(mapScene.physics.world.isPaused, true, 'fisica pausa na cidade');
assert.equal(mapScene.tweens.pausedAll, true, 'tweens pausam na cidade');
assert.equal(mapScene.sfxSound.isPlaying, false, 'efeitos sonoros param ao pausar');
assert.equal(mapScene.musicSound.isPlaying, true, 'musica continua tocando');
assert.equal(mapScene.musicSound.volume, initialMusicVolume, 'volume da musica nao muda');
assert.deepEqual(
    mapScene.pauseMenu.buttons.map((b) => b.label.text),
    ['Continuar', 'Configurações', 'Menu inicial']
);

// Enquanto pausado, update() nao desconta tempo dos relogios de ocorrencia.
mapScene.update(2000, 15000);
assert.equal(getOccurrence('joaquim').remainingMs, 55000, 'relogio de ocorrencia congelado durante o pause');

// Abrir Configuracoes como minitela por cima do pause e voltar ao pause.
mapScene.pauseMenu.handleButtonAction('settings');
assert.equal(Boolean(mapScene.pauseMenu.configOverlay?.isOpen), true, 'ConfigMenu abre como minitela');
assert.equal(mapScene.transitions.length, 0, 'nao troca de cena ao abrir Configuracoes no pause');
// Tecla ESC fecha a minitela de Configuracoes e volta ao pause.
mapScene.input.keyboard.emit('keydown-ESC', { repeat: false });
assert.equal(mapScene.pauseMenu.configOverlay, null, 'ConfigMenu fecha ao voltar');
assert.equal(mapScene.pauseMenu.isOpen, true, 'continua no menu de pause');

// Retomar (Continuar / ESC) descongelando fisica, animacoes e relogios.
mapScene.time.now = 4000;
mapScene.input.keyboard.emit('keydown-ESC', { repeat: false });
assert.equal(mapScene.pauseMenu.isOpen, false);
assert.equal(mapScene.physics.world.isPaused, false);
assert.equal(mapScene.tweens.pausedAll, false);
mapScene.update(5000, 5000);
assert.equal(getOccurrence('joaquim').remainingMs, 50000, 'relogio de ocorrencia volta a correr apos retomar');

// Na cidade, Menu inicial vai direto sem confirmacao.
mapScene.pauseMenu.open();
mapScene.pauseMenu.handleButtonAction('mainMenu');
assert.equal(mapScene.pauseMenu.confirmPopup.isOpen, false, 'sem confirmacao na cidade');
assert.deepEqual(mapScene.transitions.at(-1), { target: 'Start', data: undefined });

// 3. Minigame: congelar relogio do atendimento, tutorial esconde "Voltar para a cidade", abandonar com confirmacao.
resetOccurrenceState();
reactivateTutorial(); // Tutorial ativo -> deve esconder "Voltar para a cidade".
triggerOccurrence('joaquim');

const mgScene = attachMockPhaserScene(new Minigame(), { width: 512, height: 512 });
mgScene.init({ characterId: 'joaquim', cityIndex: 0 });
mgScene.preload();
mgScene.create();

mgScene.update(1000, 4000);
assert.equal(mgScene.attendanceState.elapsedSeconds, 4);

// Abre o pause via tecla ESC durante o tutorial.
mgScene.input.keyboard.emit('keydown-ESC', { repeat: false });
assert.equal(mgScene.pauseMenu.isOpen, true);
assert.equal(mgScene.attendanceState.isClockRunning, false, 'relogio do atendimento pausa');
assert.deepEqual(
    mgScene.pauseMenu.buttons.map((b) => b.label.text),
    ['Continuar', 'Configurações', 'Menu inicial'],
    'esconde Voltar para a cidade durante o tutorial'
);

// Enquanto pausado, o relogio do atendimento nao corre.
mgScene.update(2000, 10000);
assert.equal(mgScene.attendanceState.elapsedSeconds, 4, 'relogio do atendimento permanece em 4s');

// Retoma e verifica que o relogio volta a correr.
mgScene.pauseMenu.handleButtonAction('continue');
assert.equal(mgScene.pauseMenu.isOpen, false);
assert.equal(mgScene.attendanceState.isClockRunning, true);
mgScene.update(3000, 2500);
assert.equal(mgScene.attendanceState.elapsedSeconds, 6.5);

// Desliga o tutorial (pular tutorial): agora "Voltar para a cidade" aparece no pause do minigame.
skipTutorial();
mgScene.pauseMenu.open();
assert.deepEqual(
    mgScene.pauseMenu.buttons.map((b) => b.label.text),
    ['Continuar', 'Voltar para a cidade', 'Configurações', 'Menu inicial']
);

// Clicar em "Voltar para a cidade" pede confirmacao com ConfirmPopup.
mgScene.pauseMenu.handleButtonAction('returnToCity');
assert.equal(mgScene.pauseMenu.confirmPopup.isOpen, true, 'pede confirmacao antes de voltar para a cidade');
// Cancelar via ESC mantem no pause.
mgScene.input.keyboard.emit('keydown-ESC', { repeat: false });
assert.equal(mgScene.pauseMenu.confirmPopup.isOpen, false);
assert.equal(mgScene.pauseMenu.isOpen, true);
assert.equal(mgScene.transitions.length, 0);

// Confirmar "Voltar para a cidade": nao paga ATP, mantem ocorrencia pendente e volta ao GameMap.
mgScene.pauseMenu.handleButtonAction('returnToCity');
assert.equal(mgScene.pauseMenu.confirmPopup.isOpen, true);
mgScene.pauseMenu.abandonToCity();
assert.equal(getATP(), 0, 'nao paga ATP ao abandonar');
assert.equal(isCharacterAttended('joaquim'), false, 'nao marca como atendido ao abandonar');
assert.equal(getOccurrence('joaquim').hasAlert, true, 'personagem continua com a ocorrencia pendente');
assert.deepEqual(mgScene.transitions.at(-1), {
    target: 'GameMap',
    data: { cityIndex: 0, alertCharacterId: 'joaquim' }
});

// No minigame, "Menu inicial" tambem pede confirmacao.
mgScene.pauseMenu.open();
mgScene.pauseMenu.handleButtonAction('mainMenu');
assert.equal(mgScene.pauseMenu.confirmPopup.isOpen, true, 'Menu inicial no minigame pede confirmacao');
mgScene.pauseMenu.goToMainMenu();
assert.equal(getATP(), 0);
assert.equal(getOccurrence('joaquim').hasAlert, true);
assert.deepEqual(mgScene.transitions.at(-1), { target: 'Start', data: undefined });

// 4. Timers continuos durante o minigame (TIMERS_RUN_DURING_MINIGAME = true).
assert.equal(TIMERS_RUN_DURING_MINIGAME, true, 'TIMERS_RUN_DURING_MINIGAME deve estar ligado');
resetOccurrenceState();
skipTutorial();
refreshOccurrenceClockFreeze();
triggerOccurrence('joaquim');
startMinigameSession('joaquim', 0, 10000);
// 130s no minigame: Marlene (120s) estoura com alerta, Aparecida (240s) cai para 110s,
// Joaquim continua em atendimento (alerta pendente) e outras cidades permanecem congeladas.
endMinigameSession(10000 + 130000);
assert.equal(getOccurrence('marlene').remainingMs, 0);
assert.equal(getOccurrence('marlene').hasAlert, true, 'alerta da Marlene estoura durante o minigame');
assert.equal(getOccurrence('aparecida').remainingMs, 110000);
assert.equal(getOccurrence('aparecida').hasAlert, false);
assert.equal(getOccurrence('joaquim').hasAlert, true, 'personagem atendido nao reinicia relogio sem concluir');
assert.equal(getOccurrence('bruno').remainingMs, 60000, 'Cidade 2 continua congelada');
assert.equal(getOccurrence('caue').remainingMs, 60000, 'Cidade 3 continua congelada');

// Ao voltar para o mapa, o alerta da Marlene aparece na barra inferior sem tocar som de alerta.
const playedSoundsOnReturn = [];
const returnMap = attachMockPhaserScene(new GameMap(), { width: 512, height: 608 });
returnMap.sound.play = (key) => { playedSoundsOnReturn.push(key); return true; };
returnMap.init({ cityIndex: 0 });
returnMap.preload();
returnMap.create();
assert.equal(returnMap.alertedIconKeys.has('marlene'), true, 'icone da Marlene fica marcado na barra inferior');
assert.equal(returnMap.characterIconButtons.marlene.tint, 0xff5555, 'icone da Marlene fica avermelhado');
assert.equal(playedSoundsOnReturn.includes('alert-sound'), false, 'sem som de alerta ao sincronizar retorno do minigame');

// Ao concluir atendimento, apenas o personagem atendido reinicia o proprio relogio.
startMinigameSession('joaquim', 0, 200000);
onAttendanceSuccess('joaquim');
endMinigameSession(200000 + 30000);
assert.equal(getOccurrence('joaquim').hasAlert, false);
assert.equal(getOccurrence('joaquim').remainingMs, 60000, 'relogio do personagem atendido reinicia ao concluir');
assert.equal(getOccurrence('aparecida').remainingMs, 80000, 'outro personagem da mesma cidade continua descontando');

console.log('OK: minitela de pause na cidade e no minigame, congelamento de relogios, timers continuos, configuracoes, confirmacoes e tutorial.');
