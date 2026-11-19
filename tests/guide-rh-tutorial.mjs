// Testes do Guia (Rh + selo de perigo) e da legenda de tutorial da Etapa 2 (Cidade 2):
//   node tests/guide-rh-tutorial.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

// Mock minimo de browser + Phaser para rodar GuidePanel e TutorialManager fora do navegador.
const storage = new Map();
globalThis.window = {
    localStorage: {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => { storage.set(k, String(v)); },
        removeItem: (k) => { storage.delete(k); }
    },
    __PHASER_GAME__: null
};
globalThis.Phaser = {
    Textures: { FilterMode: { NEAREST: 1 } }
};

function makeDisplayObject(kind, extra = {}) {
    const obj = Object.assign(new EventEmitter(), {
        kind,
        destroyed: false,
        visible: true,
        alpha: 1,
        depth: 0,
        height: 40,
        input: { enabled: true },
        texture: { setFilter() {} },
        setOrigin() { return this; },
        setDepth(d) { this.depth = d; return this; },
        setScale(s) { this.scale = s; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setStrokeStyle() { return this; },
        setFillStyle() { return this; },
        setColor() { return this; },
        setInteractive() { return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setVisible(v) { this.visible = v; return this; },
        setText(t) { this.text = t; return this; },
        fillStyle() { return this; },
        fillRect() { return this; },
        fillTriangle() { return this; },
        clear() { return this; },
        destroy() { this.destroyed = true; }
    }, extra);
    return obj;
}

function createMockScene(cityIndex = 0) {
    const created = [];
    const keyboard = new EventEmitter();
    return {
        cityIndex,
        created,
        cameras: { main: { width: 512, height: 512 } },
        textures: { exists: () => true },
        add: {
            rectangle: (x, y, w, h) => {
                const o = makeDisplayObject('rectangle', { x, y, width: w, height: h });
                created.push(o);
                return o;
            },
            image: (x, y, key) => {
                const o = makeDisplayObject('image', { x, y, key });
                created.push(o);
                return o;
            },
            line: (x, y) => {
                const o = makeDisplayObject('line', { x, y });
                created.push(o);
                return o;
            },
            text: (x, y, text) => {
                const o = makeDisplayObject('text', { x, y, text });
                created.push(o);
                return o;
            },
            graphics: () => {
                const o = makeDisplayObject('graphics');
                created.push(o);
                return o;
            }
        },
        input: Object.assign(new EventEmitter(), { keyboard }),
        events: new EventEmitter(),
        tweens: { add: () => ({ stop() {} }) },
        sound: {
            play() {},
            get: () => null,
            add: () => ({ play() {}, stop() {}, setVolume() {} })
        }
    };
}

const {
    getCompatibilityGuideEntries,
    RH_GUIDE_RULE_SUMMARY
} = await import('../src/scenes/bloodCompatibility.js');
const { CONTAMINATED_SCREENING_INFO } = await import('../src/scenes/contaminatedInfo.js');
const { GuidePanel } = await import('../src/scenes/GuidePanel.js');
const {
    TUTORIAL_FLAG_KEYS,
    DEFAULT_TUTORIAL_PROGRESS,
    getTutorialProgress,
    updateTutorialProgress,
    reactivateTutorial,
    skipTutorial
} = await import('../src/scenes/settingsStore.js');
const {
    TUTORIAL_STEPS,
    TUTORIAL_SECTION_BLOCKING,
    TUTORIAL_CAPTION_BOTTOM_Y
} = await import('../src/scenes/tutorialSteps.js');
const { TutorialManager } = await import('../src/scenes/TutorialManager.js');

// ===== 1. Dados do Guia (Compatibilidade ABO vs Rh e Contaminadas) =====
const aboEntries = getCompatibilityGuideEntries({ rhEnabled: false });
assert.equal(aboEntries.length, 4);
assert.deepEqual(aboEntries.map((e) => e.type), ['A', 'B', 'AB', 'O']);

const rhEntries = getCompatibilityGuideEntries({ rhEnabled: true });
assert.equal(rhEntries.length, 8);
assert.deepEqual(rhEntries.map((e) => e.type), ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
assert.equal(rhEntries.find((e) => e.type === 'AB+').compatibleBags.length, 8);
assert.match(rhEntries.find((e) => e.type === 'AB+').explanation, /Todos os 8 tipos/i);
assert.deepEqual(rhEntries.find((e) => e.type === 'O-').compatibleBags, ['O-']);
assert.deepEqual(rhEntries.find((e) => e.type === 'A-').compatibleBags, ['A-', 'O-']);
assert.match(RH_GUIDE_RULE_SUMMARY, /Rh\+/);
assert.match(RH_GUIDE_RULE_SUMMARY, /Rh−/);

assert.match(CONTAMINATED_SCREENING_INFO.footerNotice, /selo.*perigo/i);
assert.match(CONTAMINATED_SCREENING_INFO.footerNotice, /Cidade 3/i);
assert.match(CONTAMINATED_SCREENING_INFO.footerNotice, /1 coração/i);

// ===== 2. GuidePanel nas Cidades 1, 2 e 3 =====
for (const [cityIndex, expectedRh] of [[0, false], [1, true], [2, true]]) {
    const scene = createMockScene(cityIndex);
    let paused = false;
    let resumed = false;
    const state = {
        isClockRunning: true,
        pause() { paused = true; },
        resume() { resumed = true; }
    };

    const panel = new GuidePanel(scene, state);
    assert.equal(panel.isRhEnabled(), expectedRh, `Cidade ${cityIndex + 1} rhEnabled`);

    // Aba Tipos: ABO + Fator Rh (Anti-D) com assets soltos ligados
    panel.open('tipos');
    assert.equal(paused, true);
    const tiposTexts = panel.contentElements.filter((e) => e.kind === 'text').map((e) => e.text).join(' | ');
    const tiposImages = panel.contentElements.filter((e) => e.kind === 'image').map((e) => e.key);
    assert.match(tiposTexts, /Tipo A/);
    assert.match(tiposTexts, /Fator Rh/);
    assert.match(tiposTexts, /Anti-D/);
    assert.match(tiposTexts, /Rh\+/);
    assert.match(tiposTexts, /Rh−/);
    assert.ok(tiposImages.includes('hemacia-rh-pos'));
    assert.ok(tiposImages.includes('hemacia-rh-neg'));
    assert.ok(tiposImages.includes('anticorpo-anti-d'));

    // Aba Compatibilidade: 4 tipos ABO na Cidade 1; 8 tipos + regra Rh nas Cidades 2 e 3
    panel.selectTab('compatibilidade');
    const compTexts = panel.contentElements.filter((e) => e.kind === 'text').map((e) => e.text).join(' | ');
    if (expectedRh) {
        assert.match(compTexts, /Regra do Rh/);
        assert.match(compTexts, /Paciente A\+/);
        assert.match(compTexts, /Paciente O-/);
        assert.match(compTexts, /Todos os 8 tipos/i);
    } else {
        assert.match(compTexts, /Paciente A/);
        assert.match(compTexts, /Paciente O/);
        assert.ok(!/Paciente O-/.test(compTexts), 'Cidade 1 mostra apenas os 4 tipos ABO');
    }

    // Aba Contaminadas: lista de doencas + miniaturas C+ / C- (selo de perigo)
    panel.selectTab('contaminadas');
    const contTexts = panel.contentElements.filter((e) => e.kind === 'text').map((e) => e.text).join(' | ');
    const contImages = panel.contentElements.filter((e) => e.kind === 'image').map((e) => e.key);
    assert.match(contTexts, /HIV/);
    assert.match(contTexts, /selo amarelo de perigo/i);
    assert.ok(contImages.includes('bolsa-C+'));
    assert.ok(contImages.includes('bolsa-C-'));

    panel.close();
    assert.equal(resumed, true);
    assert.equal(panel.isOpen, false);
}

// ===== 3. Tutorial da Etapa 2 (Cidade 2) sem alterar tutorial do Seu Joaquim =====
assert.ok(TUTORIAL_FLAG_KEYS.includes('minigameFase2Rh'));
assert.equal(DEFAULT_TUTORIAL_PROGRESS.minigameFase2Rh, false);
assert.equal(TUTORIAL_SECTION_BLOCKING.minigameFase2Rh, false);
assert.equal(TUTORIAL_CAPTION_BOTTOM_Y.minigameFase2Rh, 452);

// Tutorial do Seu Joaquim (minigameFase2) segue intacto, sem citar Anti-D ou Rh
assert.equal(TUTORIAL_STEPS.minigameFase2.length, 4);
assert.ok(!TUTORIAL_STEPS.minigameFase2.some((s) => /Anti-D|Rh/i.test(s.text)));

// Legenda da Etapa 2 (Cidade 2) explica Anti-D, Poco 1, aglutinacao = Rh+, liso = Rh-
assert.ok(TUTORIAL_STEPS.minigameFase2Rh.length >= 2);
const rhStepsText = TUTORIAL_STEPS.minigameFase2Rh.map((s) => s.text).join(' ');
assert.match(rhStepsText, /Anti-D/);
assert.match(rhStepsText, /Poço 1/);
assert.match(rhStepsText, /Rh\+/);
assert.match(rhStepsText, /Rh−/);

// Simulacao: jogador ja concluiu o tutorial da Cidade 1 e chega pela 1a vez a Etapa 2 na Cidade 2
storage.clear();
updateTutorialProgress({
    intro: true,
    ocorrenciaInicial: true,
    minigameFase1: true,
    minigameFase2: true,
    minigameFase3: true,
    aposPrimeiroAtendimento: true,
    selecaoCidade: true
});
assert.equal(getTutorialProgress().minigameFase2Rh, false);

const mgScene = createMockScene(1);
const tm = new TutorialManager(mgScene, { depth: 110 });
tm.startMinigamePhase('minigameFase2Rh');
assert.equal(tm.caption.isOpen, true);
assert.equal(tm.caption.blocking, false);
assert.equal(tm.currentSection, 'minigameFase2Rh');

// Avanca todos os passos e conclui a secao
tm.caption.advance();
assert.equal(tm.caption.isOpen, true);
tm.caption.advance();
assert.equal(tm.caption.isOpen, false);
assert.equal(getTutorialProgress().minigameFase2Rh, true);

// Segunda vez nao repete
tm.startMinigamePhase('minigameFase2Rh');
assert.equal(tm.caption.isOpen, false);

// Reativar tutorial volta a flag para false; Pular tutorial marca como true e desliga dicas
reactivateTutorial();
assert.equal(getTutorialProgress().minigameFase2Rh, false);
tm.startMinigamePhase('minigameFase2Rh');
assert.equal(tm.caption.isOpen, true);
tm.skip();
assert.equal(tm.caption.isOpen, false);
assert.equal(getTutorialProgress().minigameFase2Rh, true);
tm.startMinigamePhase('minigameFase2Rh');
assert.equal(tm.caption.isOpen, false);

// skipTutorial tambem marca minigameFase2Rh como true
reactivateTutorial();
skipTutorial();
assert.equal(getTutorialProgress().minigameFase2Rh, true);

console.log('OK: guia com Rh/selo de perigo nas Cidades 1-3 e legenda de tutorial da Etapa 2 (Cidade 2).');
