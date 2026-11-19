// Fase 2 do minigame: tipagem na bancada (Etapa 1: ABO; Etapa 2: fator Rh com soro Anti-D nas Cidades 2 e 3).
import { BENCH_RESULT_FRAMES, RH_RESULT_FRAMES } from './minigameAssets.js';
import { characterData } from './characterData.js';
import { setDiscoveredType } from './discoveredTypes.js';
import { HeartsDisplay } from './HeartsDisplay.js';
import { createTextStyle } from './textUtils.js';
import { GuidePanel } from './GuidePanel.js';
import { GreenButton } from './GreenButton.js';
import { playSfx } from './AudioManager.js';
import { getCharacterOccurrenceRules } from './cityOccurrenceConfig.js';
import {
    RH_DIAGNOSIS_OPTIONS,
    RH_NEUTRAL_ERROR_HINT,
    aboAgglutinates,
    getRhFailureExplanation,
    formatConfirmedBloodType
} from './typingLogic.js';

// Valores ajustaveis da Fase 2. Coordenadas em pixels da tela 512x512.
const SPRITE_SCALE = 2;
const BENCH_SCALE = 2;
const BENCH_HALF_WIDTH = 128;
const BENCH_HEIGHT = 256;
// Posicao inicial dos frascos de soro e do tubo de coleta.
const ANTI_A_START = { x: 100, y: 64 };
const ANTI_B_START = { x: 412, y: 64 };
const ANTI_D_START = { x: 148, y: 74 };
const TUBE_START = { x: 256, y: 64 };
// Retangulos dos pocos (poco 1 a esquerda, poco 2 a direita).
const WELL_AREAS = [
    { x: 60, y: 160, width: 180, height: 180 },
    { x: 260, y: 150, width: 180, height: 180 }
];
// Distancia (em pixels) que o mouse precisa percorrer sobre o poco para misturar.
const MIX_DISTANCE = 600;
const MIX_BAR = { height: 4, offsetY: 4 };
// Botoes de diagnostico, na base da tela.
const DIAGNOSIS_TYPES = ['A', 'B', 'AB', 'O'];
const DIAGNOSIS_BUTTONS = { startX: 112, spacing: 96, y: 485, width: 80, height: 36 };
const RH_BUTTON_POSITIONS = [
    { x: 176, y: 478 },
    { x: 336, y: 478 }
];
const RH_BUTTON_SIZE = { width: 132, height: 44 };
const RETRY_BUTTON = { x: 176, y: 452, width: 144, height: 30 };
const RETURN_BUTTON = { x: 336, y: 452, width: 144, height: 30 };
const HINT_POSITION = { x: 256, y: 415 };
const HEARTS_POSITION = { x: 504, y: 8 };
const GUIDE_BUTTON = { x: 360, y: 8, scale: 1 };
// Tempo mostrando o texto de acerto e a dica, em ms.
const CONFIRM_MS = 1500;
const HINT_MS = 2000;
// Se preenchido ('A', 'B', 'AB' ou 'O'), ignora o personagem e forca este tipo (para testes).
const DEBUG_FORCE_TYPE = null;
// Tipo usado apenas se o personagem nao existir em characterData.js.
const DEFAULT_TYPE = 'A';

export class TypingPhase {
    constructor(scene, state, { characterId, cityIndex, onComplete } = {}) {
        this.scene = scene;
        this.state = state;
        this.characterId = characterId;
        this.cityIndex = typeof cityIndex === 'number' ? cityIndex : scene?.cityIndex;
        this.occurrenceRules = getCharacterOccurrenceRules(characterId, this.cityIndex);
        this.rhEnabled = this.occurrenceRules.rhEnabled;
        this.patientRh = this.occurrenceRules.rh;
        this.onComplete = onComplete;
        this.patientType = this.resolvePatientType(characterId);
        this.stage = 'ABO'; // 'ABO' (Etapa 1) -> 'RH' (Etapa 2 nas Cidades 2 e 3)
        this.isDragging = false;
        this.lastPointer = null;
        this.isActive = true;
        this.isConfirmed = false;
        this.cellSprite = null;
        this.antiDDropSprite = null;
        this.antiDDropTween = null;
        this.hintTimer = null;
        this.confirmTimer = null;

        this.createBench();
        this.createRhElements();
        this.createBottles();
        this.createDiagnosisButtons();
        this.createTexts();
        this.createDebugOutline();
        this.guidePanel = new GuidePanel(this.scene, this.state, {
            onToggleVisibility: (visible) => {
                if (this.guideButton && !this.state.isFailed && !this.isConfirmed) {
                    this.guideButton.setVisible(visible);
                    this.guideButton.input.enabled = visible;
                }
            }
        });
        this.createGuideButton();
        this.reset();
    }

