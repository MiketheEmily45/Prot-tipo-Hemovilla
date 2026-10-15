// Tela do mini-game
import { MINIGAME_ASSETS } from './minigameAssets.js';
import { AttendanceState } from './AttendanceState.js';
import { TypingPhase } from './TypingPhase.js';
import { getDiscoveredType } from './discoveredTypes.js';

// Valores ajustaveis da Fase 1 (coleta). Coordenadas em pixels da tela 512x512.
const SPRITE_SCALE = 2;
const SYRINGE_START = { x: 96, y: 448 };
// Retangulo da poltrona central onde a seringa deve ser solta.
const CHAIR_AREA = { x: 180, y: 90, width: 200, height: 200 };
// Posicao do tubo de coleta (sobre a mesinha da direita) e distancia aceita para soltar a seringa.
const TUBE_POSITION = { x: 440, y: 190 };
const TUBE_DROP_RADIUS = 70;
// Tempo segurando a seringa para chegar em cada imagem.
const FILL_HALF_MS = 1500;
const FILL_FULL_MS = 3000;
const PROGRESS_BAR = { width: 64, height: 4, offsetY: 72 };

export class Minigame extends Phaser.Scene {

    constructor() {
        super('Minigame');
    }

    init(data) {
        this.characterId = data && data.characterId ? data.characterId : null;
        this.typingPhase = null;
        this.collectionHidden = false;
    }

    preload() {
        Object.entries(MINIGAME_ASSETS).forEach(([key, path]) => {
            this.load.image(key, path);
        });
    }

    create() {
        this.setupViewport();
        this.setupBackground();
        this.setupPauseButton();
        this.setupAttendanceState();
        this.setupCollectionPhase();
        this.setupDebugOutline();
    }

