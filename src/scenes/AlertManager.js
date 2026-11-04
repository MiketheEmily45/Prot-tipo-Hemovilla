import { triggerAllInCity } from './occurrenceState.js';

export class AlertManager {
    constructor(scene) {
        this.scene = scene;
    }

    update(time) {
        if (!this.scene.clickableCharacters) {
            return;
        }

        this.scene.clickableCharacters.forEach((character) => {
            this.updateCharacterAlert(character, time);
        });
    }

    applyAlert(character, silent = false) {
        if (!character) return;

        if (!character.alertIcon) {
            character.alertIcon = this.scene.add.image(0, 0, 'icone_alerta');
            character.alertIcon.setDepth(character.sprite.depth + 1);
            if (!silent) {
                this.playAlertSound();
            }

            if (character.iconButtonKey) {
                this.scene.alertedIconKeys?.add(character.iconButtonKey);
                this.updateIconButtonTint(character.iconButtonKey);
            }

            character.stop?.();
        }

        if (character.miniGameButton) {
            this.updateMiniGameButtonState(character);
        }

        if (character.alertIcon) {
            character.alertIcon.setVisible(true);
            character.alertIcon.setPosition(
                character.sprite.x + character.alertOffset.x,
                character.sprite.y + character.alertOffset.y
            );
        }
    }

    removeAlert(character) {
        if (!character) return;

        if (character.alertIcon) {
            character.alertIcon.destroy();
            character.alertIcon = null;
        }

        if (character.iconButtonKey) {
            this.scene.alertedIconKeys?.delete(character.iconButtonKey);
            this.updateIconButtonTint(character.iconButtonKey);
        }

        if (character.miniGameButton) {
            this.updateMiniGameButtonState(character);
        }

        if (!character.isStoppedByClick) {
            character.resume?.();
        }
    }

    updateCharacterAlert(character, time) {
        if (!character) {
            return;
        }

        if (character.miniGameButton) {
            this.updateMiniGameButtonState(character);
        }

        if (character.alertIcon) {
            character.alertIcon.setVisible(true);
            character.alertIcon.setPosition(
                character.sprite.x + character.alertOffset.x,
                character.sprite.y + character.alertOffset.y
            );
        }
    }

    resetCharacterAlert(character) {
        this.removeAlert(character);
    }

    triggerAll() {
        if (!this.scene.clickableCharacters) {
            return;
        }

        const cityIndex = this.scene.currentCityIndex ?? 0;
        triggerAllInCity(cityIndex);

        this.scene.clickableCharacters.forEach((character) => {
            this.applyAlert(character, false);
        });
    }

    updateMiniGameButtonState(character) {
        if (!character.miniGameButton) {
            return;
        }

        if (character.alertIcon) {
            character.miniGameButton.input.enabled = true;
            character.miniGameButton.clearTint();
            character.miniGameButton.setAlpha(1);
            return;
        }

        character.miniGameButton.setTint(0x9ca3af);
        character.miniGameButton.input.enabled = false;
        character.miniGameButton.setAlpha(0.8);
    }

    playAlertSound() {
        if (!this.scene || !this.scene.sound || typeof this.scene.sound.play !== 'function') {
            return;
        }

        this.scene.sound.play('alert-sound', { volume: 0.8 });
    }

    updateIconButtonTint(iconButtonKey) {
        const iconButton = this.scene.characterIconButtons && this.scene.characterIconButtons[iconButtonKey];

        if (!iconButton) {
            return;
        }

        if (this.scene.alertedIconKeys && this.scene.alertedIconKeys.has(iconButtonKey)) {
            iconButton.setTint(0xff5555);
            return;
        }

        iconButton.clearTint();
    }
}
