import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const storage = new Map();
globalThis.window = {
    localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value))
    }
};

const { getSettings, saveSettings } = await import('../src/scenes/settingsStore.js');
const { playMusic, playSfx } = await import('../src/scenes/AudioManager.js');

const sounds = new Map();
const sfxCalls = [];
const game = { events: new EventEmitter() };
const scene = {
    game,
    cache: { audio: { exists: () => true } },
    sound: {
        get: (key) => sounds.get(key) ?? null,
        add: (key, config) => {
            const sound = {
                key,
                volume: config.volume,
                isPlaying: false,
                setVolume(value) { this.volume = value; },
                play() { this.isPlaying = true; }
            };
            sounds.set(key, sound);
            return sound;
        },
        play: (key, config) => {
            sfxCalls.push({ key, config });
            return true;
        }
    }
};

saveSettings({ musicVolume: 0.65, sfxVolume: 0.7, musicMuted: false, sfxMuted: false }, game);
const music = playMusic(scene, 'start-music');
assert.equal(music.volume, 0.65);

saveSettings({ musicMuted: true }, game);
assert.equal(music.volume, 0);
playSfx(scene, 'clique');
assert.equal(sfxCalls.at(-1).config.volume, 0.9 * 0.7);
assert.equal(getSettings().sfxVolume, 0.7);

saveSettings({ sfxMuted: true }, game);
const sfxCallsBeforeMute = sfxCalls.length;
assert.equal(playSfx(scene, 'clique'), false);
assert.equal(sfxCalls.length, sfxCallsBeforeMute);

saveSettings({ musicMuted: false }, game);
assert.equal(music.volume, 0.65);
