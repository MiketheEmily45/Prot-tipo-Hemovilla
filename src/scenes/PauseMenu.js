// Minitela do menu de pause (usada na cidade e no minigame).
import { createTextStyle } from './textUtils.js';
import { GreenButton, preloadGreenButton } from './GreenButton.js';
import { ConfigMenu, preloadConfigAssets } from './ConfigMenu.js';
import { ConfirmPopup } from './ConfirmPopup.js';
import { closeCharacterDescription } from './CharacterDescriptionPanel.js';
import { endMinigameSession, triggerOccurrence } from './occurrenceState.js';
import { isTutorialActive, refreshOccurrenceClockFreeze } from './tutorialState.js';
import { getTutorialProgress } from './settingsStore.js';
import { playSfx, stopMusic, stopAllSfx } from './AudioManager.js';

// Constantes de textos e de volume durante o pause reunidas em um so lugar para facil ajuste.
export const PAUSE_MUSIC_VOLUME_FACTOR = 1.0; // 1.0 = mantem o mesmo volume da musica durante o pause

export const PAUSE_TEXTS = Object.freeze({
    TITLE: 'JOGO PAUSADO',
    CONTINUE: 'Continuar',
    RETURN_TO_CITY: 'Voltar para a cidade',
    SETTINGS: 'Configurações',
    MAIN_MENU: 'Menu inicial',
    CONFIRM_RETURN_TO_CITY: 'Tem certeza que deseja voltar para a cidade? O atendimento em andamento será perdido.',
    CONFIRM_MAIN_MENU: 'Tem certeza que deseja ir ao menu inicial? O atendimento em andamento será perdido.'
});

const DEFAULT_PAUSE_DEPTH = 1500;
const BUTTON_WIDTH = 244;
const BUTTON_HEIGHT = 50;
const BUTTON_GAP = 14;
const PANEL_WIDTH = 332;

export function preloadPauseMenu(scene) {
    if (!scene || !scene.load) return;
    if (!scene.textures?.exists?.('pause-button')) {
        scene.load.image('pause-button', 'assets/Telas/Botoes/botao_pausa.png');
    }
    preloadGreenButton(scene);
    preloadConfigAssets(scene);
}

export function isMinigameTutorialActive(scene = null) {
    if (!isTutorialActive()) {
        return false;
    }
    if (scene?.tutorialManager?.caption?.isOpen) {
        return true;
    }
    const progress = getTutorialProgress();
    return !progress.aposPrimeiroAtendimento;
}

export function getPauseButtonDefinitions({ mode = 'city', isTutorial = false } = {}) {
    if (mode === 'minigame') {
        const defs = [
            { id: 'continue', label: PAUSE_TEXTS.CONTINUE }
        ];
        if (!isTutorial) {
            defs.push({ id: 'returnToCity', label: PAUSE_TEXTS.RETURN_TO_CITY });
        }
        defs.push(
            { id: 'settings', label: PAUSE_TEXTS.SETTINGS },
            { id: 'mainMenu', label: PAUSE_TEXTS.MAIN_MENU }
        );
        return defs;
    }

    return [
        { id: 'continue', label: PAUSE_TEXTS.CONTINUE },
        { id: 'settings', label: PAUSE_TEXTS.SETTINGS },
        { id: 'mainMenu', label: PAUSE_TEXTS.MAIN_MENU }
    ];
}

