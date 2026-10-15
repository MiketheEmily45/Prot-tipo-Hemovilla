// Fase 3 do minigame: transfusao de sangue.
import { CHAIR_AREA } from './Minigame.js';
import { characterData } from './characterData.js';
import {
    RH_ENABLED,
    canReceive,
    incompatibilityReason,
    drawRound
} from './bloodCompatibility.js';
import { HeartsDisplay } from './HeartsDisplay.js';
import { addATP, markCharacterAttended } from './atpStore.js';

// Configuracao da Fase 3
const REQUIRED_BAGS = 1;
const CONTAMINATED_COUNT = 0;
const GREEN_GLOW_MS = 600;
const BAG_SCALE = 1.4;

// Centro e dimensoes do conteudo visivel da arte da bolsa (64x64)
const BAG_VISIBLE_WIDTH = 31;
const BAG_VISIBLE_HEIGHT = 35;
const BAG_ORIGIN = { x: 33.5 / 64, y: 20.5 / 64 };

// Posicoes configuraveis
const HEARTS_POSITION = { x: 100, y: 16 };
const PORTRAIT_POSITION = { x: 456, y: 32 };
const TYPE_LABEL_OFFSET = { x: 0, y: 32 };
const BAG_SLOTS = [
    { x: 80, y: 440 },
    { x: 196, y: 440 },
    { x: 312, y: 440 },
    { x: 428, y: 440 }
];

const TRANSFUSION_BAR = { x: 180, y: 310, width: 152, height: 10 };
const MESSAGE_BOX = { x: 256, y: 365 };
const RETRY_BUTTON = { x: 256, y: 400, width: 160, height: 32 };
const RESULT_PANEL = { x: 256, y: 256, width: 380, height: 240 };
const RETURN_BUTTON = { x: 256, y: 320, width: 180, height: 40 };

export class TransfusionPhase {
    constructor(scene, state, { characterId } = {}) {
        this.scene = scene;
        this.state = state;
        this.characterId = characterId;
        this.patientType = this.resolvePatientType(characterId);
        this.compatibleCount = 0;
        this.isActive = true;
        this.bagItems = [];
        this.xMarkers = [];

        this.setupHUD();
        this.setupTransfusionBar();
        this.setupMessageArea();
        this.setupRound();
        this.setupDebugOutline();
    }

    resolvePatientType(characterId) {
        const data = characterData[characterId];
        if (data && data.tipoSanguineo) {
            return data.tipoSanguineo;
        }
        return 'A';
    }

    setupHUD() {
        const portraitKey = `${this.characterId}-icon`;
        if (this.scene.textures.exists(portraitKey)) {
            this.portrait = this.scene.add.image(PORTRAIT_POSITION.x, PORTRAIT_POSITION.y, portraitKey);
            this.portrait.setOrigin(0.5, 0.5);
            this.portrait.setDepth(40);
        }

        const displayType = RH_ENABLED
            ? this.patientType
            : this.patientType.replace(/[+-]/g, '');

        const typeX = PORTRAIT_POSITION.x + TYPE_LABEL_OFFSET.x;
        const typeY = PORTRAIT_POSITION.y + TYPE_LABEL_OFFSET.y;

        this.typeText = this.scene.add.text(typeX, typeY, `Tipo: ${displayType}`, {
            fontFamily: 'monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: { x: 6, y: 3 }
        });
        this.typeText.setOrigin(0.5, 0);
        this.typeText.setDepth(40);

        this.heartsDisplay = new HeartsDisplay(this.scene, this.state, {
            x: HEARTS_POSITION.x,
            y: HEARTS_POSITION.y,
            originX: 0,
            originY: 0,
            depth: 40
        });
    }

    setupTransfusionBar() {
        this.transfusionBarGraphics = this.scene.add.graphics();
        this.transfusionBarGraphics.setDepth(25);

        this.transfusionLabel = this.scene.add.text(
            TRANSFUSION_BAR.x + TRANSFUSION_BAR.width / 2,
            TRANSFUSION_BAR.y - 14,
            'Transfusão',
            {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                padding: { x: 4, y: 2 }
            }
        );
        this.transfusionLabel.setOrigin(0.5, 0);
        this.transfusionLabel.setDepth(25);

        this.drawTransfusionBar();
    }

