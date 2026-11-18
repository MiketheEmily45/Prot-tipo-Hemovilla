// Armazenamento das configuracoes do jogo em um unico registro no localStorage.
export const SETTINGS_STORAGE_KEY = 'hemovilla-settings';

// Secoes do tutorial. Cada uma e um flag simples ("ja foi vista").
export const TUTORIAL_FLAG_KEYS = Object.freeze([
    'intro',
    'ocorrenciaInicial',
    'minigameFase1',
    'minigameFase2',
    'minigameFase3',
    'aposPrimeiroAtendimento',
    'selecaoCidade'
]);

// Progresso do tutorial: flags por secao + passo atual da introducao (0 a 3), para retomar.
export const DEFAULT_TUTORIAL_PROGRESS = Object.freeze({
    intro: false,
    ocorrenciaInicial: false,
    minigameFase1: false,
    minigameFase2: false,
    minigameFase3: false,
    aposPrimeiroAtendimento: false,
    selecaoCidade: false,
    introStep: 0
});

export const DEFAULT_SETTINGS = Object.freeze({
    musicVolume: 0.5,
    sfxVolume: 0.7,
    tutorialHintsEnabled: true,
    tutorialProgress: DEFAULT_TUTORIAL_PROGRESS
});

// Copia usada quando o localStorage nao esta disponivel (vale so ate fechar o jogo).
let memoryRecord = null;

function clampVolume(value, fallback) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
    }
    const clamped = Math.max(0, Math.min(1, value));
    return Math.round(clamped * 20) / 20;
}

function sanitizeTutorialProgress(raw, fallback = DEFAULT_TUTORIAL_PROGRESS) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const progress = {};
    TUTORIAL_FLAG_KEYS.forEach((key) => {
        progress[key] = typeof source[key] === 'boolean' ? source[key] : fallback[key];
    });
    const step = Number.isInteger(source.introStep) ? source.introStep : fallback.introStep;
    progress.introStep = Math.max(0, Math.min(3, step));
    return progress;
}

function readRecord() {
    try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
        return null;
    } catch (error) {
        return memoryRecord;
    }
}

function normalizeRecord(parsed) {
    if (!parsed) {
        return { ...DEFAULT_SETTINGS, tutorialProgress: { ...DEFAULT_TUTORIAL_PROGRESS } };
    }
    return {
        musicVolume: clampVolume(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
        sfxVolume: clampVolume(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
        tutorialHintsEnabled: typeof parsed.tutorialHintsEnabled === 'boolean'
            ? parsed.tutorialHintsEnabled
            : DEFAULT_SETTINGS.tutorialHintsEnabled,
        tutorialProgress: sanitizeTutorialProgress(parsed.tutorialProgress)
    };
}

export function getSettings() {
    return normalizeRecord(readRecord());
}

export function saveSettings(partialSettings, game = null) {
    const current = getSettings();
    const partial = partialSettings || {};
    const updated = {
        musicVolume: 'musicVolume' in partial
            ? clampVolume(partial.musicVolume, current.musicVolume)
            : current.musicVolume,
        sfxVolume: 'sfxVolume' in partial
            ? clampVolume(partial.sfxVolume, current.sfxVolume)
            : current.sfxVolume,
        tutorialHintsEnabled: typeof partial.tutorialHintsEnabled === 'boolean'
            ? partial.tutorialHintsEnabled
            : current.tutorialHintsEnabled,
        tutorialProgress: partial.tutorialProgress
            ? sanitizeTutorialProgress(partial.tutorialProgress, current.tutorialProgress)
            : current.tutorialProgress
    };

    memoryRecord = updated;
    try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        // Ignora erro caso localStorage esteja indisponivel.
    }

    // Avancos de passo do tutorial nao mexem em som: nao precisam avisar o resto do jogo.
    const onlyTutorialProgress = Object.keys(partial).every((key) => key === 'tutorialProgress');
    const targetGame = game || (typeof window !== 'undefined' ? window.__PHASER_GAME__ : null);
    if (!onlyTutorialProgress && targetGame && targetGame.events) {
        targetGame.events.emit('settings-changed', updated);
    }

    return updated;
}

export function restoreDefaultVolumes(game = null) {
    return saveSettings({
        musicVolume: DEFAULT_SETTINGS.musicVolume,
        sfxVolume: DEFAULT_SETTINGS.sfxVolume
    }, game);
}

// ===== Tutorial (fica nas configuracoes, nao no save de progresso) =====

export function getTutorialProgress() {
    return getSettings().tutorialProgress;
}

export function updateTutorialProgress(partialProgress, game = null) {
    const current = getSettings().tutorialProgress;
    return saveSettings({ tutorialProgress: { ...current, ...partialProgress } }, game).tutorialProgress;
}

// Botao TUTORIAL das configuracoes: limpa todas as flags e religa as dicas.
export function reactivateTutorial(game = null) {
    return saveSettings({
        tutorialHintsEnabled: true,
        tutorialProgress: { ...DEFAULT_TUTORIAL_PROGRESS }
    }, game);
}

// "Pular tutorial": marca tudo como visto e desliga as dicas.
export function skipTutorial(game = null) {
    const progress = { introStep: 3 };
    TUTORIAL_FLAG_KEYS.forEach((key) => { progress[key] = true; });
    return saveSettings({ tutorialHintsEnabled: false, tutorialProgress: progress }, game);
}
