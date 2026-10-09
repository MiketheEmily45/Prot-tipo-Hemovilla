import { openCharacterDescription } from './CharacterDescriptionPanel.js';
import { characterData } from './characterData.js';
import { Character } from './Character.js';
import { AlertManager } from './AlertManager.js';

function getAlertManager(scene) {
    if (!scene.alertManager) {
        scene.alertManager = new AlertManager(scene);
    }
    return scene.alertManager;
}

const maleCharacterIds = new Set(['joaquim', 'caue', 'carlos', 'teo', 'bruno']);
const femaleCharacterIds = new Set(['yasmin', 'beatriz', 'marlene', 'aparecida']);

function getCharacterGender(character) {
    const key = character?.iconButtonKey ?? character?.name ?? character?.sprite?.texture?.key ?? '';

    if (maleCharacterIds.has(key)) {
        return 'male';
    }

    if (femaleCharacterIds.has(key)) {
        return 'female';
    }

    return null;
}

function playCharacterClickSound(scene, character) {
    if (!scene || !scene.sound || typeof scene.sound.play !== 'function') {
        return;
    }

    const gender = getCharacterGender(character);
    if (!gender) {
        return;
    }

    const soundKey = gender === 'male' ? 'masculine-huh' : 'feminine-huh';
    scene.sound.play(soundKey, { volume: 0.8 });
}

export function registerClickableCharacter(scene, config) {
    const character = new Character(scene, config);

    character.sprite.setInteractive({ useHandCursor: true });
    character.sprite.on('pointerdown', () => {
        playCharacterClickSound(scene, character);
        toggleCharacterInteraction(scene, character);
    });
    scene.clickableCharacters.push(character);
    return character;
}

export function toggleCharacterInteraction(scene, character) {
    if (character.isStoppedByClick) {
        character.isStoppedByClick = false;
        character.balloon.destroy();
        character.balloon = null;
        character.miniGameButton.destroy();
        character.miniGameButton = null;
        character.descriptionButton.destroy();
        character.descriptionButton = null;
        character.resume();
        return;
    }

    character.isStoppedByClick = true;
    character.stop();
    character.balloon = scene.add.image(0, 0, 'balao_temporario');
    character.balloon.setDepth(character.sprite.depth + 2);
    createMinigameBalloonButton(scene, character);
    character.descriptionButton = scene.add.image(0, 0, 'botao_descricao');
    character.descriptionButton.setDepth(character.balloon.depth + 1);
    character.descriptionButton.setInteractive({ useHandCursor: true });
    character.descriptionButton.on('pointerdown', () => {
        openCharacterDescription(scene, character.iconButtonKey, characterData);
    });
    updateCharacterBalloonPosition(character);
    updateMiniGameButtonState(character);
}

function createMinigameBalloonButton(scene, character) {
    if (character.miniGameButton) {
        return;
    }

    character.miniGameButton = scene.add.image(0, 0, 'botao_minigame');
    character.miniGameButton.setDepth(character.balloon.depth + 1);
    character.miniGameButton.setInteractive({ useHandCursor: true });
    character.miniGameButton.on('pointerdown', () => {
        if (!character.alertIcon || !character.miniGameButton.input.enabled) return;
        character.miniGameButton.setTint(0x8B2E40);
    });
    character.miniGameButton.on('pointerup', () => {
        if (!character.alertIcon || !character.miniGameButton.input.enabled) return;
        character.miniGameButton.clearTint();
        resetCharacterAlert(scene, character);
        scene.scene.start('Minigame');
    });
}

export function updateCharacterBalloonPosition(character) {
    if (!character.balloon) {
        return;
    }

    character.balloon.setPosition(
        character.sprite.x + character.balloonOffset.x,
        character.sprite.y + character.balloonOffset.y
    );
    character.descriptionButton?.setPosition(character.balloon.x - 22, character.balloon.y);
    character.miniGameButton?.setPosition(character.balloon.x + 22, character.balloon.y);
}

export function updateCharacterAlert(scene, character, time) {
    getAlertManager(scene).updateCharacterAlert(character, time);
}

export function resetCharacterAlert(scene, character) {
    getAlertManager(scene).resetCharacterAlert(character);
}

export function updateCharacterIndicators(scene, time) {
    if (!scene.clickableCharacters) {
        return;
    }

    scene.clickableCharacters.forEach((character) => {
        updateCharacterBalloonPosition(character);
        updateCharacterAlert(scene, character, time);
    });
}

export function triggerAllCharactersAlert(scene, time) {
    getAlertManager(scene).triggerAll();
}

function updateMiniGameButtonState(character) {
    if (!character || !character.scene) return;
    getAlertManager(character.scene).updateMiniGameButtonState(character);
}

function playAlertSound(scene) {
    getAlertManager(scene).playAlertSound();
}

export function updateIconButtonTint(scene, iconButtonKey) {
    getAlertManager(scene).updateIconButtonTint(iconButtonKey);
}
