// Gerencia personagens clicaveis: baloes temporarios, icones de alerta,
// interacoes ao clicar e atualizacoes de posicao.
import { openCharacterDescription } from './CharacterDescriptionPanel.js';
import { characterData } from './characterData.js';
import { Character } from './Character.js';
import { AlertManager } from './AlertManager.js';

export class ClickableCharacterManager {
    static maleCharacterIds = new Set(['joaquim', 'caue', 'carlos', 'teo', 'bruno']);
    static femaleCharacterIds = new Set(['yasmin', 'beatriz', 'marlene', 'aparecida']);

    constructor(scene) {
        this.scene = scene;
        if (!scene.clickableCharacters) {
            scene.clickableCharacters = [];
        }
    }

    getAlertManager() {
        if (!this.scene.alertManager) {
            this.scene.alertManager = new AlertManager(this.scene);
        }
        return this.scene.alertManager;
    }

    getCharacterGender(character) {
        const key = character?.iconButtonKey ?? character?.name ?? character?.sprite?.texture?.key ?? '';

        if (ClickableCharacterManager.maleCharacterIds.has(key)) {
            return 'male';
        }

        if (ClickableCharacterManager.femaleCharacterIds.has(key)) {
            return 'female';
        }

        return null;
    }

    playCharacterClickSound(character) {
        const scene = this.scene;
        if (!scene || !scene.sound || typeof scene.sound.play !== 'function') {
            return;
        }

        const gender = this.getCharacterGender(character);
        if (!gender) {
            return;
        }

        const soundKey = gender === 'male' ? 'masculine-huh' : 'feminine-huh';
        scene.sound.play(soundKey, { volume: 0.8 });
    }

    register(config) {
        const character = new Character(this.scene, config);

        character.sprite.setInteractive({ useHandCursor: true });
        character.sprite.on('pointerdown', () => {
            this.playCharacterClickSound(character);
            this.toggleInteraction(character);
        });

        this.scene.clickableCharacters.push(character);
        return character;
    }

    toggleInteraction(character) {
        const scene = this.scene;
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
        this.createMinigameBalloonButton(character);
        character.descriptionButton = scene.add.image(0, 0, 'botao_descricao');
        character.descriptionButton.setDepth(character.balloon.depth + 1);
        character.descriptionButton.setInteractive({ useHandCursor: true });
        character.descriptionButton.on('pointerdown', () => {
            openCharacterDescription(scene, character.iconButtonKey, characterData);
        });
        this.updateBalloonPosition(character);
        this.getAlertManager().updateMiniGameButtonState(character);
    }

    createMinigameBalloonButton(character) {
        const scene = this.scene;
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
            this.getAlertManager().resetCharacterAlert(character);
            scene.scene.start('Minigame');
        });
    }

    updateBalloonPosition(character) {
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

    updateIndicators(time) {
        if (!this.scene.clickableCharacters) {
            return;
        }

        this.scene.clickableCharacters.forEach((character) => {
            this.updateBalloonPosition(character);
            this.getAlertManager().updateCharacterAlert(character, time);
        });
    }
}

// ========== Funções de compatibilidade ==========

function getManager(scene) {
    if (!scene.clickableCharacterManager) {
        scene.clickableCharacterManager = new ClickableCharacterManager(scene);
    }
    return scene.clickableCharacterManager;
}

export function registerClickableCharacter(scene, config) {
    return getManager(scene).register(config);
}

export function toggleCharacterInteraction(scene, character) {
    getManager(scene).toggleInteraction(character);
}

export function updateCharacterBalloonPosition(character) {
    if (character?.scene) {
        getManager(character.scene).updateBalloonPosition(character);
    } else if (character?.balloon) {
        character.balloon.setPosition(
            character.sprite.x + character.balloonOffset.x,
            character.sprite.y + character.balloonOffset.y
        );
        character.descriptionButton?.setPosition(character.balloon.x - 22, character.balloon.y);
        character.miniGameButton?.setPosition(character.balloon.x + 22, character.balloon.y);
    }
}

export function updateCharacterIndicators(scene, time) {
    getManager(scene).updateIndicators(time);
}

export function updateCharacterAlert(scene, character, time) {
    getManager(scene).getAlertManager().updateCharacterAlert(character, time);
}

export function resetCharacterAlert(scene, character) {
    getManager(scene).getAlertManager().resetCharacterAlert(character);
}

export function triggerAllCharactersAlert(scene, time) {
    getManager(scene).getAlertManager().triggerAll();
}

export function updateIconButtonTint(scene, iconButtonKey) {
    getManager(scene).getAlertManager().updateIconButtonTint(iconButtonKey);
}
