import { closeCharacterDescription } from './CharacterDescriptionPanel.js';
import { triggerAllCharactersAlert } from './ClickableCharacterManager.js';
import { isDebugEnabled } from './debugTools.js';
import { createTextStyle } from './textUtils.js';

export class MapControls {
    constructor(scene) {
        this.scene = scene;
        this.pauseButton = null;
        this.citySelectButton = null;
        this.alertButton = null;
    }

    create() {
        const pauseButton = this.createPauseButton();
        const citySelectButton = this.createCitySelectButton(pauseButton);
        const alertButton = this.createAlertButton();
        return { pauseButton, citySelectButton, alertButton };
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

    createCitySelectButton(pauseButton) {
        // Posicionado a direita do botao de pausa (x=8, w=40) com 8 px de espaco: x=56, y=8, w=80, h=40
        const x = 56;
        const y = 8;
        const width = 80;
        const height = 40;

        const bg = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0x1e293b);
        bg.setStrokeStyle(1.5, 0x38bdf8);
        bg.setOrigin(0.5);
        bg.setDepth(100);
        bg.setInteractive({ useHandCursor: true });

        const label = this.scene.add.text(x + width / 2, y + height / 2, 'Cidades', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff'
        })).setOrigin(0.5).setDepth(101);

        bg.on('pointerdown', () => bg.setFillStyle(0x0f172a));
        bg.on('pointerout', () => bg.setFillStyle(0x1e293b));
        bg.on('pointerup', () => {
            bg.setFillStyle(0x1e293b);
            closeCharacterDescription(this.scene);
            this.scene.scene.start('CitySelect', {
                currentCityIndex: this.scene.currentCityIndex ?? 0
            });
        });

        this.citySelectButton = bg;
        this.citySelectLabel = label;
        return { bg, label };
    }

    createAlertButton() {
        const isDebug = isDebugEnabled();
        const alertButton = this.scene.add.image(8, 600, 'alert-button');
        this.scene.alertButton = alertButton;
        this.alertButton = alertButton;
        alertButton.setOrigin(0, 1);
        alertButton.setDepth(100);
        alertButton.setVisible(isDebug);
        if (isDebug) {
            alertButton.setInteractive({ useHandCursor: true });
            alertButton.on('pointerdown', () => {
                alertButton.setTint(0x8B2E40);
            });
            alertButton.on('pointerup', () => {
                alertButton.clearTint();
                triggerAllCharactersAlert(this.scene);
            });
        }
        return alertButton;
    }
}