    setTimersPaused(paused) {
        const isPaused = Boolean(paused);
        if (this.hintTimer) {
            this.hintTimer.paused = isPaused;
        }
        if (this.confirmTimer) {
            this.confirmTimer.paused = isPaused;
        }
        if (this.antiDDropTween) {
            if (isPaused) {
                this.antiDDropTween.pause?.();
            } else {
                this.antiDDropTween.resume?.();
            }
        }
    }

    createGuideButton() {
        this.guideButton = this.scene.add.image(GUIDE_BUTTON.x, GUIDE_BUTTON.y, 'icone-guia');
        this.guideButton.setOrigin(1, 0);
        this.guideButton.setScale(GUIDE_BUTTON.scale);
        if (this.guideButton.texture) {
            this.guideButton.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        this.guideButton.setDepth(100);
        this.guideButton.setInteractive({ useHandCursor: true });
        this.guideButton.on('pointerdown', () => this.guideButton.setTint(0x8B2E40));
        this.guideButton.on('pointerout', () => this.guideButton.clearTint());
        this.guideButton.on('pointerup', () => {
            this.guideButton.clearTint();
            playSfx(this.scene, 'clique');
            this.guidePanel.open();
        });
    }

    resolvePatientType(characterId) {
        if (DEBUG_FORCE_TYPE) {
            return DEBUG_FORCE_TYPE;
        }

        const data = characterData[characterId];
        if (data && data.tipoSanguineo) {
            // Na Etapa 1 usa apenas o tipo ABO (ex.: 'A-' vira 'A').
            return data.tipoSanguineo.replace(/[+-]/g, '');
        }

        return DEFAULT_TYPE;
    }

    createBench() {
        // Cada poco e uma metade do quadro 256x256, esticado para 512x512.
        this.wells = WELL_AREAS.map((area, index) => {
            const image = this.scene.add.image(0, 0, 'bancada-vazia');
            image.setOrigin(0);
            image.setScale(BENCH_SCALE);
            image.setDepth(20);

            return {
                index,
                area: new Phaser.Geom.Rectangle(area.x, area.y, area.width, area.height),
                image,
                state: 'EMPTY',
                mixDistance: 0
            };
        });

        this.progressBar = this.scene.add.graphics();
        this.progressBar.setDepth(21);
    }

    createRhElements() {
        // Centro e raio visiveis do poco 2 circular na bancada 512x512 (256x256 em escala 2x).
        const well2CenterX = 347;
        const well2CenterY = 256;

        // Poco 2 escurecido e marcado como nao usado na Etapa 2 (Rh).
        this.well2Overlay = this.scene.add.circle
            ? this.scene.add.circle(well2CenterX, well2CenterY, 94, 0x000000, 0.62)
            : this.scene.add.rectangle(well2CenterX, well2CenterY, 184, 184, 0x000000, 0.62);
        this.well2Overlay.setDepth(23);
        this.well2Overlay.setVisible(false);

        this.well2Label = this.scene.add.text(well2CenterX, well2CenterY, 'Não usado\nnesta etapa', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#e5e7eb',
            align: 'center'
        }));
        this.well2Label.setOrigin(0.5);
        this.well2Label.setDepth(24);
        this.well2Label.setVisible(false);

