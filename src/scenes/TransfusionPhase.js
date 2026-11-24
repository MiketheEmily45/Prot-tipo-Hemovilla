// Fase 3 do minigame: transfusao de sangue.
import { CHAIR_AREA } from './Minigame.js';
import { characterData } from './characterData.js';
import {
    canReceive,
    incompatibilityReason,
    drawRound
} from './bloodCompatibility.js';
import {
    getCharacterOccurrenceRules,
    resolveBloodTypeWithRh
} from './cityOccurrenceConfig.js';
import { HeartsDisplay } from './HeartsDisplay.js';
import { createTextStyle } from './textUtils.js';
import { addATP, markCharacterAttended } from './atpStore.js';
import { onAttendanceSuccess } from './occurrenceState.js';
import { markAttendanceJustCompleted } from './tutorialState.js';
import { GuidePanel } from './GuidePanel.js';
import { playSfx } from './AudioManager.js';
import { MinigameHintHelper } from './MinigameHintHelper.js';
import { getCharacterReplacement } from './shopStore.js';

// Configuracao da Fase 3 (regras de Rh e bolsas contaminadas por cidade ficam em cityOccurrenceConfig.js)
const REQUIRED_BAGS = 1;
const GREEN_GLOW_MS = 600;
const BAG_SCALE = 1.4;

// Centro e dimensoes do conteudo visivel da arte da bolsa (64x64)
const BAG_VISIBLE_WIDTH = 31;
const BAG_VISIBLE_HEIGHT = 35;
const BAG_ORIGIN = { x: 33.5 / 64, y: 20.5 / 64 };

// Posicoes configuraveis
const HEARTS_POSITION = { x: 100, y: 16 };
// Icone 64x64 centrado em (456, 56): borda direita em 488 (24 px da direita) e borda superior em 24 (24 px do topo).
const PORTRAIT_POSITION = { x: 456, y: 56 };
const TYPE_LABEL_OFFSET = { x: 0, y: 32 };
const TYPE_BOX_HEIGHT = 22;
const BAG_SLOT_Y = 440;
const DEFAULT_FOUR_BAG_SLOTS = [
    { x: 80, y: BAG_SLOT_Y },
    { x: 196, y: BAG_SLOT_Y },
    { x: 312, y: BAG_SLOT_Y },
    { x: 428, y: BAG_SLOT_Y }
];

export function getCharacterPortraitKey(characterId) {
    const displayedCharacterId = getCharacterReplacement(characterId);
    return displayedCharacterId
        ? `extra-${displayedCharacterId}-icon`
        : `${characterId}-icon`;
}

export function getBagSlots(count) {
    if (count === 3) {
        return [
            { x: 128, y: BAG_SLOT_Y },
            { x: 256, y: BAG_SLOT_Y },
            { x: 384, y: BAG_SLOT_Y }
        ];
    }
    if (count === 4) {
        return DEFAULT_FOUR_BAG_SLOTS;
    }
    if (count === 5) {
        return [
            { x: 64, y: BAG_SLOT_Y },
            { x: 160, y: BAG_SLOT_Y },
            { x: 256, y: BAG_SLOT_Y },
            { x: 352, y: BAG_SLOT_Y },
            { x: 448, y: BAG_SLOT_Y }
        ];
    }
    const safeCount = Math.max(1, count);
    if (safeCount === 1) {
        return [{ x: 256, y: BAG_SLOT_Y }];
    }
    const minX = 56;
    const maxX = 456;
    const step = (maxX - minX) / (safeCount - 1);
    return Array.from({ length: safeCount }, (_, i) => ({
        x: Math.round(minX + i * step),
        y: BAG_SLOT_Y
    }));
}

const MESSAGE_BOX = { x: 256, y: 365 };
const FAILURE_RETRY_BUTTON = { x: 176, y: 400, width: 144, height: 32 };
const FAILURE_RETURN_BUTTON = { x: 336, y: 400, width: 144, height: 32 };
const GUIDE_BUTTON = { x: 360, y: 8, scale: 1 };
const RESULT_PANEL = { x: 256, y: 256, width: 380, height: 240 };
const RESULT_RETURN_BUTTON = { x: 256, y: 340, width: 180, height: 40 };

