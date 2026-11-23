import { closeCharacterDescription } from './CharacterDescriptionPanel.js';
import { triggerAllCharactersAlert } from './ClickableCharacterManager.js';
import { isDebugEnabled } from './debugTools.js';
import { playSfx, stopMusic } from './AudioManager.js';
import { GREEN_BUTTON_COLORS } from './GreenButton.js';
import { createTextStyle } from './textUtils.js';
import { shouldFreezeOccurrenceClocks } from './tutorialState.js';
import { getQuizCooldownRemainingSeconds, getQuizProgressDisplay } from './quizLogic.js';

const HUD_GREEN_TEXTURE_KEY = 'hud-green-btn';
const SHOP_HUD_WIDTH = 60;
const SHOP_HUD_HEIGHT = 40;
const QUIZ_HUD_WIDTH = 86;

function ensureHudGreenTexture(scene, width, height) {
    const textures = scene?.textures;
    if (!textures || typeof textures.createCanvas !== 'function') {
        return null;
    }
    const key = `${HUD_GREEN_TEXTURE_KEY}-${width}x${height}`;
    if (textures.exists(key)) {
        return key;
    }
    const canvasTex = textures.createCanvas(key, width, height);
    const ctx = canvasTex?.getContext?.();
    if (!ctx) {
        return null;
    }
    ctx.imageSmoothingEnabled = false;

    // Borda preta de 2 px, preenchimento verde e cantos escuros em L no padrao de botao_pausa e escolher_cidade.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = GREEN_BUTTON_COLORS.FILL;
    ctx.fillRect(2, 2, width - 4, height - 4);

    ctx.fillStyle = GREEN_BUTTON_COLORS.CORNER;
    // Superior esquerdo
    ctx.fillRect(2, 2, 5, 2);
    ctx.fillRect(2, 4, 2, 3);
    // Superior direito
    ctx.fillRect(width - 7, 2, 5, 2);
    ctx.fillRect(width - 4, 4, 2, 3);
    // Inferior esquerdo
    ctx.fillRect(2, height - 4, 5, 2);
    ctx.fillRect(2, height - 7, 2, 3);
    // Inferior direito
    ctx.fillRect(width - 7, height - 4, 5, 2);
    ctx.fillRect(width - 4, height - 7, 2, 3);

    canvasTex.refresh();
    if (typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode?.NEAREST !== undefined) {
        canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    return key;
}

export class MapControls {
    constructor(scene) {
        this.scene = scene;
        this.pauseButton = null;
        this.citySelectButton = null;
        this.shopButton = null;
        this.quizButton = null;
        this.alertButton = null;
    }

    create() {
        const pauseButton = this.createPauseButton();
        const citySelectButton = this.createCitySelectButton(pauseButton);
        const shopButton = this.createShopButton(citySelectButton);
        const quizButton = this.createQuizButton(shopButton);
        const alertButton = this.createAlertButton();
        this.updateQuizButtonState();
        return { pauseButton, citySelectButton, shopButton, quizButton, alertButton };
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
        const height = Math.round(citySelectButton?.displayHeight || SHOP_HUD_HEIGHT);
        const width = SHOP_HUD_WIDTH;

        const textureKey = ensureHudGreenTexture(this.scene, width, height);
        const shopButton = textureKey
            ? this.scene.add.image(x, y, textureKey).setOrigin(0).setDepth(100)
            : this.scene.add.rectangle(x, y, width, height, 0x6c940f).setOrigin(0).setDepth(100);
        shopButton.setInteractive({ useHandCursor: true });

        const label = this.scene.add.text(
            Math.round(x + width / 2),
            Math.round(y + height / 2),
            'LOJA',
            createTextStyle({
                fontFamily: 'monospace',
                fontSize: '15px',
                fontStyle: 'bold',
                color: GREEN_BUTTON_COLORS.TEXT,
                align: 'center'
            })
        ).setOrigin(0.5).setDepth(101);

        let isPressed = false;
        const clearPressed = () => {
            isPressed = false;
            shopButton.clearTint?.();
            label.clearTint?.();
        };

        shopButton.on('pointerdown', () => {
            isPressed = true;
            shopButton.setTint?.(GREEN_BUTTON_COLORS.PRESSED_TINT);
            label.setTint?.(GREEN_BUTTON_COLORS.PRESSED_TINT);
        });
        shopButton.on('pointerout', () => {
            clearPressed();
        });
        shopButton.on('pointerup', () => {
            const shouldTrigger = isPressed;
            clearPressed();
            if (!shouldTrigger) return;
            playSfx(this.scene, 'clique');
            closeCharacterDescription(this.scene);
            this.scene.scene.start('Shop', {
                fromScene: 'GameMap',
                returnData: { targetCityIndex: this.scene.currentCityIndex ?? 0 }
            });
        });

        this.shopButton = shopButton;
        this.shopButtonLabel = label;
        return shopButton;
    }

    createQuizButton(shopButton) {
        const leftX = shopButton
            ? shopButton.x + (shopButton.displayWidth || SHOP_HUD_WIDTH) + 8
            : 172;
        const topY = shopButton ? shopButton.y : 8;
        const height = Math.round(shopButton?.displayHeight || SHOP_HUD_HEIGHT);
        const width = QUIZ_HUD_WIDTH;

        const textureKey = ensureHudGreenTexture(this.scene, width, height);
        const background = textureKey
            ? this.scene.add.image(leftX, topY, textureKey).setOrigin(0).setDepth(100)
            : this.scene.add.rectangle(leftX, topY, width, height, 0x6c940f).setOrigin(0).setDepth(100);
        background.setInteractive({ useHandCursor: true });

        const label = this.scene.add.text(
            Math.round(leftX + width / 2),
            Math.round(topY + height / 2),
            'QUIZ',
            createTextStyle({
                fontFamily: 'monospace',
                fontSize: '15px',
                fontStyle: 'bold',
                color: GREEN_BUTTON_COLORS.TEXT,
                align: 'center'
            })
        ).setOrigin(0.5).setDepth(101);

        const quizButton = {
            background,
            label,
            enabled: true,
            setText(newText) {
                label.setText(newText);
                label.setFontSize?.(newText.length > 4 ? '13px' : '15px');
                return this;
            },
            setAlpha(alpha) {
                background.setAlpha?.(alpha);
                label.setAlpha?.(alpha);
                return this;
            },
            setEnabled(enabled) {
                this.enabled = Boolean(enabled);
                if (background.input) {
                    background.input.enabled = Boolean(this.enabled && background.visible);
                }
                return this;
            }
        };

        let isPressed = false;
        const clearPressed = () => {
            isPressed = false;
            background.clearTint?.();
            label.clearTint?.();
        };

        background.on('pointerdown', (_pointer, _lx, _ly, event) => {
            event?.stopPropagation?.();
            if (!quizButton.enabled) return;
            isPressed = true;
            background.setTint?.(GREEN_BUTTON_COLORS.PRESSED_TINT);
            label.setTint?.(GREEN_BUTTON_COLORS.PRESSED_TINT);
        });
        background.on('pointerout', () => {
            clearPressed();
        });
        background.on('pointerup', (_pointer, _lx, _ly, event) => {
            event?.stopPropagation?.();
            const shouldTrigger = isPressed && quizButton.enabled;
            clearPressed();
            if (!shouldTrigger) return;
            if (this.scene.pauseMenu?.isOpen || this.scene.quizPanel?.isOpen) {
                return;
            }
            playSfx(this.scene, 'clique');
            closeCharacterDescription(this.scene);
            this.scene.quizPanel?.open(this.scene.currentCityIndex ?? 0);
        });

        this.quizButton = quizButton;
        return quizButton;
    }

    updateQuizButtonState(now = Date.now()) {
        if (!this.quizButton) return;

        const tutorialBlocked = shouldFreezeOccurrenceClocks()
            || Boolean(this.scene?.tutorialManager?.caption?.isOpen);

        if (tutorialBlocked) {
            this.quizButton.setText('QUIZ');
            this.quizButton.setEnabled(false);
            this.quizButton.setAlpha(0.55);
            return;
        }

        const progress = getQuizProgressDisplay();
        if (progress) {
            this.quizButton.setText(`QUIZ ${progress.current}/${progress.total}`);
            this.quizButton.setEnabled(true);
            this.quizButton.setAlpha(1);
            return;
        }

        const remainingSeconds = getQuizCooldownRemainingSeconds(now);
        if (remainingSeconds > 0) {
            this.quizButton.setText(`QUIZ ${remainingSeconds}S`);
            this.quizButton.setEnabled(false);
            this.quizButton.setAlpha(0.65);
            return;
        }

        this.quizButton.setText('QUIZ');
        this.quizButton.setEnabled(true);
        this.quizButton.setAlpha(1);
    }
}