        this.stageBadge = this.scene.add.text(146, 22, 'Etapa 2: Fator Rh', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            padding: { x: 6, y: 3 }
        }));
        this.stageBadge.setOrigin(0.5);
        this.stageBadge.setDepth(42);
        this.stageBadge.setVisible(false);

        this.antiDLabel = this.scene.add.text(ANTI_D_START.x, ANTI_D_START.y + 52, 'Anti-D', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: { x: 4, y: 1 }
        }));
        this.antiDLabel.setOrigin(0.5);
        this.antiDLabel.setDepth(31);
        this.antiDLabel.setVisible(false);
    }

    createBottles() {
        this.items = {
            antiA: this.createItem('frasco-anti-a', ANTI_A_START),
            antiB: this.createItem('frasco-anti-b', ANTI_B_START),
            antiD: this.createItem('frasco-anti-d', ANTI_D_START),
            tube: this.createItem('frasco-cheio', TUBE_START)
        };
        this.items.antiA.wellIndex = 0;
        this.items.antiA.hint = 'O poço 1 é o do Anti-A';
        this.items.antiB.wellIndex = 1;
        this.items.antiB.hint = 'O poço 2 é o do Anti-B';
        this.items.antiD.wellIndex = 0;
        this.items.antiD.hint = 'O poço 2 não é usado nesta etapa. Use o poço 1.';

        this.items.antiA.sprite.on('dragend', () => this.dropSerum(this.items.antiA));
        this.items.antiB.sprite.on('dragend', () => this.dropSerum(this.items.antiB));
        this.items.antiD.sprite.on('dragend', () => this.dropSerum(this.items.antiD));
        this.items.tube.sprite.on('dragend', () => this.dropTube(this.items.tube));
    }

    createItem(key, start) {
        const sprite = this.scene.add.image(start.x, start.y, key);
        sprite.setScale(SPRITE_SCALE);
        sprite.setDepth(30);
        sprite.setInteractive({ useHandCursor: true });
        this.scene.input.setDraggable(sprite);

        sprite.on('dragstart', () => {
            this.isDragging = true;
            sprite.setDepth(31);
        });

        sprite.on('drag', (pointer, dragX, dragY) => {
            sprite.setPosition(dragX, dragY);
        });

        sprite.on('dragend', () => {
            this.isDragging = false;
            sprite.setDepth(30);
        });

        return { sprite, start };
    }

    createDiagnosisButtons() {
        this.diagnosisButtons = DIAGNOSIS_TYPES.map((type, index) => {
            const x = DIAGNOSIS_BUTTONS.startX + index * DIAGNOSIS_BUTTONS.spacing;
            const rect = this.scene.add.rectangle(
                x, DIAGNOSIS_BUTTONS.y, DIAGNOSIS_BUTTONS.width, DIAGNOSIS_BUTTONS.height, 0x2563eb
            );
            rect.setDepth(40);
            rect.setStrokeStyle(2, 0xffffff);
            rect.setInteractive({ useHandCursor: true });

            const label = this.scene.add.text(x, DIAGNOSIS_BUTTONS.y, type, createTextStyle({
                fontSize: '20px',
                color: '#ffffff'
            }));
            label.setOrigin(0.5);
            label.setDepth(41);

            rect.on('pointerup', () => this.handleDiagnosis(type));

            return { type, rect, label };
        });

        // Botoes da Etapa 2 (Rh+ e Rh-) usando o GreenButton reutilizavel.
        this.rhDiagnosisButtons = RH_DIAGNOSIS_OPTIONS.map((option, index) => {
            const pos = RH_BUTTON_POSITIONS[index];
            const button = new GreenButton(this.scene, {
                x: pos.x,
                y: pos.y,
                width: RH_BUTTON_SIZE.width,
                height: RH_BUTTON_SIZE.height,
                label: option.label,
                fontSize: '18px',
                depth: 40,
                onClick: () => this.handleRhDiagnosis(option.value)
            });
            button.setVisible(false);
            button.setEnabled(false);
            return { value: option.value, label: option.label, button };
        });

        this.retryButton = this.scene.add.rectangle(
            RETRY_BUTTON.x, RETRY_BUTTON.y, RETRY_BUTTON.width, RETRY_BUTTON.height, 0xc0392b
        );
        this.retryButton.setDepth(45);
        this.retryButton.setStrokeStyle(2, 0xffffff);
        this.retryButton.setInteractive({ useHandCursor: true });
        this.retryButton.on('pointerdown', () => this.retryButton.setFillStyle(0x8B2E40));
        this.retryButton.on('pointerout', () => this.retryButton.setFillStyle(0xc0392b));
        this.retryButton.on('pointerup', () => {
            this.retryButton.setFillStyle(0xc0392b);
            playSfx(this.scene, 'clique');
            this.retry();
        });

        this.retryLabel = this.scene.add.text(RETRY_BUTTON.x, RETRY_BUTTON.y, 'Tentar de novo', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff'
        }));
        this.retryLabel.setOrigin(0.5);
        this.retryLabel.setDepth(46);

        this.returnButton = this.scene.add.rectangle(
            RETURN_BUTTON.x, RETURN_BUTTON.y, RETURN_BUTTON.width, RETURN_BUTTON.height, 0x16a34a
        );
        this.returnButton.setDepth(45);
        this.returnButton.setStrokeStyle(2, 0xffffff);
        this.returnButton.setInteractive({ useHandCursor: true });
        this.returnButton.on('pointerdown', () => this.returnButton.setFillStyle(0x0e7490));
        this.returnButton.on('pointerout', () => this.returnButton.setFillStyle(0x16a34a));
        this.returnButton.on('pointerup', () => {
            this.returnButton.setFillStyle(0x16a34a);
            playSfx(this.scene, 'clique');
            this.scene.returnToMap({ failed: true });
        });

        this.returnLabel = this.scene.add.text(RETURN_BUTTON.x, RETURN_BUTTON.y, 'Voltar ao mapa', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff'
        }));
        this.returnLabel.setOrigin(0.5);
        this.returnLabel.setDepth(46);
    }

    createTexts() {
        this.heartsDisplay = new HeartsDisplay(this.scene, this.state, {
            x: HEARTS_POSITION.x,
            y: HEARTS_POSITION.y,
            originX: 1,
            originY: 0,
            depth: 100
        });
        this.heartsText = this.heartsDisplay.text;

        this.hintText = this.scene.add.text(HINT_POSITION.x, HINT_POSITION.y, '', createTextStyle({
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            align: 'center',
            wordWrap: { width: 460 }
        }));
        this.hintText.setOrigin(0.5);
        this.hintText.setDepth(45);

        this.phaseText = this.scene.add.text(256, 40, '', createTextStyle({
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000'
        }));
        this.phaseText.setOrigin(0.5);
        this.phaseText.setDepth(100);
    }

    createDebugOutline() {
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(50);
        this.debugGraphics.lineStyle(2, 0xff00ff, 1);
        this.wells.forEach(({ area }) => {
            this.debugGraphics.strokeRect(area.x, area.y, area.width, area.height);
        });
        this.diagnosisButtons.forEach(({ rect }) => {
            this.debugGraphics.strokeRect(
                rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height
            );
        });
        this.debugGraphics.setVisible(false);

        // Tecla D liga e desliga os contornos de depuracao.
        this.debugKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.debugKey.on('down', () => {
            if (this.isActive && !this.scene?.pauseMenu?.isOpen) {
                this.debugGraphics.setVisible(!this.debugGraphics.visible);
            }
        });
    }

    setAboButtonsVisible(visible) {
        this.diagnosisButtons.forEach(({ rect, label }) => {
            rect.setVisible(visible);
            label.setVisible(visible);
            if (!visible && rect.input) {
                rect.input.enabled = false;
            }
        });
    }

    setRhButtonsVisible(visible) {
        this.rhDiagnosisButtons.forEach(({ button }) => {
            button.setVisible(visible);
        });
    }

    setRhDiagnosisEnabled(enabled) {
        this.rhDiagnosisButtons.forEach(({ button }) => {
            button.setEnabled(enabled);
            button.setAlpha(enabled ? 1 : 0.4);
        });
    }

    setRhVisualsVisible(visible) {
        this.well2Overlay?.setVisible(visible);
        this.well2Label?.setVisible(visible);
        this.stageBadge?.setVisible(visible);
        this.antiDLabel?.setVisible(visible);
    }

    // Volta a Etapa 1 (ABO) para o inicio: pocos vazios, frascos Anti-A/Anti-B e tubo nos lugares.
    reset() {
        this.stage = 'ABO';
        this.setRhVisualsVisible(false);
        this.setRhButtonsVisible(false);
        this.setRhDiagnosisEnabled(false);
        this.setAboButtonsVisible(true);

        this.wells.forEach((well) => {
            well.state = 'EMPTY';
            well.mixDistance = 0;
            this.updateWellImage(well);
        });

        ['antiA', 'antiB', 'tube'].forEach((key) => {
            const { sprite, start } = this.items[key];
            sprite.setPosition(start.x, start.y);
            sprite.setVisible(true);
            this.scene.input.setDraggable(sprite, true);
        });

        this.items.antiD.sprite.setVisible(false);
        this.scene.input.setDraggable(this.items.antiD.sprite, false);

        this.setDiagnosisEnabled(false);
        this.hideFailureButtons();
        this.clearCellSprite();
        this.clearAntiDDropAnimation();
        this.hintText.setPosition(HINT_POSITION.x, HINT_POSITION.y);
        this.hintText.setText('');
        this.progressBar.clear();
        this.lastPointer = null;
        this.updateHearts();
    }

    // Inicia ou reinicia apenas a Etapa 2 (fator Rh com soro Anti-D no poco 1).
    startRhStage() {
        this.resetRhStage();
        this.scene.tutorialManager?.startMinigamePhase('minigameFase2Rh');
    }

    resetRhStage() {
        this.stage = 'RH';
        this.isConfirmed = false;
        this.setAboButtonsVisible(false);
        this.setRhVisualsVisible(true);
        this.setRhButtonsVisible(true);
        this.setRhDiagnosisEnabled(false);

        this.wells.forEach((well) => {
            well.state = 'EMPTY';
            well.mixDistance = 0;
            this.updateWellImage(well);
        });

        ['antiA', 'antiB'].forEach((key) => {
            const { sprite } = this.items[key];
            sprite.setVisible(false);
            this.scene.input.setDraggable(sprite, false);
        });

        ['antiD', 'tube'].forEach((key) => {
            const { sprite, start } = this.items[key];
            sprite.setPosition(start.x, start.y);
            sprite.setVisible(true);
            this.scene.input.setDraggable(sprite, true);
        });

        this.hideFailureButtons();
        this.clearCellSprite();
        this.clearAntiDDropAnimation();
        this.hintText.setPosition(HINT_POSITION.x, HINT_POSITION.y);
        this.hintText.setText('');
        this.progressBar.clear();
        this.lastPointer = null;
        this.updateHearts();
    }

    hideFailureButtons() {
        this.retryButton.setVisible(false);
        this.retryButton.input.enabled = false;
        this.retryLabel.setVisible(false);
        this.returnButton.setVisible(false);
        this.returnButton.input.enabled = false;
        this.returnLabel.setVisible(false);
    }

    clearCellSprite() {
        if (this.cellSprite) {
            this.cellSprite.destroy();
            this.cellSprite = null;
        }
    }

    clearAntiDDropAnimation() {
        this.antiDDropTween?.stop?.();
        this.antiDDropTween = null;
        this.antiDDropSprite?.destroy?.();
        this.antiDDropSprite = null;
    }

    playAntiDDropAnimation(fromX, fromY, well) {
        if (!this.scene?.textures?.exists?.('anticorpo-anti-d') || !this.scene?.tweens?.add) {
            return;
        }
        this.clearAntiDDropAnimation();

        const targetX = well.area.x + well.area.width / 2;
        const targetY = well.area.y + well.area.height / 2;
        const startX = typeof fromX === 'number' ? fromX : ANTI_D_START.x;
        const startY = typeof fromY === 'number' ? fromY : ANTI_D_START.y;

        const sprite = this.scene.add.image(startX, startY, 'anticorpo-anti-d');
        sprite.setOrigin(0.5);
        sprite.setScale(0.65);
        sprite.setDepth(35);
        if (sprite.texture) {
            sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        this.antiDDropSprite = sprite;

        this.antiDDropTween = this.scene.tweens.add({
            targets: sprite,
            x: targetX,
            y: targetY,
            scale: 0.9,
            alpha: 0,
            duration: 320,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.antiDDropTween = null;
                this.antiDDropSprite?.destroy?.();
                this.antiDDropSprite = null;
            }
        });
    }

    updateWellImage(well) {
        if (this.stage === 'RH') {
            if (well.index === 1) {
                well.image.setTexture('bancada-vazia');
            } else {
                const rhKeys = {
                    EMPTY: 'bancada-vazia',
                    SERUM: 'bancada-antid-soro',
                    BLOOD: 'bancada-antid-sangue',
                    MIXED: RH_RESULT_FRAMES[this.patientRh]
                };
                well.image.setTexture(rhKeys[well.state]);
            }
            well.image.setCrop(well.index * BENCH_HALF_WIDTH, 0, BENCH_HALF_WIDTH, BENCH_HEIGHT);
            return;
        }

        const keys = {
            EMPTY: 'bancada-vazia',
            SERUM: 'bancada-soros',
            BLOOD: 'bancada-sangue',
            MIXED: BENCH_RESULT_FRAMES[this.patientType]
        };

        well.image.setTexture(keys[well.state]);
        // O crop mostra so a metade do quadro que pertence a este poco.
        well.image.setCrop(well.index * BENCH_HALF_WIDTH, 0, BENCH_HALF_WIDTH, BENCH_HEIGHT);
    }

    findWellAt(x, y) {
        return this.wells.find(({ area }) => area.contains(x, y)) || null;
    }

    returnItem(item) {
        item.sprite.setPosition(item.start.x, item.start.y);
    }

    dropSerum(item) {
        const well = this.findWellAt(item.sprite.x, item.sprite.y);

        if (!well) {
            this.returnItem(item);
            return;
        }

        if (well.index !== item.wellIndex) {
            // Poco trocado ou poco 2 na Etapa 2: nao e erro, so uma dica.
            playSfx(this.scene, 'bloqueado');
            this.returnItem(item);
            this.showHint(item.hint);
            return;
        }

        playSfx(this.scene, 'clique');
        const dropX = item.sprite.x;
        const dropY = item.sprite.y;
        well.state = 'SERUM';
        this.updateWellImage(well);
        item.sprite.setVisible(false);
        this.scene.input.setDraggable(item.sprite, false);
        if (item === this.items.antiD) {
            this.playAntiDDropAnimation(dropX, dropY, well);
        }
    }

    dropTube(item) {
        const well = this.findWellAt(item.sprite.x, item.sprite.y);
        this.returnItem(item);

        if (!well) {
            return;
        }

        if (this.stage === 'RH' && well.index === 1) {
            playSfx(this.scene, 'bloqueado');
            this.showHint('O poço 2 não é usado nesta etapa. Use o poço 1.');
            return;
        }

        if (well.state === 'EMPTY') {
            playSfx(this.scene, 'bloqueado');
            this.showHint(
                this.stage === 'RH'
                    ? 'Pingue o soro Anti-D no poço 1 antes do sangue'
                    : 'Pingue o soro no poço antes do sangue'
            );
            return;
        }

        if (well.state === 'SERUM') {
            playSfx(this.scene, 'clique');
            well.state = 'BLOOD';
            well.mixDistance = 0;
            this.updateWellImage(well);
        }
    }

    showHint(message) {
        const captionOpen = Boolean(this.scene.tutorialManager?.caption?.isOpen);
        this.hintText.setPosition(HINT_POSITION.x, captionOpen ? 358 : HINT_POSITION.y);
        this.hintText.setDepth(captionOpen ? 130 : 45);
        this.hintText.setText(message);

        if (this.hintTimer) {
            this.hintTimer.remove(false);
        }
        this.hintTimer = this.scene.time.delayedCall(HINT_MS, () => {
            this.hintText.setText('');
        });
    }

    setDiagnosisEnabled(enabled) {
        this.diagnosisButtons.forEach(({ rect, label }) => {
            rect.input.enabled = enabled;
            rect.setAlpha(enabled ? 1 : 0.4);
            label.setAlpha(enabled ? 1 : 0.4);
        });
    }

    updateHearts() {
        if (this.heartsDisplay) {
            this.heartsDisplay.update();
        }
    }

    // Aglutinacao na Etapa 1: poco 1 (Anti-A) reage em A e AB; poco 2 (Anti-B) reage em B e AB.
    agglutinates(wellIndex) {
        return aboAgglutinates(this.patientType, wellIndex);
    }

    handleDiagnosis(type) {
        if (this.stage !== 'ABO' || this.isConfirmed || this.state.isFailed) {
            return;
        }
        this.scene.tutorialManager?.completeCurrentSection();
        this.hintText.setDepth(45);
        if (type === this.patientType) {
            this.handleCorrect(type);
            return;
        }

        this.handleWrong();
    }

    handleCorrect(type) {
        this.isConfirmed = true;
        playSfx(this.scene, 'acerto');
        this.setDiagnosisEnabled(false);
        if (this.guideButton) {
            this.guideButton.setVisible(false);
            this.guideButton.input.enabled = false;
        }
        if (this.guidePanel?.isOpen) {
            this.guidePanel.close();
        }

        const cellKey = `hemacia-${type}`;
        if (this.scene.textures.exists(cellKey)) {
            this.cellSprite = this.scene.add.image(HINT_POSITION.x - 110, HINT_POSITION.y, cellKey);
            this.cellSprite.setOrigin(0.5);
            this.cellSprite.setDepth(45);
            this.cellSprite.setScale(1);
            if (this.cellSprite.texture) {
                this.cellSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        }
        this.hintText.setPosition(HINT_POSITION.x + 25, HINT_POSITION.y);

        // Nas Cidades 2 e 3 (rhEnabled), nao revela +/− nem grava ainda: segue para a Etapa 2 (Anti-D).
        if (this.rhEnabled) {
            this.hintText.setText(`Tipo ${type} confirmado!\nAgora teste o fator Rh.`);
            this.confirmTimer = this.scene.time.delayedCall(CONFIRM_MS, () => {
                this.confirmTimer = null;
                this.clearCellSprite();
                this.hintText.setPosition(HINT_POSITION.x, HINT_POSITION.y);
                this.hintText.setText('');
                if (this.guideButton) {
                    this.guideButton.setVisible(true);
                    this.guideButton.input.enabled = true;
                }
                this.startRhStage();
            });
            return;
        }

        // Cidade 1: apenas ABO, grava e segue direto para a Fase 3.
        const confirmedType = formatConfirmedBloodType(type, this.patientRh, false);
        setDiscoveredType(this.characterId, confirmedType);
        this.state.advance();
        this.hintText.setText(`Tipo ${confirmedType} confirmado`);

        this.confirmTimer = this.scene.time.delayedCall(CONFIRM_MS, () => {
            this.confirmTimer = null;
            this.finishTypingPhase(confirmedType);
        });
    }

    handleRhDiagnosis(rhValue) {
        if (this.stage !== 'RH' || this.isConfirmed || this.state.isFailed) {
            return;
        }
        this.scene.tutorialManager?.completeCurrentSection();
        this.hintText.setDepth(45);
        if (rhValue === this.patientRh) {
            this.handleRhCorrect();
            return;
        }

        this.handleRhWrong();
    }

    handleRhCorrect() {
        this.isConfirmed = true;
        playSfx(this.scene, 'acerto');
        this.setRhDiagnosisEnabled(false);
        if (this.guideButton) {
            this.guideButton.setVisible(false);
            this.guideButton.input.enabled = false;
        }
        if (this.guidePanel?.isOpen) {
            this.guidePanel.close();
        }

        const fullType = formatConfirmedBloodType(this.patientType, this.patientRh, true);
        setDiscoveredType(this.characterId, fullType);
        this.state.advance();

        const rhCellKey = this.patientRh === '+' ? 'hemacia-rh-pos' : 'hemacia-rh-neg';
        if (this.scene.textures.exists(rhCellKey)) {
            this.cellSprite = this.scene.add.image(HINT_POSITION.x - 115, HINT_POSITION.y, rhCellKey);
            this.cellSprite.setOrigin(0.5);
            this.cellSprite.setDepth(45);
            this.cellSprite.setScale(1);
            if (this.cellSprite.texture) {
                this.cellSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        }
        this.hintText.setPosition(HINT_POSITION.x + 25, HINT_POSITION.y);
        this.hintText.setText(`Tipo ${fullType} confirmado`);

        this.confirmTimer = this.scene.time.delayedCall(CONFIRM_MS, () => {
            this.confirmTimer = null;
            this.finishTypingPhase(fullType);
        });
    }

    handleRhWrong() {
        const result = this.state.registerError();
        this.updateHearts();

        if (!result.failed) {
            playSfx(this.scene, 'erro');
            this.hintText.setPosition(HINT_POSITION.x, HINT_POSITION.y);
            this.hintText.setText(RH_NEUTRAL_ERROR_HINT);
            return;
        }

        playSfx(this.scene, 'derrota');
        this.setRhDiagnosisEnabled(false);
        this.setRhButtonsVisible(false);
        if (this.guideButton) {
            this.guideButton.setVisible(false);
            this.guideButton.input.enabled = false;
        }
        if (this.guidePanel?.isOpen) {
            this.guidePanel.close();
        }
        this.hintText.setPosition(HINT_POSITION.x, HINT_POSITION.y - 12);
        this.hintText.setText(getRhFailureExplanation(this.patientRh));
        this.showFailureButtons();
    }

    finishTypingPhase(confirmedType) {
        this.clearCellSprite();
        this.hintText.setPosition(HINT_POSITION.x, HINT_POSITION.y);
        this.hintText.setText('');
        this.isActive = false;
        this.debugGraphics.setVisible(false);

        if (typeof this.onComplete === 'function') {
            this.destroy();
            this.onComplete(confirmedType);
        } else {
            this.phaseText.setText('Fase 3 em breve');
        }
    }

    showFailureButtons() {
        this.retryButton.setVisible(true);
        this.retryButton.input.enabled = true;
        this.retryLabel.setVisible(true);
        this.returnButton.setVisible(true);
        this.returnButton.input.enabled = true;
        this.returnLabel.setVisible(true);
    }

    destroy() {
        this.isActive = false;
        if (this.hintTimer) {
            this.hintTimer.remove(false);
            this.hintTimer = null;
        }
        if (this.confirmTimer) {
            this.confirmTimer.remove(false);
            this.confirmTimer = null;
        }
        if (this.debugKey) {
            this.debugKey.removeAllListeners();
        }
        this.wells.forEach((well) => well.image?.destroy?.());
        Object.values(this.items).forEach((item) => item.sprite?.destroy?.());
        this.diagnosisButtons.forEach(({ rect, label }) => {
            rect?.destroy?.();
            label?.destroy?.();
        });
        this.rhDiagnosisButtons.forEach(({ button }) => button?.destroy?.());
        this.rhDiagnosisButtons = [];
        this.well2Overlay?.destroy?.();
        this.well2Label?.destroy?.();
        this.stageBadge?.destroy?.();
        this.antiDLabel?.destroy?.();
        this.clearAntiDDropAnimation();
        this.retryButton?.destroy?.();
        this.retryLabel?.destroy?.();
        this.returnButton?.destroy?.();
        this.returnLabel?.destroy?.();
        this.heartsDisplay?.destroy?.();
        this.clearCellSprite();
        this.hintText?.destroy?.();
        this.phaseText?.destroy?.();
        this.progressBar?.destroy?.();
        this.debugGraphics?.destroy?.();
        if (this.guideButton) {
            this.guideButton.destroy();
            this.guideButton = null;
        }
        if (this.guidePanel) {
            this.guidePanel.destroy();
            this.guidePanel = null;
        }
    }

    handleWrong() {
        const result = this.state.registerError();
        this.updateHearts();

        // Explica o que aconteceu em cada poco, sem revelar o tipo.
        const describe = (index) => `Poço ${index + 1}: ${this.agglutinates(index) ? 'aglutinou' : 'não aglutinou'}`;
        const explanation = `${describe(0)}. ${describe(1)}.`;

        if (!result.failed) {
            playSfx(this.scene, 'erro');
            this.hintText.setText(`Não é esse tipo. ${explanation}`);
            return;
        }

        playSfx(this.scene, 'derrota');
        this.setDiagnosisEnabled(false);
        if (this.guideButton) {
            this.guideButton.setVisible(false);
            this.guideButton.input.enabled = false;
        }
        if (this.guidePanel?.isOpen) {
            this.guidePanel.close();
        }
        this.hintText.setText(`${explanation}\nA resposta correta era o tipo ${this.patientType}.`);
        this.showFailureButtons();
    }

    retry() {
        this.state.retry();
        if (this.guideButton) {
            this.guideButton.setVisible(true);
            this.guideButton.input.enabled = true;
        }
        if (this.stage === 'RH') {
            this.resetRhStage();
            return;
        }
        this.reset();
    }

    updateMixing() {
        const pointer = this.scene.input.activePointer;

        if (!pointer.isDown || this.isDragging) {
            this.lastPointer = null;
            return;
        }

        if (this.lastPointer) {
            this.wells.forEach((well) => {
                if (well.state !== 'BLOOD') {
                    return;
                }

                // So conta a distancia percorrida com o botao pressionado dentro do poco.
                if (well.area.contains(pointer.x, pointer.y) && well.area.contains(this.lastPointer.x, this.lastPointer.y)) {
                    well.mixDistance += Phaser.Math.Distance.Between(
                        this.lastPointer.x, this.lastPointer.y, pointer.x, pointer.y
                    );

                    if (well.mixDistance >= MIX_DISTANCE) {
                        well.state = 'MIXED';
                        this.updateWellImage(well);
                    }
                }
            });
        }

        this.lastPointer = { x: pointer.x, y: pointer.y };

        if (this.stage === 'RH') {
            if (this.wells[0].state === 'MIXED' && !this.state.isFailed && !this.isConfirmed) {
                this.setRhDiagnosisEnabled(true);
            }
            return;
        }

        if (this.wells.every(({ state }) => state === 'MIXED') && !this.state.isFailed && !this.isConfirmed) {
            this.setDiagnosisEnabled(true);
        }
    }

    drawProgressBars() {
        this.progressBar.clear();

        this.wells.forEach(({ area, state, mixDistance }) => {
            if (state !== 'BLOOD' || mixDistance <= 0) {
                return;
            }

            const y = area.y + area.height + MIX_BAR.offsetY;
            const ratio = Math.min(1, mixDistance / MIX_DISTANCE);

            this.progressBar.fillStyle(0x000000, 0.7);
            this.progressBar.fillRect(area.x, y, area.width, MIX_BAR.height);
            this.progressBar.fillStyle(0xc0392b, 1);
            this.progressBar.fillRect(area.x, y, area.width * ratio, MIX_BAR.height);
        });
    }

    update() {
        if (!this.isActive) {
            return;
        }

        this.updateMixing();
        this.drawProgressBars();
    }
}