export class TransfusionPhase {
    constructor(scene, state, { characterId, cityIndex } = {}) {
        this.scene = scene;
        this.state = state;
        this.characterId = characterId;
        this.cityIndex = typeof cityIndex === 'number' ? cityIndex : scene?.cityIndex;
        this.occurrenceRules = getCharacterOccurrenceRules(characterId, this.cityIndex);
        this.rhEnabled = this.occurrenceRules.rhEnabled;
        this.contaminatedCount = this.occurrenceRules.contaminatedBags;
        this.bagCount = this.occurrenceRules.totalBags;
        this.bagSlots = getBagSlots(this.bagCount);
        this.patientType = this.resolvePatientType(characterId);
        this.compatibleCount = 0;
        this.isActive = true;
        this.bagItems = [];
        this.xMarkers = [];

        this.setupHUD();
        this.setupMessageArea();
        this.hintHelper = new MinigameHintHelper(this.scene, { y: 384, depth: 90 });
        this.setupRound();
        this.setupDebugOutline();
    }

    resolvePatientType(characterId) {
        const data = characterData[characterId];
        const baseAbo = (data && data.tipoSanguineo) ? data.tipoSanguineo : 'A';
        return resolveBloodTypeWithRh(characterId, baseAbo, this.occurrenceRules?.city);
    }

