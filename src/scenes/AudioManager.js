// Gerenciador central de audio (efeitos sonoros e musica) integrado com settingsStore.
import { getSettings } from './settingsStore.js';

// Tabela unica de caminhos de musica.
export const MUSIC_ASSETS = Object.freeze({
    'start-music': 'assets/Musica/MenuMusic.mp3',
    'city-music': 'assets/Musica/CityMusic.wav'
});

// Tabela unica de caminhos de efeitos sonoros (SFX).
export const SFX_ASSETS = Object.freeze({
    acerto: 'assets/SFX/acerto.wav',
    bloqueado: 'assets/SFX/bloqueado.wav',
    clique: 'assets/SFX/clique.wav',
    coleta_bolsa: 'assets/SFX/coleta_bolsa.wav',
    compra: 'assets/SFX/compra.wav',
    derrota: 'assets/SFX/derrota.wav',
    erro: 'assets/SFX/erro.wav',
    transfusao: 'assets/SFX/transfusao.wav',
    vitoria: 'assets/SFX/vitoria.wav',
    'alert-sound': 'assets/SFX/som_alerta.mp3',
    'masculine-huh': 'assets/SFX/MasculineHuh.mp3',
    'feminine-huh': 'assets/SFX/FeminineHuh.mp3'
});

// Tabela de volume base por musica em um unico lugar para ajuste de ouvido.
export const MUSIC_BASE_VOLUMES = Object.freeze({
    'start-music': 1.0,
    'city-music': 0.5
});

export const DEFAULT_MUSIC_BASE_VOLUME = 1.0;

// Tabela de volume base por som em um unico lugar para ajuste de ouvido.
// Os WAVs novos sao baixos e desiguais: vitoria ~10%, clique ~18%, demais ~25-33%.
export const SFX_BASE_VOLUMES = Object.freeze({
    vitoria: 1.0,
    clique: 0.9,
    acerto: 0.8,
    bloqueado: 0.7,
    coleta_bolsa: 0.8,
    compra: 0.8,
    derrota: 0.8,
    erro: 0.8,
    transfusao: 0.8,
    'alert-sound': 0.8,
    'masculine-huh': 0.2,
    'feminine-huh': 0.8
});

export const DEFAULT_SFX_BASE_VOLUME = 0.8;

// Ponto unico para mapear a musica de cada cena (expansivel quando chegarem novas musicas).
export const SCENE_MUSIC_KEYS = Object.freeze({
    Start: 'start-music',
    ConfigMenu: 'start-music',
    GameMap: 'city-music',
    CitySelect: 'city-music',
    Minigame: null
});

class AudioManager {
    constructor() {
        this.currentMusicKey = null;
        this.currentMusicSound = null;
        this.boundGame = null;
    }

    preloadAudio(scene) {
        if (!scene || !scene.load) return;

        Object.entries(MUSIC_ASSETS).forEach(([key, path]) => {
            if (!scene.cache?.audio?.exists(key)) {
                scene.load.audio(key, path);
            }
        });

        Object.entries(SFX_ASSETS).forEach(([key, path]) => {
            if (!scene.cache?.audio?.exists(key)) {
                scene.load.audio(key, path);
            }
        });
    }

    ensureGameListener(scene) {
        const game = scene?.game || (typeof window !== 'undefined' ? window.__PHASER_GAME__ : null);
        if (!game || !game.events || this.boundGame === game) {
            return;
        }

        this.boundGame = game;
        game.events.on('settings-changed', (settings) => {
            if (settings && typeof settings.musicVolume === 'number') {
                this.updateMusicVolume(settings.musicVolume, scene);
            }
        });
    }

    playSfx(scene, key, config = {}) {
        if (!scene || !scene.sound || typeof scene.sound.play !== 'function' || !key) {
            return false;
        }

        this.ensureGameListener(scene);

        const { sfxVolume } = getSettings();
        const safeSfxVolume = typeof sfxVolume === 'number' && !Number.isNaN(sfxVolume)
            ? Math.max(0, Math.min(1, sfxVolume))
            : 0;

        const baseVolume = key in SFX_BASE_VOLUMES
            ? SFX_BASE_VOLUMES[key]
            : DEFAULT_SFX_BASE_VOLUME;

        const configVolume = config && typeof config.volume === 'number' && !Number.isNaN(config.volume)
            ? config.volume
            : 1;

        // O Web Audio API do Phaser suporta valores acima de 1.0 (amplificacao no GainNode)
        // caso o Mateus queira aumentar sons muito baixos na tabela SFX_BASE_VOLUMES.
        const finalVolume = Math.max(0, baseVolume * configVolume * safeSfxVolume);

        // Volume 0 nao gera erro e evita tocar som mudo desnecessariamente.
        if (finalVolume <= 0) {
            return false;
        }

        if (scene.cache?.audio && !scene.cache.audio.exists(key)) {
            return false;
        }

        try {
            return scene.sound.play(key, {
                ...config,
                volume: finalVolume
            });
        } catch (error) {
            return false;
        }
    }

