// Tela de configuracoes
import { getSettings, saveSettings, restoreDefaultVolumes } from './settingsStore.js';
import { ConfirmPopup } from './ConfirmPopup.js';
import { clearAllProgress } from './debugTools.js';
import { resetPurchasedCitiesMemory } from './cityUnlocks.js';
import { resetInMemoryATP } from './atpStore.js';
import { resetOccurrenceState } from './occurrenceState.js';
import { createTextStyle } from './textUtils.js';
import { preloadAudio, playSfx, updateMusicVolume } from './AudioManager.js';

export const CONFIG_ASSETS = {
    'config-bg': 'assets/Telas/Config/Fundo.png',
    'config-title': 'assets/Telas/Config/TituloConfiguracoes.png',
    'config-music-bar': 'assets/Telas/Config/BarraMusica.png',
    'config-sfx-bar': 'assets/Telas/Config/BarraSom.png',
    'config-music-knob': 'assets/Telas/Config/SlideIconeMusica.png',
    'config-sfx-knob': 'assets/Telas/Config/SlideIconeSom.png',
    'config-btn-restore': 'assets/Telas/Config/BotaoRestaurar.png',
    'config-btn-reset': 'assets/Telas/Config/BotaoZerar.png',
    'config-btn-tutorial': 'assets/Telas/Config/BotaoTutorial.png',
    'config-btn-return': 'assets/Telas/Config/BotaoRetornar.png'
};

// Trilhos dos sliders na tela 512x512 (com marcador 20x33 contido dentro do trilho x103-420).
const TRACK_MIN_X = 103;
const TRACK_MAX_X = 420;
const KNOB_HALF_WIDTH = 10;
const KNOB_MIN_X = TRACK_MIN_X + KNOB_HALF_WIDTH; // 113
const KNOB_MAX_X = TRACK_MAX_X - KNOB_HALF_WIDTH; // 410

const MUSIC_BAR_POS = { x: 67, y: 125 };
const MUSIC_TRACK_CENTER_Y = 145; // Centro vertical do trilho y133-158

const SFX_BAR_POS = { x: 59, y: 184 };
const SFX_TRACK_CENTER_Y = 202; // Centro vertical do trilho y190-215

// Botoes centralizados em x=256 com espacamento vertical igual (82 px entre centros).
const ACTION_BUTTON_X = 256;
const RESTORE_BUTTON_Y = 280;
const RESET_BUTTON_Y = 362;
const TUTORIAL_BUTTON_Y = 444;

// Botao voltar na posicao recortada (x423 y413, 80x79), alinhado com a engrenagem do menu.
const RETURN_BUTTON_POS = { x: 423, y: 413 };

export class ConfigMenu extends Phaser.Scene {

    constructor() {
        super('ConfigMenu');
    }

    init(data) {
        this.fromScene = (data && data.fromScene) ? data.fromScene : 'Start';
        this.returnData = (data && data.returnData) ? data.returnData : undefined;
        this.confirmPopup = null;
        this.feedbackTimer = null;
    }

    preload() {
        Object.entries(CONFIG_ASSETS).forEach(([key, path]) => {
            this.load.image(key, path);
        });
        preloadAudio(this);
    }

    create() {
        this.setupViewport();
        this.applyNearestFilter();
        this.setupBackground();
        this.setupTitle();

        const currentSettings = getSettings();
        this.applyMenuMusicVolume(currentSettings.musicVolume);

        this.setupSliders(currentSettings);
        this.setupActionButtons();
        this.setupReturnButton();
        this.setupFeedbackText();

        this.confirmPopup = new ConfirmPopup(this);
    }

