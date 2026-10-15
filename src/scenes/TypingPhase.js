// Fase 2 do minigame: tipagem ABO (a etapa do Rh ainda nao existe).
import { BENCH_RESULT_FRAMES } from './minigameAssets.js';
import { characterData } from './characterData.js';
import { setDiscoveredType } from './discoveredTypes.js';
import { HeartsDisplay } from './HeartsDisplay.js';

// Valores ajustaveis da Fase 2. Coordenadas em pixels da tela 512x512.
const SPRITE_SCALE = 2;
const BENCH_SCALE = 2;
const BENCH_HALF_WIDTH = 128;
const BENCH_HEIGHT = 256;
// Posicao inicial dos frascos de soro e do tubo de coleta.
const ANTI_A_START = { x: 100, y: 64 };
const ANTI_B_START = { x: 412, y: 64 };
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
const RETRY_BUTTON = { x: 256, y: 452, width: 160, height: 28 };
const HINT_POSITION = { x: 256, y: 415 };
const HEARTS_POSITION = { x: 504, y: 8 };
// Tempo mostrando o texto de acerto e a dica, em ms.
const CONFIRM_MS = 1500;
const HINT_MS = 2000;
// Se preenchido ('A', 'B', 'AB' ou 'O'), ignora o personagem e forca este tipo (para testes).
const DEBUG_FORCE_TYPE = null;
// Tipo usado apenas se o personagem nao existir em characterData.js.
const DEFAULT_TYPE = 'A';

export class TypingPhase {
    constructor(scene, state, { characterId, onComplete } = {}) {
        this.scene = scene;
        this.state = state;
        this.characterId = characterId;
        this.onComplete = onComplete;
        this.patientType = this.resolvePatientType(characterId);
        this.isDragging = false;
        this.lastPointer = null;
        this.isActive = true;
        this.isConfirmed = false;

        this.createBench();
        this.createBottles();
        this.createDiagnosisButtons();
        this.createTexts();
        this.createDebugOutline();
        this.reset();
    }

    resolvePatientType(characterId) {
        if (DEBUG_FORCE_TYPE) {
            return DEBUG_FORCE_TYPE;
        }

        const data = characterData[characterId];
        if (data && data.tipoSanguineo) {
            // Ignora o fator Rh (ex.: 'A+' vira 'A').
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

    createBottles() {
        this.items = {
            antiA: this.createItem('frasco-anti-a', ANTI_A_START),
            antiB: this.createItem('frasco-anti-b', ANTI_B_START),
            tube: this.createItem('frasco-cheio', TUBE_START)
        };
        this.items.antiA.wellIndex = 0;
        this.items.antiA.hint = 'O poço 1 é o do Anti-A';
        this.items.antiB.wellIndex = 1;
        this.items.antiB.hint = 'O poço 2 é o do Anti-B';

        this.items.antiA.sprite.on('dragend', () => this.dropSerum(this.items.antiA));
        this.items.antiB.sprite.on('dragend', () => this.dropSerum(this.items.antiB));
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

            const label = this.scene.add.text(x, DIAGNOSIS_BUTTONS.y, type, {
                fontSize: '20px',
                color: '#ffffff'
            });
            label.setOrigin(0.5);
            label.setDepth(41);

            rect.on('pointerup', () => this.handleDiagnosis(type));

            return { type, rect, label };
        });

        this.retryButton = this.scene.add.rectangle(
            RETRY_BUTTON.x, RETRY_BUTTON.y, RETRY_BUTTON.width, RETRY_BUTTON.height, 0xc0392b
        );
        this.retryButton.setDepth(40);
        this.retryButton.setStrokeStyle(2, 0xffffff);
        this.retryButton.setInteractive({ useHandCursor: true });
        this.retryButton.on('pointerup', () => this.retry());

        this.retryLabel = this.scene.add.text(RETRY_BUTTON.x, RETRY_BUTTON.y, 'Tentar de novo', {
            fontSize: '16px',
            color: '#ffffff'
        });
        this.retryLabel.setOrigin(0.5);
        this.retryLabel.setDepth(41);
    }

    createTexts() {
        // Corações provisorios: virao de arte depois.
        this.heartsDisplay = new HeartsDisplay(this.scene, this.state, {
            x: HEARTS_POSITION.x,
            y: HEARTS_POSITION.y,
            originX: 1,
            originY: 0,
            depth: 100
        });
        this.heartsText = this.heartsDisplay.text;

        this.hintText = this.scene.add.text(HINT_POSITION.x, HINT_POSITION.y, '', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            align: 'center',
            wordWrap: { width: 460 }
        });
        this.hintText.setOrigin(0.5);
        this.hintText.setDepth(45);

