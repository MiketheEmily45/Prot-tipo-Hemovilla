import { createTextStyle } from './textUtils.js';
import { playSfx } from './AudioManager.js';

/**
 * Dialogo de confirmacao com arte opcional e fallback desenhado.
 */
export class ConfirmPopup {
    constructor(scene, { depth = 2000 } = {}) {
        this.scene = scene;
        this.defaultDepth = depth;
        this.elements = [];
        this.isOpen = false;
        this.onCancelCallback = null;
    }

    open({
        message = 'Tem certeza? Todo o progresso (ATPs, cidades desbloqueadas e personagens atendidos) será apagado.',
        onConfirm = null,
        onCancel = null,
        skin = 'default',
        depth = this.defaultDepth
    } = {}) {
        if (this.isOpen) {
            this.close();
        }

        const scene = this.scene;
        const width = scene.cameras?.main?.width || 512;
        const height = scene.cameras?.main?.height || 512;
        const centerX = width / 2;
        const centerY = height / 2;

        this.isOpen = true;
        this.onCancelCallback = onCancel;
        this.elements = [];

        // Fundo escurecido bloqueando cliques na tela de tras
        const backdrop = scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.72);
        backdrop.setDepth(depth);
        backdrop.setInteractive();
        backdrop.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());
        this.elements.push(backdrop);

        const useConfigArt = skin === 'config-reset'
            && scene.textures?.exists?.('config-reset-popup')
            && scene.textures?.exists?.('config-reset-yes')
            && scene.textures?.exists?.('config-reset-no');

        if (useConfigArt) {
            const panel = scene.add.image(centerX, centerY, 'config-reset-popup').setDepth(depth + 1);
            this.elements.push(panel);
        } else {
            const boxW = 396;
            const boxH = 220;
            const boxX = centerX - boxW / 2;
            const boxY = centerY - boxH / 2;

            const boxGfx = scene.add.graphics();
            boxGfx.setDepth(depth + 1);
            boxGfx.fillStyle(0x000000, 1);
            boxGfx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
            boxGfx.fillStyle(0x674430, 1);
            boxGfx.fillRect(boxX, boxY, boxW, boxH);
            boxGfx.fillStyle(0x331d11, 1);
            boxGfx.fillRect(boxX + 10, boxY + 10, boxW - 20, boxH - 20);
            boxGfx.fillStyle(0xd7c8a9, 1);
            boxGfx.fillRect(boxX + 14, boxY + 14, boxW - 28, boxH - 28);
            this.elements.push(boxGfx);

            const textObj = scene.add.text(centerX, centerY - 30, message, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#3b2a20',
                align: 'center',
                lineSpacing: 4,
                wordWrap: { width: boxW - 56, useAdvancedWrap: true }
            })).setOrigin(0.5).setDepth(depth + 2);
            this.elements.push(textObj);
        }

        const btnW = useConfigArt ? 110 : 116;
        const btnH = useConfigArt ? 35 : 42;
        const btnSpacing = useConfigArt ? 6 : 32;
        const btnY = centerY + (useConfigArt ? 49 : 54);
        const simX = centerX - (btnW / 2 + btnSpacing / 2);
        const naoX = centerX + (btnW / 2 + btnSpacing / 2);

        this.createButton({
            x: simX,
            y: btnY,
            width: btnW,
            height: btnH,
            label: 'SIM',
            depth: depth + 2,
            textureKey: useConfigArt ? 'config-reset-yes' : null,
            onClick: () => {
                this.close();
                if (typeof onConfirm === 'function') {
                    onConfirm();
                }
            }
        });

        this.createButton({
            x: naoX,
            y: btnY,
            width: btnW,
            height: btnH,
            label: 'NÃO',
            depth: depth + 2,
            textureKey: useConfigArt ? 'config-reset-no' : null,
            onClick: () => {
                this.close();
                if (typeof onCancel === 'function') {
                    onCancel();
                }
            }
        });
    }

    createButton({ x, y, width, height, label, depth, textureKey = null, onClick }) {
        const scene = this.scene;
        const normalColor = 0x51b500;
        const pressedColor = 0x387d00;
        let gfx = null;
        let labelText = null;
        let hitArea;
        let drawBtn = () => {};

        if (textureKey) {
            hitArea = scene.add.image(x, y, textureKey).setDepth(depth);
            hitArea.setInteractive({ useHandCursor: true });
        } else {
            gfx = scene.add.graphics();
            gfx.setDepth(depth);
            drawBtn = (fillColor) => {
                gfx.clear();
                gfx.fillStyle(0x000000, 1);
                gfx.fillRect(x - width / 2 - 3, y - height / 2 - 3, width + 6, height + 6);
                gfx.fillStyle(fillColor, 1);
                gfx.fillRect(x - width / 2, y - height / 2, width, height);
            };
            drawBtn(normalColor);

            hitArea = scene.add.rectangle(x, y, width + 6, height + 6, 0x000000, 0);
            hitArea.setDepth(depth + 1);
            hitArea.setInteractive({ useHandCursor: true });

            labelText = scene.add.text(x, y, label, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#6fff00'
            })).setOrigin(0.5).setDepth(depth + 2);
            this.elements.push(gfx, labelText);
        }

        let isPressed = false;

        hitArea.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            isPressed = true;
            if (textureKey) {
                hitArea.setTint(0x8B2E40);
            } else {
                drawBtn(pressedColor);
                labelText.setTint(0x8B2E40);
            }
        });

        hitArea.on('pointerout', () => {
            if (isPressed) {
                isPressed = false;
                if (textureKey) {
                    hitArea.clearTint();
                } else {
                    drawBtn(normalColor);
                    labelText.clearTint();
                }
            }
        });

        hitArea.on('pointerup', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            if (!isPressed) return;
            isPressed = false;
            if (textureKey) {
                hitArea.clearTint();
            } else {
                drawBtn(normalColor);
                labelText.clearTint();
            }
            playSfx(scene, 'clique');
            onClick();
        });

        this.elements.push(hitArea);
    }

    cancel() {
        if (!this.isOpen) return;
        const cb = this.onCancelCallback;
        this.close();
        if (typeof cb === 'function') {
            cb();
        }
    }

    close() {
        if (!this.isOpen) return;
        this.elements.forEach((el) => el?.destroy?.());
        this.elements = [];
        this.isOpen = false;
        this.onCancelCallback = null;
    }

    destroy() {
        this.close();
        this.scene = null;
    }
}
