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

    updateCharacterAlert(character, time) {
        if (!character.alertInterval) {
            return;
        }

        // Quando o tempo configurado termina, cria o icone uma unica vez.
        if (!character.alertIcon && time >= character.nextAlertTime) {
            character.alertIcon = this.scene.add.image(0, 0, 'icone_alerta');
            character.alertIcon.setDepth(character.sprite.depth + 1);
            this.playAlertSound();

            if (character.iconButtonKey) {
                this.scene.alertedIconKeys.add(character.iconButtonKey);
                this.updateIconButtonTint(character.iconButtonKey);
            }
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
        if (!character.alertIcon) {
            this.updateMiniGameButtonState(character);
            return;
        }

        // Ao clicar no botao do minigame, remove o icone e reinicia a contagem.
        character.alertIcon.destroy();
        character.alertIcon = null;
        character.nextAlertTime = this.scene.time.now + character.alertInterval;

        if (character.iconButtonKey) {
            this.scene.alertedIconKeys.delete(character.iconButtonKey);
            this.updateIconButtonTint(character.iconButtonKey);
        }

        this.updateMiniGameButtonState(character);
    }

    triggerAll() {
        if (!this.scene.clickableCharacters) {
            return;
        }

        this.scene.clickableCharacters.forEach((character) => {
            character.nextAlertTime = this.scene.time.now;
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