    getMusicBaseVolume(key) {
        if (key && key in MUSIC_BASE_VOLUMES) {
            return MUSIC_BASE_VOLUMES[key];
        }
        return DEFAULT_MUSIC_BASE_VOLUME;
    }

    playMusic(scene, key, config = {}) {
        if (!scene || !scene.sound || !key) {
            return null;
        }

        this.ensureGameListener(scene);

        const { musicVolume } = getSettings();
        const safeMusicVolume = typeof musicVolume === 'number' && !Number.isNaN(musicVolume)
            ? Math.max(0, Math.min(1, musicVolume))
            : 0;

        const baseVolume = this.getMusicBaseVolume(key);
        const configVolume = config && typeof config.volume === 'number' && !Number.isNaN(config.volume)
            ? config.volume
            : 1;
        const finalVolume = Math.max(0, baseVolume * configVolume * safeMusicVolume);

        if (this.currentMusicKey && this.currentMusicKey !== key) {
            this.stopMusic(scene);
        }

        let music = scene.sound.get(key);
        if (music) {
            if (typeof music.setVolume === 'function') {
                music.setVolume(finalVolume);
            }
            if (!music.isPlaying) {
                music.play({
                    loop: true,
                    ...config,
                    volume: finalVolume
                });
            }
        } else {
            if (scene.cache?.audio && !scene.cache.audio.exists(key)) {
                return null;
            }
            music = scene.sound.add(key, {
                loop: true,
                ...config,
                volume: finalVolume
            });
            music.play();
        }

        this.currentMusicKey = key;
        this.currentMusicSound = music;
        return music;
    }

    playSceneMusic(scene, sceneKey = null) {
        const resolvedSceneKey = sceneKey || scene?.sys?.settings?.key;
        const musicKey = resolvedSceneKey ? SCENE_MUSIC_KEYS[resolvedSceneKey] : null;
        if (!musicKey) {
            return null;
        }
        return this.playMusic(scene, musicKey);
    }

    updateMusicVolume(volume = null, scene = null) {
        const rawVolume = typeof volume === 'number' && !Number.isNaN(volume)
            ? volume
            : getSettings().musicVolume;
        const safeVolume = Math.max(0, Math.min(1, rawVolume));
        const baseVolume = this.getMusicBaseVolume(this.currentMusicKey);
        const finalVolume = Math.max(0, baseVolume * safeVolume);

        if (this.currentMusicSound && typeof this.currentMusicSound.setVolume === 'function') {
            this.currentMusicSound.setVolume(finalVolume);
        }

        const soundManager = scene?.sound || this.boundGame?.sound;
        if (soundManager && this.currentMusicKey && typeof soundManager.get === 'function') {
            const soundInstance = soundManager.get(this.currentMusicKey);
            if (soundInstance && typeof soundInstance.setVolume === 'function') {
                soundInstance.setVolume(finalVolume);
                this.currentMusicSound = soundInstance;
            }
        }
    }

    stopMusic(scene = null, key = null) {
        const targetKey = key || this.currentMusicKey;
        const soundManager = scene?.sound || this.boundGame?.sound;

        if (soundManager && targetKey && typeof soundManager.stopByKey === 'function') {
            soundManager.stopByKey(targetKey);
        } else if (this.currentMusicSound && typeof this.currentMusicSound.stop === 'function') {
            this.currentMusicSound.stop();
        }

        if (!key || key === this.currentMusicKey) {
            this.currentMusicSound = null;
            this.currentMusicKey = null;
        }
    }
}

export const audioManager = new AudioManager();

export function preloadAudio(scene) {
    audioManager.preloadAudio(scene);
}

export function playSfx(scene, key, config = {}) {
    return audioManager.playSfx(scene, key, config);
}

export function playMusic(scene, key, config = {}) {
    return audioManager.playMusic(scene, key, config);
}

export function playSceneMusic(scene, sceneKey = null) {
    return audioManager.playSceneMusic(scene, sceneKey);
}

export function stopMusic(scene = null, key = null) {
    audioManager.stopMusic(scene, key);
}

export function updateMusicVolume(volume = null, scene = null) {
    audioManager.updateMusicVolume(volume, scene);
}
