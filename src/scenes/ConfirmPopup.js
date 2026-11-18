import { createTextStyle } from './textUtils.js';

/**
 * Pop-up de confirmacao provisorio desenhado em codigo (Graphics),
 * isolado para futura substituicao pela arte oficial sem alterar a cena.
 */
export class ConfirmPopup {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.isOpen = false;
    }

    open({
        message = 'Tem certeza? Todo o progresso (ATPs, cidades desbloqueadas e personagens atendidos) será apagado.',
        onConfirm = null,
        onCancel = null
    } = {}) {
        if (this.isOpen) {
            this.close();
        }

        const scene = this.scene;
        const width = scene.cameras?.main?.width || 512;
        const height = scene.cameras?.main?.height || 512;
        const centerX = width / 2;
        const centerY = height / 2;
        const depth = 500;

        this.isOpen = true;
        this.elements = [];

        // Fundo escurecido bloqueando cliques na tela de tras
        const backdrop = scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.72);
        backdrop.setDepth(depth);
        backdrop.setInteractive();
        backdrop.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());
        this.elements.push(backdrop);

        // Caixa bege/marrom inspirada na moldura dos personagens, com borda preta grossa
        const boxW = 396;
        const boxH = 220;
        const boxX = centerX - boxW / 2;
        const boxY = centerY - boxH / 2;

        const boxGfx = scene.add.graphics();
        boxGfx.setDepth(depth + 1);

        // Borda preta grossa externa
        boxGfx.fillStyle(0x000000, 1);
        boxGfx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);

        // Moldura marrom (#674430)
        boxGfx.fillStyle(0x674430, 1);
        boxGfx.fillRect(boxX, boxY, boxW, boxH);

        // Contorno escuro interno (#331d11) e fundo bege (#d7c8a9)
        boxGfx.fillStyle(0x331d11, 1);
        boxGfx.fillRect(boxX + 10, boxY + 10, boxW - 20, boxH - 20);

        boxGfx.fillStyle(0xd7c8a9, 1);
        boxGfx.fillRect(boxX + 14, boxY + 14, boxW - 28, boxH - 28);

        this.elements.push(boxGfx);

        // Texto da pergunta
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

        // Botoes SIM / NAO verdes com borda preta
        const btnW = 116;
        const btnH = 42;
        const btnSpacing = 32;
        const btnY = centerY + 54;

        const simX = centerX - (btnW / 2 + btnSpacing / 2);
        const naoX = centerX + (btnW / 2 + btnSpacing / 2);

        this.createButton({
            x: simX,
            y: btnY,
            width: btnW,
            height: btnH,
            label: 'SIM',
            depth: depth + 2,
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
            onClick: () => {
                this.close();
                if (typeof onCancel === 'function') {
                    onCancel();
                }
            }
        });
    }

    createButton({ x, y, width, height, label, depth, onClick }) {
        const scene = this.scene;
        const normalColor = 0x51b500;
        const pressedColor = 0x387d00;

        const gfx = scene.add.graphics();
        gfx.setDepth(depth);

        const drawBtn = (fillColor) => {
            gfx.clear();
            gfx.fillStyle(0x000000, 1);
            gfx.fillRect(x - width / 2 - 3, y - height / 2 - 3, width + 6, height + 6);
            gfx.fillStyle(fillColor, 1);
            gfx.fillRect(x - width / 2, y - height / 2, width, height);
        };

        drawBtn(normalColor);

        const hitArea = scene.add.rectangle(x, y, width + 6, height + 6, 0x000000, 0);
        hitArea.setDepth(depth + 1);
        hitArea.setInteractive({ useHandCursor: true });

        const labelText = scene.add.text(x, y, label, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#6fff00'
        })).setOrigin(0.5).setDepth(depth + 2);

        let isPressed = false;

        hitArea.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            isPressed = true;
            drawBtn(pressedColor);
            labelText.setTint(0x8B2E40);
        });

        hitArea.on('pointerout', () => {
            if (isPressed) {
                isPressed = false;
                drawBtn(normalColor);
                labelText.clearTint();
            }
        });

        hitArea.on('pointerup', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            if (!isPressed) return;
            isPressed = false;
            drawBtn(normalColor);
            labelText.clearTint();
            onClick();
        });

        this.elements.push(gfx, hitArea, labelText);
    }

    close() {
        if (!this.isOpen) return;
        this.elements.forEach((el) => el?.destroy?.());
        this.elements = [];
        this.isOpen = false;
    }

    destroy() {
        this.close();
        this.scene = null;
    }
}