export class PauseMenu {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ mode?: 'city' | 'minigame', depth?: number }} [options]
     */
    constructor(scene, { mode = 'city', depth = DEFAULT_PAUSE_DEPTH } = {}) {
        this.scene = scene;
        this.mode = mode;
        this.depth = depth;
        this.isOpen = false;

        this.backdrop = null;
        this.panelElements = [];
        this.buttons = [];
        this.configOverlay = null;
        this.confirmPopup = new ConfirmPopup(scene, { depth: depth + 400 });

        this.pausedAtSceneTime = 0;
        this.wasAttendanceClockRunning = false;
        this.wasPhysicsPaused = false;
        this.pausedAnimSprites = [];

        this.escHandler = (event) => {
            if (event?.repeat) return;
            this.handleEscapeKey();
        };

        this.bindKeyboard();
        scene.events?.once?.('shutdown', () => this.destroy());
    }

    bindKeyboard() {
        const keyboard = this.scene?.input?.keyboard;
        if (keyboard && typeof keyboard.on === 'function') {
            keyboard.on('keydown-ESC', this.escHandler);
            this.keyboard = keyboard;
        }
    }

    unbindKeyboard() {
        if (this.keyboard) {
            this.keyboard.off?.('keydown-ESC', this.escHandler);
            this.keyboard = null;
        }
    }

    handleEscapeKey() {
        if (!this.isOpen) {
            this.open();
            return;
        }

        if (this.configOverlay?.isOpen) {
            if (this.configOverlay.confirmPopup?.isOpen) {
                playSfx(this.scene, 'clique');
                this.configOverlay.confirmPopup.cancel();
                return;
            }
            playSfx(this.scene, 'clique');
            this.configOverlay.closeOverlay(true);
            return;
        }

        if (this.confirmPopup?.isOpen) {
            playSfx(this.scene, 'clique');
            this.confirmPopup.cancel();
            return;
        }

        playSfx(this.scene, 'clique');
        this.close();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen || !this.scene) return false;

        // No minigame, nao abre o pause se a tela final de resultado ja estiver concluida.
        if (this.mode === 'minigame' && this.scene.attendanceState?.phase === 'RESULTADO') {
            return false;
        }

        this.isOpen = true;
        this.freezeScene();
        this.createBackdrop();
        this.renderPanel();
        return true;
    }

    close() {
        if (!this.isOpen) return;

        if (this.configOverlay?.isOpen) {
            this.configOverlay.closeOverlay(false);
            this.configOverlay = null;
        }
        if (this.confirmPopup?.isOpen) {
            this.confirmPopup.close();
        }

        this.destroyPanelElements();
        this.destroyBackdrop();
        this.isOpen = false;
        this.resumeScene();

        if (this.mode === 'city') {
            refreshOccurrenceClockFreeze();
            this.scene?.tutorialManager?.checkMapSections?.();
        }
    }

    freezeScene() {
        const scene = this.scene;
        if (!scene) return;

        // Os efeitos sonoros ficam parados; a musica continua tocando com o mesmo volume.
        stopAllSfx(scene);

        this.pausedAtSceneTime = scene.time?.now ?? 0;

        // Congela o relogio do atendimento no minigame.
        if (scene.attendanceState) {
            this.wasAttendanceClockRunning = Boolean(scene.attendanceState.isClockRunning);
            if (this.wasAttendanceClockRunning) {
                scene.attendanceState.pause();
            }
        }

        // Limpa ultimo ponto de mistura na Fase 2 e pausa temporizadores internos da tipagem.
        if (scene.typingPhase) {
            scene.typingPhase.lastPointer = null;
            scene.typingPhase.setTimersPaused?.(true);
        }

        // Congela a fisica dos personagens no mapa.
        if (scene.physics?.world) {
            this.wasPhysicsPaused = Boolean(scene.physics.world.isPaused);
            if (!this.wasPhysicsPaused && typeof scene.physics.world.pause === 'function') {
                scene.physics.world.pause();
            }
        }

        // Congela animacoes de sprites em execucao.
        this.pausedAnimSprites = [];
        const children = scene.children?.list || [];
        children.forEach((child) => {
            if (child?.anims && child.anims.isPlaying && !child.anims.isPaused) {
                child.anims.pause();
                this.pausedAnimSprites.push(child);
            }
        });

        // Congela tweens ativos (ex.: indicador de legenda).
        scene.tweens?.pauseAll?.();
    }

    resumeScene() {
        const scene = this.scene;
        if (!scene) return;

        const now = scene.time?.now ?? 0;
        const pausedDuration = Math.max(0, now - this.pausedAtSceneTime);

        if (pausedDuration > 0) {
            if (typeof scene.nextDirectionChange === 'number') {
                scene.nextDirectionChange += pausedDuration;
            }
            if (Array.isArray(scene.npcs)) {
                scene.npcs.forEach((npc) => {
                    if (npc && typeof npc._nextDirectionChange === 'number') {
                        npc._nextDirectionChange += pausedDuration;
                    }
                });
            }
        }

        if (scene.attendanceState && this.wasAttendanceClockRunning) {
            scene.attendanceState.resume();
        }
        this.wasAttendanceClockRunning = false;

        if (scene.typingPhase) {
            scene.typingPhase.setTimersPaused?.(false);
        }

        if (scene.physics?.world && !this.wasPhysicsPaused && typeof scene.physics.world.resume === 'function') {
            scene.physics.world.resume();
        }

        this.pausedAnimSprites.forEach((sprite) => {
            sprite?.anims?.resume?.();
        });
        this.pausedAnimSprites = [];

        scene.tweens?.resumeAll?.();
    }

    createBackdrop() {
        this.destroyBackdrop();
        const scene = this.scene;
        const width = scene.cameras?.main?.width || 512;
        const height = scene.cameras?.main?.height || 512;

        this.backdrop = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);
        this.backdrop.setDepth(this.depth);
        this.backdrop.setInteractive();
        this.backdrop.on('pointerdown', (_p, _lx, _ly, event) => event?.stopPropagation?.());
    }

    destroyBackdrop() {
        this.backdrop?.destroy?.();
        this.backdrop = null;
    }

    destroyPanelElements() {
        this.buttons.forEach((btn) => btn?.destroy?.());
        this.buttons = [];
        this.panelElements.forEach((el) => el?.destroy?.());
        this.panelElements = [];
    }

    renderPanel() {
        this.destroyPanelElements();
        const scene = this.scene;
        if (!scene || !this.isOpen) return;

        const isTutorial = this.mode === 'minigame' && isMinigameTutorialActive(scene);
        const defs = getPauseButtonDefinitions({ mode: this.mode, isTutorial });

        const centerX = 256;
        const centerY = 256;
        const buttonsStackHeight = defs.length * BUTTON_HEIGHT + (defs.length - 1) * BUTTON_GAP;
        const headerSpace = 62;
        const bottomPadding = 28;
        const panelHeight = headerSpace + buttonsStackHeight + bottomPadding;
        const boxX = Math.round(centerX - PANEL_WIDTH / 2);
        const boxY = Math.round(centerY - panelHeight / 2);

        // Caixa centralizada no estilo da moldura de paineis do jogo
        const boxGfx = scene.add.graphics();
        boxGfx.setDepth(this.depth + 1);

        boxGfx.fillStyle(0x000000, 1);
        boxGfx.fillRect(boxX - 4, boxY - 4, PANEL_WIDTH + 8, panelHeight + 8);

        boxGfx.fillStyle(0x674430, 1);
        boxGfx.fillRect(boxX, boxY, PANEL_WIDTH, panelHeight);

        boxGfx.fillStyle(0x331d11, 1);
        boxGfx.fillRect(boxX + 10, boxY + 10, PANEL_WIDTH - 20, panelHeight - 20);

        boxGfx.fillStyle(0xd7c8a9, 1);
        boxGfx.fillRect(boxX + 14, boxY + 14, PANEL_WIDTH - 28, panelHeight - 28);

        this.panelElements.push(boxGfx);

        // Titulo do painel
        const title = scene.add.text(centerX, boxY + 34, PAUSE_TEXTS.TITLE, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#3b2a20',
            align: 'center'
        })).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(title);

        const firstBtnY = boxY + headerSpace + BUTTON_HEIGHT / 2;

        defs.forEach((def, index) => {
            const btnY = Math.round(firstBtnY + index * (BUTTON_HEIGHT + BUTTON_GAP));
            const btn = new GreenButton(scene, {
                x: centerX,
                y: btnY,
                width: BUTTON_WIDTH,
                height: BUTTON_HEIGHT,
                label: def.label,
                fontSize: '15px',
                depth: this.depth + 3,
                onClick: () => this.handleButtonAction(def.id)
            });
            this.buttons.push(btn);
        });
    }

    handleButtonAction(actionId) {
        if (this.confirmPopup?.isOpen || this.configOverlay?.isOpen) {
            return;
        }

        if (actionId === 'continue') {
            this.close();
            return;
        }

        if (actionId === 'settings') {
            this.openSettingsOverlay();
            return;
        }

        if (actionId === 'returnToCity') {
            this.confirmPopup.open({
                message: PAUSE_TEXTS.CONFIRM_RETURN_TO_CITY,
                onConfirm: () => this.abandonToCity()
            });
            return;
        }

        if (actionId === 'mainMenu') {
            if (this.mode === 'minigame') {
                this.confirmPopup.open({
                    message: PAUSE_TEXTS.CONFIRM_MAIN_MENU,
                    onConfirm: () => this.goToMainMenu()
                });
            } else {
                this.goToMainMenu();
            }
        }
    }

    openSettingsOverlay() {
        // Esconde os elementos do painel de pause enquanto a minitela de configuracoes esta aberta por cima.
        this.destroyPanelElements();
        const configOverlay = new ConfigMenu();
        this.configOverlay = configOverlay;
        configOverlay.openAsOverlay(this.scene, {
            depth: this.depth + 100,
            onClose: () => {
                this.configOverlay = null;
                if (this.isOpen) {
                    this.renderPanel();
                }
            }
        });
    }

    cleanupBeforeSceneExit() {
        if (this.configOverlay?.isOpen) {
            this.configOverlay.closeOverlay(false);
            this.configOverlay = null;
        }
        if (this.confirmPopup?.isOpen) {
            this.confirmPopup.close();
        }
        this.destroyPanelElements();
        this.destroyBackdrop();
        this.isOpen = false;
        this.pausedAnimSprites = [];
    }

    abandonToCity() {
        const scene = this.scene;
        if (!scene) return;

        this.cleanupBeforeSceneExit();

        // Garante que o personagem continue com a ocorrencia pendente e nao receba ATP.
        if (scene.characterId) {
            triggerOccurrence(scene.characterId);
        }

        if (typeof scene.returnToMap === 'function') {
            scene.returnToMap({ failed: true });
        } else {
            endMinigameSession();
            scene.scene.start('GameMap', { cityIndex: scene.cityIndex ?? 0 });
        }
    }

    goToMainMenu() {
        const scene = this.scene;
        if (!scene) return;

        this.cleanupBeforeSceneExit();

        if (this.mode === 'minigame') {
            if (scene.characterId) {
                triggerOccurrence(scene.characterId);
            }
            endMinigameSession();
            if (scene.typingPhase) {
                scene.typingPhase.destroy?.();
                scene.typingPhase = null;
            }
            if (scene.transfusionPhase) {
                scene.transfusionPhase.destroy?.();
                scene.transfusionPhase = null;
            }
            stopMusic(scene);
        } else {
            stopMusic(scene, 'city-music');
            closeCharacterDescription(scene);
        }

        scene.scene.start('Start');
    }

    destroy() {
        this.unbindKeyboard();
        if (this.configOverlay?.isOpen) {
            this.configOverlay.closeOverlay(false);
            this.configOverlay = null;
        }
        if (this.confirmPopup) {
            this.confirmPopup.destroy();
            this.confirmPopup = null;
        }
        this.destroyPanelElements();
        this.destroyBackdrop();
        this.isOpen = false;
        this.pausedAnimSprites = [];
        this.scene = null;
    }
}