    drawTransfusionBar() {
        this.transfusionBarGraphics.clear();

        this.transfusionBarGraphics.fillStyle(0x000000, 0.7);
        this.transfusionBarGraphics.fillRect(
            TRANSFUSION_BAR.x,
            TRANSFUSION_BAR.y,
            TRANSFUSION_BAR.width,
            TRANSFUSION_BAR.height
        );

        this.transfusionBarGraphics.lineStyle(1, 0xffffff, 0.9);
        this.transfusionBarGraphics.strokeRect(
            TRANSFUSION_BAR.x,
            TRANSFUSION_BAR.y,
            TRANSFUSION_BAR.width,
            TRANSFUSION_BAR.height
        );

        const ratio = Math.min(1, this.compatibleCount / REQUIRED_BAGS);
        if (ratio > 0) {
            this.transfusionBarGraphics.fillStyle(0xc0392b, 1);
            this.transfusionBarGraphics.fillRect(
                TRANSFUSION_BAR.x + 1,
                TRANSFUSION_BAR.y + 1,
                (TRANSFUSION_BAR.width - 2) * ratio,
                TRANSFUSION_BAR.height - 2
            );
        }
    }

    setupMessageArea() {
        this.messageText = this.scene.add.text(MESSAGE_BOX.x, MESSAGE_BOX.y, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: { x: 8, y: 4 },
            align: 'center',
            wordWrap: { width: 460 }
        });
        this.messageText.setOrigin(0.5);
        this.messageText.setDepth(45);
        this.messageText.setVisible(false);

        this.retryButton = this.scene.add.rectangle(
            RETRY_BUTTON.x,
            RETRY_BUTTON.y,
            RETRY_BUTTON.width,
            RETRY_BUTTON.height,
            0xc0392b
        );
        this.retryButton.setDepth(45);
        this.retryButton.setStrokeStyle(2, 0xffffff);
        this.retryButton.setInteractive({ useHandCursor: true });
        this.retryButton.setVisible(false);
        this.retryButton.on('pointerup', () => this.retry());