        this.phaseText = this.scene.add.text(256, 40, '', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000'
        });
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
            if (this.isActive) {
                this.debugGraphics.setVisible(!this.debugGraphics.visible);
            }
        });
    }

    // Volta a Fase 2 para o inicio: pocos vazios, frascos e tubo nos lugares.
    reset() {
        this.wells.forEach((well) => {
            well.state = 'EMPTY';
            well.mixDistance = 0;
            this.updateWellImage(well);
        });

        Object.values(this.items).forEach(({ sprite, start }) => {
            sprite.setPosition(start.x, start.y);
            sprite.setVisible(true);
            this.scene.input.setDraggable(sprite, true);
        });

        this.setDiagnosisEnabled(false);
        this.retryButton.setVisible(false);
        this.retryButton.input.enabled = false;
        this.retryLabel.setVisible(false);
        this.hintText.setText('');
        this.progressBar.clear();
        this.lastPointer = null;
        this.updateHearts();
    }

    updateWellImage(well) {
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
            // Poco trocado: nao e erro, so uma dica.
            this.returnItem(item);
            this.showHint(item.hint);
            return;
        }

        well.state = 'SERUM';
        this.updateWellImage(well);
        item.sprite.setVisible(false);
        this.scene.input.setDraggable(item.sprite, false);
    }

    dropTube(item) {
        const well = this.findWellAt(item.sprite.x, item.sprite.y);
        this.returnItem(item);

        if (!well) {
            return;
        }

        if (well.state === 'EMPTY') {
            this.showHint('Pingue o soro no poço antes do sangue');
            return;
        }

        if (well.state === 'SERUM') {
            well.state = 'BLOOD';
            well.mixDistance = 0;
            this.updateWellImage(well);
        }
    }

    showHint(message) {
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

    // Aglutinacao: poco 1 (Anti-A) reage em A e AB; poco 2 (Anti-B) reage em B e AB.
    agglutinates(wellIndex) {
        const antigen = wellIndex === 0 ? 'A' : 'B';
        return this.patientType.includes(antigen);
    }

    handleDiagnosis(type) {
        if (type === this.patientType) {
            this.handleCorrect(type);
            return;
        }

        this.handleWrong();
    }

    handleCorrect(type) {
        this.isConfirmed = true;
        this.setDiagnosisEnabled(false);
        setDiscoveredType(this.characterId, type);
        this.state.advance();
        this.hintText.setText(`Tipo ${type} confirmado`);

        this.scene.time.delayedCall(CONFIRM_MS, () => {
            this.hintText.setText('');
            this.isActive = false;
            this.debugGraphics.setVisible(false);

            if (typeof this.onComplete === 'function') {
                this.destroy();
                this.onComplete(type);
            } else {
                this.phaseText.setText('Fase 3 em breve');
            }
        });
    }

    destroy() {
        this.isActive = false;
        if (this.debugKey) {
            this.debugKey.removeAllListeners();
        }
        this.wells.forEach((well) => well.image.destroy());
        Object.values(this.items).forEach((item) => item.sprite.destroy());
        this.diagnosisButtons.forEach(({ rect, label }) => {
            rect.destroy();
            label.destroy();
        });
        this.retryButton.destroy();
        this.retryLabel.destroy();
        if (this.heartsDisplay) {
            this.heartsDisplay.destroy();
        }
        this.hintText.destroy();
        this.phaseText.destroy();
        this.progressBar.destroy();
        this.debugGraphics.destroy();
    }

    handleWrong() {
        const result = this.state.registerError();
        this.updateHearts();

        // Explica o que aconteceu em cada poco, sem revelar o tipo.
        const describe = (index) => `Poço ${index + 1}: ${this.agglutinates(index) ? 'aglutinou' : 'não aglutinou'}`;
        const explanation = `${describe(0)}. ${describe(1)}.`;

        if (!result.failed) {
            this.hintText.setText(`Não é esse tipo. ${explanation}`);
            return;
        }

        this.setDiagnosisEnabled(false);
        this.hintText.setText(`${explanation}\nA resposta correta era o tipo ${this.patientType}.`);
        this.retryButton.setVisible(true);
        this.retryButton.input.enabled = true;
        this.retryLabel.setVisible(true);
    }

    retry() {
        this.state.retry();
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
