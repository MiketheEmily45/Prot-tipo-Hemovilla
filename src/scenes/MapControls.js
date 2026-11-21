import { closeCharacterDescription } from './CharacterDescriptionPanel.js';
import { triggerAllCharactersAlert } from './ClickableCharacterManager.js';
import { isDebugEnabled } from './debugTools.js';
import { playSfx, stopMusic } from './AudioManager.js';

export class MapControls {
    constructor(scene) {
        this.scene = scene;
        this.pauseButton = null;
        this.citySelectButton = null;
        this.shopButton = null;
        this.alertButton = null;
    }

    create() {
        const pauseButton = this.createPauseButton();
        const citySelectButton = this.createCitySelectButton(pauseButton);
        const shopButton = this.createShopButton(citySelectButton);
        const alertButton = this.createAlertButton();
        return { pauseButton, citySelectButton, shopButton, alertButton };
    }

    createPauseButton() {
        const pauseButton = this.scene.add.image(8, 8, 'pause-button');
        pauseButton.setOrigin(0);
        pauseButton.setDepth(100);
        if (pauseButton.texture) {
            pauseButton.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        pauseButton.setInteractive({ useHandCursor: true });
        pauseButton.on('pointerdown', () => {
            pauseButton.setTint(0x8B2E40);
        });
        pauseButton.on('pointerout', () => {
            pauseButton.clearTint();
        });
        pauseButton.on('pointerup', () => {
            pauseButton.clearTint();
            playSfx(this.scene, 'clique');
            this.scene.pauseMenu?.open();
        });
        this.pauseButton = pauseButton;
        return pauseButton;
    }

    createCitySelectButton(pauseButton) {
        // Posicionado a direita do botao de pausa (x=8, w=40) com 8 px de espaco: x=56, y=8 (40x40)
        const x = pauseButton ? pauseButton.x + pauseButton.displayWidth + 8 : 56;
        const y = pauseButton ? pauseButton.y : 8;

        const citySelectButton = this.scene.add.image(x, y, 'city-select-button');
        citySelectButton.setOrigin(0);
        citySelectButton.setDepth(100);
        if (citySelectButton.texture) {
            citySelectButton.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        citySelectButton.setInteractive({ useHandCursor: true });
        citySelectButton.on('pointerdown', () => {
            citySelectButton.setTint(0x8B2E40);
        });
        citySelectButton.on('pointerout', () => {
            citySelectButton.clearTint();
        });
        citySelectButton.on('pointerup', () => {
            citySelectButton.clearTint();
            playSfx(this.scene, 'clique');
            closeCharacterDescription(this.scene);
            this.scene.scene.start('CitySelect', {
                currentCityIndex: this.scene.currentCityIndex ?? 0
            });
        });

        this.citySelectButton = citySelectButton;
        return citySelectButton;
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
                playSfx(this.scene, 'clique');
                triggerAllCharactersAlert(this.scene);
            });
        }
        return alertButton;
    }

    createShopButton(citySelectButton) {
        const x = citySelectButton
            ? citySelectButton.x + citySelectButton.displayWidth + 8
            : 104;
        const y = citySelectButton ? citySelectButton.y : 8;
        const shopButton = this.scene.add.image(x, y, 'shop-hud-button');
        shopButton.setOrigin(0);
        shopButton.setDepth(100);
        shopButton.texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);
        shopButton.setInteractive({ useHandCursor: true });
        shopButton.on('pointerdown', () => shopButton.setTint(0x8B2E40));
        shopButton.on('pointerout', () => shopButton.clearTint());
        shopButton.on('pointerup', () => {
            shopButton.clearTint();
            playSfx(this.scene, 'clique');
            closeCharacterDescription(this.scene);
            this.scene.scene.start('Shop', {
                fromScene: 'GameMap',
                returnData: { targetCityIndex: this.scene.currentCityIndex ?? 0 }
            });
        });
        this.shopButton = shopButton;
        return shopButton;
    }
}