        this.retryLabel = this.scene.add.text(RETRY_BUTTON.x, RETRY_BUTTON.y, 'Tentar de novo', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff'
        });
        this.retryLabel.setOrigin(0.5);
        this.retryLabel.setDepth(46);
        this.retryLabel.setVisible(false);
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
            count: 4,
            contaminatedCount: CONTAMINATED_COUNT,
            rhEnabled: RH_ENABLED
        });

        const slotWidth = BAG_VISIBLE_WIDTH * BAG_SCALE;
        const slotHeight = BAG_VISIBLE_HEIGHT * BAG_SCALE;

        this.slotPlates = BAG_SLOTS.map((slot) => {
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
            const slot = BAG_SLOTS[index];
            const textureKey = `bolsa-${bagType}`;
            const sprite = this.scene.add.image(slot.x, slot.y, textureKey);
            sprite.setOrigin(BAG_ORIGIN.x, BAG_ORIGIN.y);
            sprite.setScale(BAG_SCALE);
            sprite.setDepth(30);

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

        const isCompatible = canReceive(this.patientType, bagItem.bagType, { rhEnabled: RH_ENABLED });

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
        this.drawTransfusionBar();
        this.clearMessage();

        if (this.compatibleCount >= REQUIRED_BAGS) {
            const result = this.state.complete();
            this.showResultScreen(result);
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
            this.handleFailure();
        } else {
            const reason = incompatibilityReason(this.patientType, bagItem.bagType, { rhEnabled: RH_ENABLED });
            this.showMessage(reason);
        }
    }

    handleFailure() {
        this.bagItems.forEach((b) => {
            this.scene.input.setDraggable(b.sprite, false);
        });

        const compatibleBags = this.bagItems
            .filter((b) => canReceive(this.patientType, b.bagType, { rhEnabled: RH_ENABLED }))
            .map((b) => b.bagType);

        this.showMessage(`Atendimento falhou!\nBolsas compatíveis nesta rodada: ${compatibleBags.join(', ')}`);
        this.retryButton.setVisible(true);
        this.retryLabel.setVisible(true);
    }

    retry() {
        this.state.retry();
        this.heartsDisplay.update();
        this.retryButton.setVisible(false);
        this.retryLabel.setVisible(false);
        this.clearMessage();
        this.compatibleCount = 0;
        this.drawTransfusionBar();
        this.setupRound();
    }

    showResultScreen(result) {
        this.isActive = false;

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

        const title = this.scene.add.text(RESULT_PANEL.x, RESULT_PANEL.y - 75, 'Atendimento concluído', {
            fontFamily: 'monospace',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(152);

        const atpText = this.scene.add.text(RESULT_PANEL.x, RESULT_PANEL.y - 25, `⚡ +${result.atp} ATP`, {
            fontFamily: 'monospace',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#fbbf24'
        }).setOrigin(0.5).setDepth(152);

        const info = result.withinTime
            ? 'Bônus de tempo aplicado!'
            : 'Tempo excedido (sem bônus de tempo)';

        const details = this.scene.add.text(
            RESULT_PANEL.x,
            RESULT_PANEL.y + 15,
            `${info}\nErros no atendimento: ${result.errors}`,
            {
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#d1d5db',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(152);

        const returnBtn = this.scene.add.rectangle(
            RETURN_BUTTON.x,
            RETURN_BUTTON.y,
            RETURN_BUTTON.width,
            RETURN_BUTTON.height,
            0x16a34a
        );
        returnBtn.setStrokeStyle(2, 0xffffff);
        returnBtn.setDepth(152);
        returnBtn.setInteractive({ useHandCursor: true });

        const returnLabel = this.scene.add.text(RETURN_BUTTON.x, RETURN_BUTTON.y, 'Voltar ao mapa', {
            fontFamily: 'monospace',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(153);

        returnBtn.on('pointerdown', () => returnBtn.setTint(0x0e7490));
        returnBtn.on('pointerout', () => returnBtn.clearTint());
        returnBtn.on('pointerup', () => {
            // Credita o ATP e marca personagem como atendido
            addATP(result.atp);
            markCharacterAttended(this.characterId);

            // TODO: Integracao com GameMap: o GameMap atualmente e recriado do zero no scene.start('GameMap').
            // Para persistir o personagem como atendido e desativar alertas/retomar movimento no mapa,
            // o GameMap deve consultar isCharacterAttended(character.id) ao inicializar ou atualizar os alertas.
            this.scene.scene.start('GameMap');
        });
    }

    setupDebugOutline() {
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(55);
        this.debugGraphics.lineStyle(2, 0xff00ff, 1);
        this.debugGraphics.strokeRect(CHAIR_AREA.x, CHAIR_AREA.y, CHAIR_AREA.width, CHAIR_AREA.height);

        const width = BAG_VISIBLE_WIDTH * BAG_SCALE;
        const height = BAG_VISIBLE_HEIGHT * BAG_SCALE;

        BAG_SLOTS.forEach((slot) => {
            this.debugGraphics.strokeRect(slot.x - width / 2, slot.y - height / 2, width, height);
        });

        this.debugGraphics.strokeRect(
            TRANSFUSION_BAR.x,
            TRANSFUSION_BAR.y,
            TRANSFUSION_BAR.width,
            TRANSFUSION_BAR.height
        );
        this.debugGraphics.setVisible(false);

        this.debugKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.debugKey.on('down', () => {
            if (this.isActive) {
                this.debugGraphics.setVisible(!this.debugGraphics.visible);
            }
        });
    }

    update() {
        // Logica por frame da Fase 3 caso necessaria
    }

    destroy() {
        this.isActive = false;
        if (this.debugKey) {
            this.debugKey.removeAllListeners();
        }
        if (this.portrait) this.portrait.destroy();
        if (this.typeText) this.typeText.destroy();
        if (this.heartsDisplay) this.heartsDisplay.destroy();
        if (this.transfusionBarGraphics) this.transfusionBarGraphics.destroy();
        if (this.transfusionLabel) this.transfusionLabel.destroy();
        if (this.messageText) this.messageText.destroy();
        if (this.retryButton) this.retryButton.destroy();
        if (this.retryLabel) this.retryLabel.destroy();
        this.clearBags();
        this.clearXMarkers();
        if (this.debugGraphics) this.debugGraphics.destroy();
    }
}