    setupHUD() {
        const portraitKey = getCharacterPortraitKey(this.characterId);
        if (this.scene.textures.exists(portraitKey)) {
            this.portrait = this.scene.add.image(PORTRAIT_POSITION.x, PORTRAIT_POSITION.y, portraitKey);
            this.portrait.setOrigin(0.5, 0.5);
            this.portrait.setDepth(40);
        }

        const displayType = this.rhEnabled
            ? this.patientType
            : this.patientType.replace(/[+-]/g, '');

        const typeX = PORTRAIT_POSITION.x + TYPE_LABEL_OFFSET.x;
        const typeY = PORTRAIT_POSITION.y + TYPE_LABEL_OFFSET.y;
        const portraitWidth = this.portrait?.displayWidth || 64;

        this.typeText = this.scene.add.text(typeX, typeY + TYPE_BOX_HEIGHT / 2, `Tipo: ${displayType}`, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff'
        }));
        this.typeText.setOrigin(0.5, 0.5);
        this.typeText.setDepth(41);

        const typeBoxWidth = Math.max(portraitWidth, Math.ceil((this.typeText.width || 64) + 10));
        this.typeBg = this.scene.add.rectangle(
            typeX,
            typeY,
            typeBoxWidth,
            TYPE_BOX_HEIGHT,
            0x000000,
            0.65
        );
        this.typeBg.setOrigin(0.5, 0);
        this.typeBg.setDepth(40);

        this.heartsDisplay = new HeartsDisplay(this.scene, this.state, {
            x: HEARTS_POSITION.x,
            y: HEARTS_POSITION.y,
            originX: 0,
            originY: 0,
            depth: 40
        });

        const heartsWidth = this.heartsDisplay.sprite?.displayWidth || 64;
        this.transfusionLabel = this.scene.add.text(
            HEARTS_POSITION.x + heartsWidth / 2,
            HEARTS_POSITION.y + 10,
            'Transfusão',
            createTextStyle({
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                padding: { x: 4, y: 2 }
            })
        );
        this.transfusionLabel.setOrigin(0.5, 1);
        this.transfusionLabel.setDepth(40);

        this.guidePanel = new GuidePanel(this.scene, this.state, {
            onToggleVisibility: (visible) => {
                if (this.guideButton && this.isActive && !this.state.isFailed) {
                    this.guideButton.setVisible(visible);
                    this.guideButton.input.enabled = visible;
                }
            }
        });
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

    setupMessageArea() {
        this.messageText = this.scene.add.text(MESSAGE_BOX.x, MESSAGE_BOX.y, '', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: { x: 8, y: 4 },
            align: 'center',
            wordWrap: { width: 460 }
        }));
        this.messageText.setOrigin(0.5);
        this.messageText.setDepth(45);
        this.messageText.setVisible(false);

        this.retryButton = this.scene.add.rectangle(
            FAILURE_RETRY_BUTTON.x,
            FAILURE_RETRY_BUTTON.y,
            FAILURE_RETRY_BUTTON.width,
            FAILURE_RETRY_BUTTON.height,
            0xc0392b
        );
        this.retryButton.setDepth(45);
        this.retryButton.setStrokeStyle(2, 0xffffff);
        this.retryButton.setInteractive({ useHandCursor: true });
        this.retryButton.setVisible(false);
        this.retryButton.on('pointerdown', () => this.retryButton.setFillStyle(0x8B2E40));
        this.retryButton.on('pointerout', () => this.retryButton.setFillStyle(0xc0392b));
        this.retryButton.on('pointerup', () => {
            this.retryButton.setFillStyle(0xc0392b);
            playSfx(this.scene, 'clique');
            this.retry();
        });

        this.retryLabel = this.scene.add.text(FAILURE_RETRY_BUTTON.x, FAILURE_RETRY_BUTTON.y, 'Tentar de novo', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff'
        }));
        this.retryLabel.setOrigin(0.5);
        this.retryLabel.setDepth(46);
        this.retryLabel.setVisible(false);

        this.returnButton = this.scene.add.rectangle(
            FAILURE_RETURN_BUTTON.x,
            FAILURE_RETURN_BUTTON.y,
            FAILURE_RETURN_BUTTON.width,
            FAILURE_RETURN_BUTTON.height,
            0x16a34a
        );
        this.returnButton.setDepth(45);
        this.returnButton.setStrokeStyle(2, 0xffffff);
        this.returnButton.setInteractive({ useHandCursor: true });
        this.returnButton.setVisible(false);
        this.returnButton.on('pointerdown', () => this.returnButton.setFillStyle(0x0e7490));
        this.returnButton.on('pointerout', () => this.returnButton.setFillStyle(0x16a34a));
        this.returnButton.on('pointerup', () => {
            this.returnButton.setFillStyle(0x16a34a);
            playSfx(this.scene, 'clique');
            this.scene.returnToMap({ failed: true });
        });

        this.returnLabel = this.scene.add.text(FAILURE_RETURN_BUTTON.x, FAILURE_RETURN_BUTTON.y, 'Voltar ao mapa', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff'
        }));
        this.returnLabel.setOrigin(0.5);
        this.returnLabel.setDepth(46);
        this.returnLabel.setVisible(false);
    }

    showMessage(text) {
        this.messageText.setText(text);
        this.messageText.setVisible(Boolean(text));
    }

    clearMessage() {
        this.messageText.setText('');
        this.messageText.setVisible(false);
    }

    setupRound() {
        this.clearBags();
        this.clearXMarkers();

        const bagTypes = drawRound({
            patientType: this.patientType,
            count: this.bagCount,
            contaminatedCount: this.contaminatedCount,
            rhEnabled: this.rhEnabled
        });

        this.bagSlots = getBagSlots(bagTypes.length);

        const slotWidth = BAG_VISIBLE_WIDTH * BAG_SCALE;
        const slotHeight = BAG_VISIBLE_HEIGHT * BAG_SCALE;

        this.slotPlates = this.bagSlots.map((slot) => {
            const plate = this.scene.add.rectangle(
                slot.x,
                slot.y,
                slotWidth + 10,
                slotHeight + 10,
                0x000000,
                0.45
            );
            plate.setStrokeStyle(1, 0xffffff, 0.3);
            plate.setDepth(15);
            return plate;
        });

        this.bagItems = bagTypes.map((bagType, index) => {
            const slot = this.bagSlots[index];
            const textureKey = `bolsa-${bagType}`;
            const sprite = this.scene.add.image(slot.x, slot.y, textureKey);
            sprite.setOrigin(BAG_ORIGIN.x, BAG_ORIGIN.y);
            sprite.setScale(BAG_SCALE);
            sprite.setDepth(30);
            if (sprite.texture) {
                sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }

            // Area de clique/arrasto centralizada no conteudo visivel da bolsa
            sprite.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(18, 3, BAG_VISIBLE_WIDTH, BAG_VISIBLE_HEIGHT),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                useHandCursor: true
            });
            this.scene.input.setDraggable(sprite);

            const bagItem = {
                bagType,
                slot,
                sprite,
                used: false
            };

            sprite.on('dragstart', () => {
                sprite.setDepth(50);
                this.hintHelper?.notifyAction();
            });

            sprite.on('drag', (pointer, dragX, dragY) => {
                sprite.setPosition(dragX, dragY);
            });

            sprite.on('dragend', () => {
                this.handleBagDrop(bagItem);
            });

            return bagItem;
        });
    }

    clearBags() {
        if (this.slotPlates) {
            this.slotPlates.forEach((plate) => plate.destroy());
            this.slotPlates = [];
        }
        if (this.bagItems) {
            this.bagItems.forEach((item) => {
                item.sprite.destroy();
            });
            this.bagItems = [];
        }
    }

    clearXMarkers() {
        if (this.xMarkers) {
            this.xMarkers.forEach((marker) => marker.destroy());
            this.xMarkers = [];
        }
    }

    drawRedX(x, y) {
        const width = BAG_VISIBLE_WIDTH * BAG_SCALE;
        const height = BAG_VISIBLE_HEIGHT * BAG_SCALE;
        const left = x - width / 2;
        const top = y - height / 2;
        const right = x + width / 2;
        const bottom = y + height / 2;

        const dimGraphics = this.scene.add.graphics();
        dimGraphics.setDepth(34);
        dimGraphics.fillStyle(0x000000, 0.55);
        dimGraphics.fillRect(left, top, width, height);
        this.xMarkers.push(dimGraphics);

        const xGraphics = this.scene.add.graphics();
        xGraphics.setDepth(35);
        xGraphics.lineStyle(3, 0xff0000, 0.95);
        xGraphics.lineBetween(left, top, right, bottom);
        xGraphics.lineBetween(right, top, left, bottom);
        this.xMarkers.push(xGraphics);
    }

    handleBagDrop(bagItem) {
        this.hintHelper?.notifyAction();
        const chair = new Phaser.Geom.Rectangle(
            CHAIR_AREA.x,
            CHAIR_AREA.y,
            CHAIR_AREA.width,
            CHAIR_AREA.height
        );

        const droppedOnChair = chair.contains(bagItem.sprite.x, bagItem.sprite.y);

        if (!droppedOnChair) {
            bagItem.sprite.setPosition(bagItem.slot.x, bagItem.slot.y);
            bagItem.sprite.setDepth(30);
            return;
        }

        this.scene.tutorialManager?.completeCurrentSection();

        const isCompatible = canReceive(this.patientType, bagItem.bagType, { rhEnabled: this.rhEnabled });

        if (isCompatible) {
            this.handleCompatibleDrop(bagItem);
        } else {
            this.handleIncompatibleDrop(bagItem);
        }
    }

    handleCompatibleDrop(bagItem) {
        bagItem.used = true;
        bagItem.sprite.setVisible(false);
        this.scene.input.setDraggable(bagItem.sprite, false);

        if (this.portrait) {
            this.portrait.setTint(0x55ff55);
            this.scene.time.delayedCall(GREEN_GLOW_MS, () => {
                if (this.portrait) {
                    this.portrait.clearTint();
                }
            });
        }

        this.compatibleCount++;
        this.clearMessage();

        if (this.compatibleCount >= REQUIRED_BAGS) {
            const result = this.state.complete();
            addATP(result.atp);
            markCharacterAttended(this.characterId);
            onAttendanceSuccess(this.characterId);
            // Tutorial: o mapa mostra a secao D ao voltar; a legenda do minigame, se aberta, e encerrada.
            markAttendanceJustCompleted();
            this.scene.tutorialManager?.onAttendanceCompleted();

            playSfx(this.scene, 'vitoria');
            this.showResultScreen(result);
        } else {
            playSfx(this.scene, 'acerto');
        }
    }

    handleIncompatibleDrop(bagItem) {
        const errorResult = this.state.registerError();
        this.heartsDisplay.update();

        bagItem.sprite.setPosition(bagItem.slot.x, bagItem.slot.y);
        bagItem.sprite.setDepth(30);
        bagItem.sprite.setTint(0x777777);
        this.scene.input.setDraggable(bagItem.sprite, false);

        this.drawRedX(bagItem.slot.x, bagItem.slot.y);

        if (errorResult.failed) {
            playSfx(this.scene, 'derrota');
            this.handleFailure();
        } else {
            playSfx(this.scene, 'erro');
            const reason = incompatibilityReason(this.patientType, bagItem.bagType, { rhEnabled: this.rhEnabled });
            this.showMessage(reason);
        }
    }

    handleFailure() {
        if (this.guideButton) {
            this.guideButton.setVisible(false);
            this.guideButton.input.enabled = false;
        }
        if (this.guidePanel?.isOpen) {
            this.guidePanel.close();
        }
        this.bagItems.forEach((b) => {
            this.scene.input.setDraggable(b.sprite, false);
        });

        const compatibleBags = this.bagItems
            .filter((b) => canReceive(this.patientType, b.bagType, { rhEnabled: this.rhEnabled }))
            .map((b) => b.bagType);

        this.showMessage(`Atendimento falhou!\nBolsas compatíveis nesta rodada: ${compatibleBags.join(', ')}`);
        this.retryButton.setVisible(true);
        this.retryButton.input.enabled = true;
        this.retryLabel.setVisible(true);
        this.returnButton.setVisible(true);
        this.returnButton.input.enabled = true;
        this.returnLabel.setVisible(true);
    }

    retry() {
        this.state.retry();
        if (this.guideButton) {
            this.guideButton.setVisible(true);
            this.guideButton.input.enabled = true;
        }
        this.heartsDisplay.update();
        this.retryButton.setVisible(false);
        this.retryButton.input.enabled = false;
        this.retryLabel.setVisible(false);
        this.returnButton.setVisible(false);
        this.returnButton.input.enabled = false;
        this.returnLabel.setVisible(false);
        this.clearMessage();
        this.compatibleCount = 0;
        this.setupRound();
    }

    showResultScreen(result) {
        this.isActive = false;
        if (this.guideButton) {
            this.guideButton.setVisible(false);
            this.guideButton.input.enabled = false;
        }
        if (this.guidePanel?.isOpen) {
            this.guidePanel.close();
        }

        this.bagItems.forEach((b) => {
            this.scene.input.setDraggable(b.sprite, false);
        });

        const overlay = this.scene.add.rectangle(256, 256, 512, 512, 0x000000, 0.75);
        overlay.setDepth(150);

        const panel = this.scene.add.rectangle(
            RESULT_PANEL.x,
            RESULT_PANEL.y,
            RESULT_PANEL.width,
            RESULT_PANEL.height,
            0x1f2937,
            0.95
        );
        panel.setStrokeStyle(2, 0xffffff);
        panel.setDepth(151);

        const title = this.scene.add.text(RESULT_PANEL.x, RESULT_PANEL.y - 75, 'Atendimento concluído', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff'
        })).setOrigin(0.5).setDepth(152);

        const atpIcon = this.scene.add.image(RESULT_PANEL.x - 70, RESULT_PANEL.y - 25, 'icone-atp');
        atpIcon.setOrigin(0.5);
        atpIcon.setDepth(152);
        atpIcon.setScale(1);
        if (atpIcon.texture) {
            atpIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        const atpText = this.scene.add.text(RESULT_PANEL.x - 45, RESULT_PANEL.y - 25, `+${result.atp} ATP`, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#fbbf24'
        })).setOrigin(0, 0.5).setDepth(152);

        const info = result.withinTime
            ? 'Bônus de tempo aplicado!'
            : 'Tempo excedido (sem bônus de tempo)';

        const details = this.scene.add.text(
            RESULT_PANEL.x,
            RESULT_PANEL.y + 15,
            `${info}\nErros no atendimento: ${result.errors}`,
            createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#d1d5db',
                align: 'center'
            })
        ).setOrigin(0.5).setDepth(152);

        const returnBtn = this.scene.add.rectangle(
            RESULT_RETURN_BUTTON.x,
            RESULT_RETURN_BUTTON.y,
            RESULT_RETURN_BUTTON.width,
            RESULT_RETURN_BUTTON.height,
            0x16a34a
        );
        returnBtn.setStrokeStyle(2, 0xffffff);
        returnBtn.setDepth(152);
        returnBtn.setInteractive({ useHandCursor: true });

        const returnLabel = this.scene.add.text(RESULT_RETURN_BUTTON.x, RESULT_RETURN_BUTTON.y, 'Voltar ao mapa', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff'
        })).setOrigin(0.5).setDepth(153);

        returnBtn.on('pointerdown', () => returnBtn.setFillStyle(0x0e7490));
        returnBtn.on('pointerout', () => returnBtn.setFillStyle(0x16a34a));
        returnBtn.on('pointerup', () => {
            playSfx(this.scene, 'clique');
            this.scene.returnToMap();
        });
    }

    setupDebugOutline() {
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(55);
        this.debugGraphics.lineStyle(2, 0xff00ff, 1);
        this.debugGraphics.strokeRect(CHAIR_AREA.x, CHAIR_AREA.y, CHAIR_AREA.width, CHAIR_AREA.height);

        const width = BAG_VISIBLE_WIDTH * BAG_SCALE;
        const height = BAG_VISIBLE_HEIGHT * BAG_SCALE;

        this.bagSlots.forEach((slot) => {
            this.debugGraphics.strokeRect(slot.x - width / 2, slot.y - height / 2, width, height);
        });

        this.debugGraphics.setVisible(false);

        this.debugKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.debugKey.on('down', () => {
            if (this.isActive) {
                this.debugGraphics.setVisible(!this.debugGraphics.visible);
            }
        });
    }

    update(delta = 0) {
        this.hintHelper?.update(delta, {
            stepKey: this.isActive && !this.state.isFailed ? 'TRANSFUSE' : null,
            suppressed: Boolean(
                this.scene?.tutorialManager?.caption?.isOpen
                || this.guidePanel?.isOpen
                || this.messageText?.visible
            )
        });
    }

    destroy() {
        this.isActive = false;
        if (this.debugKey) {
            this.debugKey.removeAllListeners();
        }
        if (this.portrait) this.portrait.destroy();
        if (this.typeBg) this.typeBg.destroy();
        if (this.typeText) this.typeText.destroy();
        if (this.heartsDisplay) this.heartsDisplay.destroy();
        if (this.transfusionLabel) this.transfusionLabel.destroy();
        if (this.messageText) this.messageText.destroy();
        if (this.retryButton) this.retryButton.destroy();
        if (this.retryLabel) this.retryLabel.destroy();
        if (this.returnButton) this.returnButton.destroy();
        if (this.returnLabel) this.returnLabel.destroy();
        this.clearBags();
        this.clearXMarkers();
        if (this.debugGraphics) this.debugGraphics.destroy();
        if (this.guideButton) {
            this.guideButton.destroy();
            this.guideButton = null;
        }
        if (this.guidePanel) {
            this.guidePanel.destroy();
            this.guidePanel = null;
        }
        if (this.hintHelper) {
            this.hintHelper.destroy();
            this.hintHelper = null;
        }
    }
}