    setupViewport() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);
    }

    applyNearestFilter() {
        Object.keys(CONFIG_ASSETS).forEach((key) => {
            if (this.textures.exists(key)) {
                this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        });
    }

    setupBackground() {
        this.background = this.add.image(256, 256, 'config-bg');
    }

    setupTitle() {
        this.titleImage = this.add.image(63, 42, 'config-title').setOrigin(0, 0);
    }

    setupSliders(settings) {
        this.musicSlider = this.createSlider({
            barKey: 'config-music-bar',
            knobKey: 'config-music-knob',
            barX: MUSIC_BAR_POS.x,
            barY: MUSIC_BAR_POS.y,
            trackY: MUSIC_TRACK_CENTER_Y,
            initialValue: settings.musicVolume,
            onChange: (val) => {
                saveSettings({ musicVolume: val }, this.game);
                this.applyMenuMusicVolume(val);
            }
        });

        this.sfxSlider = this.createSlider({
            barKey: 'config-sfx-bar',
            knobKey: 'config-sfx-knob',
            barX: SFX_BAR_POS.x,
            barY: SFX_BAR_POS.y,
            trackY: SFX_TRACK_CENTER_Y,
            initialValue: settings.sfxVolume,
            onChange: (val) => {
                saveSettings({ sfxVolume: val }, this.game);
            },
            onRelease: () => {
                // Ponto unico para tocar o efeito sonoro de teste ao soltar o slider:
                playSfx(this, 'clique');
            }
        });
    }

    createSlider({ barKey, knobKey, barX, barY, trackY, initialValue, onChange, onRelease }) {
        const bar = this.add.image(barX, barY, barKey).setOrigin(0, 0);

        const valueToX = (val) => {
            const clamped = Phaser.Math.Clamp(val, 0, 1);
            return Math.round(KNOB_MIN_X + clamped * (KNOB_MAX_X - KNOB_MIN_X));
        };

        const xToValue = (pointerX) => {
            const clampedX = Phaser.Math.Clamp(pointerX, KNOB_MIN_X, KNOB_MAX_X);
            const raw = (clampedX - KNOB_MIN_X) / (KNOB_MAX_X - KNOB_MIN_X);
            return Math.round(raw * 20) / 20;
        };

        let currentValue = Math.round(Phaser.Math.Clamp(initialValue, 0, 1) * 20) / 20;
        const knob = this.add.image(valueToX(currentValue), trackY, knobKey).setOrigin(0.5, 0.5);
        knob.setDepth(5);

        // Area clicavel no trilho (x103-420)
        const trackWidth = TRACK_MAX_X - TRACK_MIN_X;
        const trackHit = this.add.rectangle(
            TRACK_MIN_X + trackWidth / 2,
            trackY,
            trackWidth,
            34,
            0x000000,
            0
        ).setDepth(4);
        trackHit.setInteractive({ useHandCursor: true });

        knob.setInteractive({ useHandCursor: true, draggable: true });
        this.input.setDraggable(knob);

        const applyPointerX = (pointerX) => {
            if (this.confirmPopup?.isOpen) return;
            const snapped = xToValue(pointerX);
            knob.x = valueToX(snapped);
            if (snapped !== currentValue) {
                currentValue = snapped;
                if (typeof onChange === 'function') {
                    onChange(currentValue);
                }
            }
        };

        let trackDragging = false;

        trackHit.on('pointerdown', (pointer) => {
            if (this.confirmPopup?.isOpen) return;
            trackDragging = true;
            knob.setTint(0x8B2E40);
            applyPointerX(pointer.x);
        });

        this.input.on('pointermove', (pointer) => {
            if (!trackDragging || !pointer.isDown) return;
            applyPointerX(pointer.x);
        });

        this.input.on('pointerup', () => {
            if (!trackDragging) return;
            trackDragging = false;
            knob.clearTint();
            if (typeof onRelease === 'function') {
                onRelease(currentValue);
            }
        });

        knob.on('pointerdown', () => {
            if (this.confirmPopup?.isOpen) return;
            knob.setTint(0x8B2E40);
        });

        knob.on('pointerout', () => {
            if (!trackDragging && !this.input.activePointer.isDown) {
                knob.clearTint();
            }
        });

        knob.on('drag', (_pointer, dragX) => {
            if (this.confirmPopup?.isOpen) return;
            applyPointerX(dragX);
        });

        knob.on('dragend', () => {
            knob.clearTint();
            if (typeof onRelease === 'function') {
                onRelease(currentValue);
            }
        });

        knob.on('pointerup', () => {
            knob.clearTint();
        });

        return {
            bar,
            knob,
            trackHit,
            setValue: (newVal) => {
                currentValue = Math.round(Phaser.Math.Clamp(newVal, 0, 1) * 20) / 20;
                knob.x = valueToX(currentValue);
            },
            getValue: () => currentValue
        };
    }

    setupActionButtons() {
        this.restoreButton = this.createImageButton(
            ACTION_BUTTON_X,
            RESTORE_BUTTON_Y,
            'config-btn-restore',
            () => this.handleRestoreDefaults()
        );

        this.resetButton = this.createImageButton(
            ACTION_BUTTON_X,
            RESET_BUTTON_Y,
            'config-btn-reset',
            () => this.handleResetProgress()
        );

        this.tutorialButton = this.createImageButton(
            ACTION_BUTTON_X,
            TUTORIAL_BUTTON_Y,
            'config-btn-tutorial',
            () => this.handleReactivateTutorial()
        );
    }

    setupReturnButton() {
        // Posicao recortada x423 y413 (80x79) -> centro em (463, 452.5)
        this.returnButton = this.createImageButton(
            RETURN_BUTTON_POS.x,
            RETURN_BUTTON_POS.y,
            'config-btn-return',
            () => this.scene.start(this.fromScene, this.returnData),
            { originX: 0, originY: 0 }
        );
    }

    createImageButton(x, y, textureKey, onClick, { originX = 0.5, originY = 0.5 } = {}) {
        const btn = this.add.image(x, y, textureKey).setOrigin(originX, originY);
        btn.setInteractive({ useHandCursor: true });

        let isPressed = false;

        btn.on('pointerdown', () => {
            if (this.confirmPopup?.isOpen) return;
            isPressed = true;
            btn.setTint(0x8B2E40);
        });

        btn.on('pointerout', () => {
            isPressed = false;
            btn.clearTint();
        });

        btn.on('pointerup', () => {
            if (!isPressed || this.confirmPopup?.isOpen) {
                btn.clearTint();
                isPressed = false;
                return;
            }
            isPressed = false;
            btn.clearTint();
            playSfx(this, 'clique');
            onClick();
        });

        return btn;
    }

    setupFeedbackText() {
        this.feedbackText = this.add.text(256, 494, '', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 10, y: 4 }
        })).setOrigin(0.5).setDepth(200).setVisible(false);
    }

    showFeedback(message) {
        if (!this.feedbackText) return;
        this.feedbackText.setText(message);
        this.feedbackText.setVisible(true);

        if (this.feedbackTimer) {
            this.feedbackTimer.remove(false);
        }
        this.feedbackTimer = this.time.delayedCall(2000, () => {
            this.feedbackText?.setVisible(false);
        });
    }

    applyMenuMusicVolume(volume) {
        updateMusicVolume(volume, this);
    }

    handleRestoreDefaults() {
        const updated = restoreDefaultVolumes(this.game);
        this.musicSlider?.setValue(updated.musicVolume);
        this.sfxSlider?.setValue(updated.sfxVolume);
        this.applyMenuMusicVolume(updated.musicVolume);
        this.showFeedback('Volumes restaurados para o padrão.');
    }

    handleResetProgress() {
        this.confirmPopup.open({
            onConfirm: () => {
                clearAllProgress();
                resetPurchasedCitiesMemory();
                resetInMemoryATP();
                resetOccurrenceState();
                this.showFeedback('Progresso apagado com sucesso!');
            }
        });
    }

    handleReactivateTutorial() {
        saveSettings({ tutorialHintsEnabled: true }, this.game);
        this.showFeedback('Dicas do tutorial reativadas.');
    }

    update() {

    }
}
