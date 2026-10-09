import { closeCharacterDescription } from './CharacterDescriptionPanel.js';
import { triggerAllCharactersAlert } from './ClickableCharacterManager.js';

export class MapControls {
    constructor(scene) {
        this.scene = scene;
        this.pauseButton = null;
        this.alertButton = null;
    }

    create() {
        const pauseButton = this.createPauseButton();
        const alertButton = this.createAlertButton();
        return { pauseButton, alertButton };
    }

    createPauseButton() {
        const pauseButton = this.scene.add.image(8, 8, 'pause-button');
        pauseButton.setOrigin(0);
        pauseButton.setDepth(100);
        pauseButton.setInteractive({ useHandCursor: true });
        pauseButton.on('pointerdown', () => {
            pauseButton.setTint(0x8B2E40);
        });
        pauseButton.on('pointerup', () => {
            pauseButton.clearTint();
            closeCharacterDescription(this.scene);
            this.scene.scene.start('Start');
        });
        this.pauseButton = pauseButton;
        return pauseButton;
    }

    createAlertButton() {
        const alertButton = this.scene.add.image(8, 600, 'alert-button');
        this.scene.alertButton = alertButton;
        this.alertButton = alertButton;
        alertButton.setOrigin(0, 1);
        alertButton.setDepth(100);
        alertButton.setInteractive({ useHandCursor: true });
        alertButton.on('pointerdown', () => {
            alertButton.setTint(0x8B2E40);
        });
        alertButton.on('pointerup', () => {
            alertButton.clearTint();
            triggerAllCharactersAlert(this.scene);
        });
        return alertButton;
    }
}
