// Tela e minitela de configuracoes (pode rodar como Scene isolada ou como minitela sobre o menu de pause).
import { getSettings, saveSettings, restoreDefaultVolumes, reactivateTutorial } from './settingsStore.js';
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

export function preloadConfigAssets(scene) {
    if (!scene || !scene.load) return;
    Object.entries(CONFIG_ASSETS).forEach(([key, path]) => {
        if (!scene.textures?.exists?.(key)) {
            scene.load.image(key, path);
        }
    });
}

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

// Botao voltar na posicao recortada (x423 y413, 80x79) na cena cheia, e dentro da moldura na minitela.
const RETURN_BUTTON_POS = { x: 423, y: 413 };
const RETURN_BUTTON_OVERLAY_POS = { x: 400, y: 400 };
const OVERLAY_PANEL = { x: 14, y: 14, width: 484, height: 484 };

export class ConfigMenu extends Phaser.Scene {

    constructor() {
        super('ConfigMenu');
        this.hostScene = this;
        this.isOverlay = false;
        this.isOpen = false;
        this.baseDepth = 0;
        this.onCloseOverlay = null;
        this.overlayElements = [];
        this.inputCleanups = [];
        this.confirmPopup = null;
        this.feedbackTimer = null;
    }

    init(data) {
        this.fromScene = (data && data.fromScene) ? data.fromScene : 'Start';
        this.returnData = (data && data.returnData) ? data.returnData : undefined;
        this.isOverlay = false;
        this.baseDepth = 0;
        this.onCloseOverlay = null;
        this.confirmPopup = null;
        this.feedbackTimer = null;
    }

    preload() {
        preloadConfigAssets(this);
        preloadAudio(this);
    }

    create() {
        this.hostScene = this;
        this.isOverlay = false;
        this.baseDepth = 0;
        this.setupViewport();
        this.mountUI();
    }

    /**
     * Abre o ConfigMenu como minitela por cima de outra cena (ex: por cima do menu de pause).
     */
    openAsOverlay(hostScene, { depth = 1600, onClose = null } = {}) {
        if (this.isOpen) {
            this.closeOverlay(false);
        }
        this.hostScene = hostScene;
        this.isOverlay = true;
        this.baseDepth = depth;
        this.onCloseOverlay = onClose;
        this.mountUI();
        return this;
    }

    mountUI() {
        this.overlayElements = [];
        this.inputCleanups = [];
        this.isOpen = true;

        this.applyNearestFilter();
        this.setupBackground();
        this.setupTitle();

        const currentSettings = getSettings();
        this.applyMenuMusicVolume(currentSettings.musicVolume);

        this.setupSliders(currentSettings);
        this.setupActionButtons();
        this.setupReturnButton();
        this.setupFeedbackText();

        this.confirmPopup = new ConfirmPopup(this.hostScene, { depth: this.baseDepth + 300 });
    }

    trackElement(el) {
        if (el) {
            this.overlayElements.push(el);
        }
        return el;
    }