    setupViewport() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);
    }

    setupBackground() {
        this.background = this.add.tileSprite(256, 256, 512, 512, 'minigame-background');
    }

    setupPauseButton() {
        const pauseButton = this.add.image(8, 8, 'pause-button');
        pauseButton.setOrigin(0);
        pauseButton.setDepth(100);
        pauseButton.setInteractive({ useHandCursor: true });

        pauseButton.on('pointerdown', () => {
            pauseButton.setTint(0x8B2E40);
        });

        pauseButton.on('pointerup', () => {
            pauseButton.clearTint();
            this.scene.start('Start');
        });
        this.pauseButton = pauseButton;
    }

    setupAttendanceState() {
        this.attendanceState = new AttendanceState({
            characterId: this.characterId,
            typeKnown: getDiscoveredType(this.characterId) !== null
        });
    }

    setupCollectionPhase() {
        // Pixel art: filtro nearest para manter as bordas nitidas na escala 2x.
        Object.keys(MINIGAME_ASSETS).forEach((key) => {
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        });

        this.fillProgressMs = 0;
        // Etapas: 'MOVE_TO_CHAIR' -> 'FILLING' -> 'MOVE_TO_TUBE' -> 'DONE'
        this.collectionStep = 'MOVE_TO_CHAIR';
        this.syringePosition = { ...SYRINGE_START };

        this.tube = this.add.image(TUBE_POSITION.x, TUBE_POSITION.y, 'frasco-vazio');
        this.tube.setScale(SPRITE_SCALE);
        this.tube.setDepth(5);

        this.syringe = this.add.image(SYRINGE_START.x, SYRINGE_START.y, 'agulha-vazia');
        this.syringe.setScale(SPRITE_SCALE);
        this.syringe.setDepth(10);
        this.syringe.setInteractive({ useHandCursor: true });
        this.input.setDraggable(this.syringe);

        this.progressBar = this.add.graphics();
        this.progressBar.setDepth(11);

        this.syringe.on('drag', (pointer, dragX, dragY) => {
            this.syringe.setPosition(dragX, dragY);
        });

        this.syringe.on('dragend', () => {
            this.handleSyringeDrop();
        });
    }

    handleSyringeDrop() {
        if (this.collectionStep === 'MOVE_TO_CHAIR') {
            const chair = new Phaser.Geom.Rectangle(
                CHAIR_AREA.x, CHAIR_AREA.y, CHAIR_AREA.width, CHAIR_AREA.height
            );

            if (chair.contains(this.syringe.x, this.syringe.y)) {
                // Solta sobre a poltrona: deixa de arrastar e passa a encher segurando o mouse.
                this.syringePosition = { x: this.syringe.x, y: this.syringe.y };
                this.collectionStep = 'FILLING';
                this.input.setDraggable(this.syringe, false);
                return;
            }

            this.syringe.setPosition(SYRINGE_START.x, SYRINGE_START.y);
            return;
        }

        if (this.collectionStep === 'MOVE_TO_TUBE') {
            const distance = Phaser.Math.Distance.Between(
                this.syringe.x, this.syringe.y, TUBE_POSITION.x, TUBE_POSITION.y
            );

            if (distance <= TUBE_DROP_RADIUS) {
                this.finishCollection();
                return;
            }

            this.syringe.setPosition(this.syringePosition.x, this.syringePosition.y);
        }
    }

    finishCollection() {
        this.collectionStep = 'DONE';
        this.tube.setTexture('frasco-cheio');
        this.syringe.setVisible(false);
        this.input.setDraggable(this.syringe, false);

        this.attendanceState.advance();

        if (this.attendanceState.phase === 'TIPAGEM') {
            this.startTypingPhase();
            return;
        }

        // Texto provisorio ate a Fase 3 existir (tipo ja conhecido pula a tipagem).
        this.phaseText = this.add.text(256, 40, 'Fase 3 em breve', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000'
        });
        this.phaseText.setOrigin(0.5);
        this.phaseText.setDepth(100);
    }

    startTypingPhase() {
        // Esconde os objetos da Fase 1 e entrega a cena para a tipagem.
        this.collectionHidden = true;
        this.tube.setVisible(false);
        this.syringe.setVisible(false);
        this.progressBar.clear();
        this.debugGraphics.setVisible(false);

        this.typingPhase = new TypingPhase(this, this.attendanceState, {
            characterId: this.characterId
        });
    }

    setupDebugOutline() {
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(50);
        this.debugGraphics.lineStyle(2, 0xff00ff, 1);
        this.debugGraphics.strokeRect(CHAIR_AREA.x, CHAIR_AREA.y, CHAIR_AREA.width, CHAIR_AREA.height);
        this.debugGraphics.strokeCircle(TUBE_POSITION.x, TUBE_POSITION.y, TUBE_DROP_RADIUS);
        this.debugGraphics.setVisible(false);

        // Tecla D liga e desliga o contorno de depuracao.
        this.debugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.debugKey.on('down', () => {
            if (this.collectionHidden) {
                return;
            }
            this.debugGraphics.setVisible(!this.debugGraphics.visible);
        });
    }

    updateFilling(delta) {
        if (this.collectionStep !== 'FILLING') {
            return;
        }

        // So enche enquanto o mouse esta pressionado sobre a seringa; soltar apenas pausa.
        const pointer = this.input.activePointer;
        const isHolding = pointer.isDown && this.syringe.getBounds().contains(pointer.x, pointer.y);

        if (isHolding) {
            this.fillProgressMs = Math.min(FILL_FULL_MS, this.fillProgressMs + delta);
        }

        if (this.fillProgressMs >= FILL_FULL_MS) {
            this.syringe.setTexture('agulha-cheia');
            this.collectionStep = 'MOVE_TO_TUBE';
            this.input.setDraggable(this.syringe, true);
        } else if (this.fillProgressMs >= FILL_HALF_MS) {
            this.syringe.setTexture('agulha-metade');
        }

        this.drawProgressBar();
    }

    drawProgressBar() {
        this.progressBar.clear();

        if (this.fillProgressMs <= 0 || this.collectionStep !== 'FILLING') {
            return;
        }

        const x = this.syringe.x - PROGRESS_BAR.width / 2;
        const y = this.syringe.y + PROGRESS_BAR.offsetY;
        const ratio = this.fillProgressMs / FILL_FULL_MS;

        this.progressBar.fillStyle(0x000000, 0.7);
        this.progressBar.fillRect(x, y, PROGRESS_BAR.width, PROGRESS_BAR.height);
        this.progressBar.fillStyle(0xc0392b, 1);
        this.progressBar.fillRect(x, y, PROGRESS_BAR.width * ratio, PROGRESS_BAR.height);
    }

    update(time, delta) {
        this.attendanceState.update(delta);
        this.updateFilling(delta);

        if (this.typingPhase) {
            this.typingPhase.update();
        }

        if (this.collectionStep !== 'FILLING') {
            this.progressBar.clear();
        }
    }
}
