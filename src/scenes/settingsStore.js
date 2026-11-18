// Armazenamento das configuracoes do jogo em um unico registro no localStorage.
export const SETTINGS_STORAGE_KEY = 'hemovilla-settings';

export const DEFAULT_SETTINGS = Object.freeze({
    musicVolume: 0.5,
    sfxVolume: 0.7,
    tutorialHintsEnabled: true
});

function clampVolume(value, fallback) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
    }
    const clamped = Math.max(0, Math.min(1, value));
    return Math.round(clamped * 20) / 20;
}

export function getSettings() {
    try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_SETTINGS };
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return { ...DEFAULT_SETTINGS };
        }
        return {
            musicVolume: clampVolume(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
            sfxVolume: clampVolume(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
            tutorialHintsEnabled: typeof parsed.tutorialHintsEnabled === 'boolean'
                ? parsed.tutorialHintsEnabled
                : DEFAULT_SETTINGS.tutorialHintsEnabled
        };
    } catch (error) {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(partialSettings, game = null) {
    const current = getSettings();
    const updated = {
        musicVolume: partialSettings && 'musicVolume' in partialSettings
            ? clampVolume(partialSettings.musicVolume, current.musicVolume)
            : current.musicVolume,
        sfxVolume: partialSettings && 'sfxVolume' in partialSettings
            ? clampVolume(partialSettings.sfxVolume, current.sfxVolume)
            : current.sfxVolume,
        tutorialHintsEnabled: partialSettings && typeof partialSettings.tutorialHintsEnabled === 'boolean'
            ? partialSettings.tutorialHintsEnabled
            : current.tutorialHintsEnabled
    };

    try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        // Ignora erro caso localStorage esteja indisponivel.
    }

    const targetGame = game || (typeof window !== 'undefined' ? window.__PHASER_GAME__ : null);
    if (targetGame && targetGame.events) {
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