    setupViewport() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);
    }

    applyNearestFilter() {
        const scene = this.hostScene;
        Object.keys(CONFIG_ASSETS).forEach((key) => {
            if (scene.textures?.exists?.(key)) {
                scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        });
    }

    setupBackground() {
        const scene = this.hostScene;
        if (!this.isOverlay) {
            this.background = this.trackElement(
                scene.add.image(256, 256, 'config-bg').setDepth(this.baseDepth)
            );
            return;
        }

        const camW = scene.cameras?.main?.width || 512;
        const camH = scene.cameras?.main?.height || 512;

        // Bloqueador de cliques atras da minitela de configuracoes
        const blocker = scene.add.rectangle(camW / 2, camH / 2, camW, camH, 0x000000, 0.35);
        blocker.setDepth(this.baseDepth);
        blocker.setInteractive();
        blocker.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation?.());
        this.trackElement(blocker);

        // Moldura da minitela centralizada nos 512x512 superiores
        const { x: boxX, y: boxY, width: boxW, height: boxH } = OVERLAY_PANEL;
        const panelGfx = scene.add.graphics();
        panelGfx.setDepth(this.baseDepth + 1);

        panelGfx.fillStyle(0x000000, 1);
        panelGfx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);

        panelGfx.fillStyle(0x674430, 1);
        panelGfx.fillRect(boxX, boxY, boxW, boxH);

        panelGfx.fillStyle(0x331d11, 1);
        panelGfx.fillRect(boxX + 10, boxY + 10, boxW - 20, boxH - 20);

        panelGfx.fillStyle(0xd7c8a9, 1);
        panelGfx.fillRect(boxX + 14, boxY + 14, boxW - 28, boxH - 28);

        this.background = this.trackElement(panelGfx);
    }

    setupTitle() {
        const scene = this.hostScene;
        this.titleImage = this.trackElement(
            scene.add.image(63, 42, 'config-title').setOrigin(0, 0).setDepth(this.baseDepth + 2)
        );
    }

    setupSliders(settings) {
        const scene = this.hostScene;
        this.musicSlider = this.createSlider({
            barKey: 'config-music-bar',
            knobKey: 'config-music-knob',
            barX: MUSIC_BAR_POS.x,
            barY: MUSIC_BAR_POS.y,
            trackY: MUSIC_TRACK_CENTER_Y,
            initialValue: settings.musicVolume,
            onChange: (val) => {
                saveSettings({ musicVolume: val }, scene.game);
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
                saveSettings({ sfxVolume: val }, scene.game);
            },
            onRelease: () => {
                // Ponto unico para tocar o efeito sonoro de teste ao soltar o slider:
                playSfx(scene, 'clique');
            }
        });
    }

    createSlider({ barKey, knobKey, barX, barY, trackY, initialValue, onChange, onRelease }) {
        const scene = this.hostScene;
        const bar = this.trackElement(
            scene.add.image(barX, barY, barKey).setOrigin(0, 0).setDepth(this.baseDepth + 2)
        );

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
        const knob = this.trackElement(
            scene.add.image(valueToX(currentValue), trackY, knobKey).setOrigin(0.5, 0.5).setDepth(this.baseDepth + 5)
        );

        // Area clicavel no trilho (x103-420)
        const trackWidth = TRACK_MAX_X - TRACK_MIN_X;
        const trackHit = this.trackElement(
            scene.add.rectangle(
                TRACK_MIN_X + trackWidth / 2,
                trackY,
                trackWidth,
                34,
                0x000000,
                0
            ).setDepth(this.baseDepth + 4)
        );
        trackHit.setInteractive({ useHandCursor: true });

        knob.setInteractive({ useHandCursor: true, draggable: true });
        scene.input.setDraggable(knob);

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

        const onPointerMove = (pointer) => {
            if (!trackDragging || !pointer.isDown) return;
            applyPointerX(pointer.x);
        };

        const onPointerUp = () => {
            if (!trackDragging) return;
            trackDragging = false;
            knob.clearTint();
            if (typeof onRelease === 'function') {
                onRelease(currentValue);
            }
        };

        scene.input.on('pointermove', onPointerMove);
        scene.input.on('pointerup', onPointerUp);
        this.inputCleanups.push(() => {
            scene.input?.off?.('pointermove', onPointerMove);
            scene.input?.off?.('pointerup', onPointerUp);
        });

        knob.on('pointerdown', () => {
            if (this.confirmPopup?.isOpen) return;
            knob.setTint(0x8B2E40);
        });

        knob.on('pointerout', () => {
            if (!trackDragging && !scene.input.activePointer.isDown) {
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
        const pos = this.isOverlay ? RETURN_BUTTON_OVERLAY_POS : RETURN_BUTTON_POS;
        this.returnButton = this.createImageButton(
            pos.x,
            pos.y,
            'config-btn-return',
            () => {
                if (this.isOverlay) {
                    this.closeOverlay();
                } else {
                    this.scene.start(this.fromScene, this.returnData);
                }
            },
            { originX: 0, originY: 0 }
        );
    }

    createImageButton(x, y, textureKey, onClick, { originX = 0.5, originY = 0.5 } = {}) {
        const scene = this.hostScene;
        const btn = this.trackElement(
            scene.add.image(x, y, textureKey).setOrigin(originX, originY).setDepth(this.baseDepth + 3)
        );
        btn.setInteractive({ useHandCursor: true });

        let isPressed = false;

        btn.on('pointerdown', (_p, _lx, _ly, event) => {
            event?.stopPropagation?.();
            if (this.confirmPopup?.isOpen) return;
            isPressed = true;
            btn.setTint(0x8B2E40);
        });

        btn.on('pointerout', () => {
            isPressed = false;
            btn.clearTint();
        });

        btn.on('pointerup', (_p, _lx, _ly, event) => {
            event?.stopPropagation?.();
            if (!isPressed || this.confirmPopup?.isOpen) {
                btn.clearTint();
                isPressed = false;
                return;
            }
            isPressed = false;
            btn.clearTint();
            playSfx(scene, 'clique');
            onClick();
        });

        return btn;
    }

    setupFeedbackText() {
        const scene = this.hostScene;
        const feedbackY = this.isOverlay ? 484 : 494;
        this.feedbackText = this.trackElement(
            scene.add.text(256, feedbackY, '', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: { x: 10, y: 4 }
            })).setOrigin(0.5).setDepth(this.baseDepth + 200).setVisible(false)
        );
    }

    showFeedback(message) {
        if (!this.feedbackText) return;
        const scene = this.hostScene;
        this.feedbackText.setText(message);
        this.feedbackText.setVisible(true);

        if (this.feedbackTimer) {
            this.feedbackTimer.remove(false);
        }
        if (scene.time?.delayedCall) {
            this.feedbackTimer = scene.time.delayedCall(2000, () => {
                this.feedbackText?.setVisible(false);
            });
        }
    }

    applyMenuMusicVolume(volume) {
        updateMusicVolume(volume, this.hostScene);
    }

    handleRestoreDefaults() {
        const scene = this.hostScene;
        const updated = restoreDefaultVolumes(scene.game);
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
                this.hostScene?.atpDisplay?.update?.();
                this.hostScene?.syncActiveCityAlerts?.(true);
                this.showFeedback('Progresso apagado com sucesso!');
            }
        });
    }

    handleReactivateTutorial() {
        const scene = this.hostScene;
        // Limpa todas as flags do tutorial e religa as dicas (o progresso do jogo nao muda).
        reactivateTutorial(scene.game);
        this.showFeedback('Dicas do tutorial reativadas.');
    }

    closeOverlay(triggerCallback = true) {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.feedbackTimer) {
            this.feedbackTimer.remove(false);
            this.feedbackTimer = null;
        }
        if (this.confirmPopup) {
            this.confirmPopup.destroy();
            this.confirmPopup = null;
        }

        this.inputCleanups.forEach((cleanup) => cleanup());
        this.inputCleanups = [];

        this.overlayElements.forEach((el) => el?.destroy?.());
        this.overlayElements = [];

        const cb = this.onCloseOverlay;
        this.onCloseOverlay = null;
        if (triggerCallback && typeof cb === 'function') {
            cb();
        }
    }

    update() {

    }
}
