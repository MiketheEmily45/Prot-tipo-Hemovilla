import { createTextStyle } from './textUtils.js';

/**
 * Dialogo de confirmacao modal reutilizavel para o jogo (ex: compra de cidades, compras da loja).
 */
export class ConfirmationDialog {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.isOpen = false;
    }

    show({
        title = 'Confirmar Ação',
        message = '',
        price = 0,
        currentATP = 0,
        onAccept = null,
        onCancel = null,
        acceptLabel = 'Aceitar',
        cancelLabel = 'Cancelar'
    }) {
        if (this.isOpen) {
            this.close();
        }

        const scene = this.scene;
        const width = scene.cameras?.main?.width || 512;
        const height = scene.cameras?.main?.height || 512;
        const centerX = width / 2;
        const centerY = height / 2;
        const depth = 1000;

        this.isOpen = true;
        this.elements = [];

        // Fundo escuro semi-transparente que bloqueia cliques atras
        const backdrop = scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.72);
        backdrop.setDepth(depth);
        backdrop.setInteractive();
        this.elements.push(backdrop);

        // Painel central
        const panelWidth = 380;
        const panelHeight = 230;
        const panel = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1e293b);
        panel.setStrokeStyle(2, 0x38bdf8);
        panel.setDepth(depth + 1);
        this.elements.push(panel);

        // Titulo
        const titleText = scene.add.text(centerX, centerY - 80, title, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffffff'
        })).setOrigin(0.5).setDepth(depth + 2);
        this.elements.push(titleText);

        // Mensagem explicativa
        const msgText = scene.add.text(centerX, centerY - 38, message, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e2e8f0',
            align: 'center',
            wordWrap: { width: 340 }
        })).setOrigin(0.5).setDepth(depth + 2);
        this.elements.push(msgText);

        const hasPrice = typeof price === 'number' && price > 0;
        const hasEnoughFunds = !hasPrice || currentATP >= price;

        if (hasPrice) {
            if (hasEnoughFunds) {
                const infoText = scene.add.text(
                    centerX,
                    centerY + 10,
                    `Preço: ${price} ATP   |   Seu saldo: ${currentATP} ATP`,
                    createTextStyle({
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontStyle: 'bold',
                        color: '#4ade80',
                        align: 'center'
                    })
                ).setOrigin(0.5).setDepth(depth + 2);
                this.elements.push(infoText);
            } else {
                const shortage = price - currentATP;
                const warningText = scene.add.text(
                    centerX,
                    centerY + 2,
                    `Preço: ${price} ATP   |   Seu saldo: ${currentATP} ATP`,
                    createTextStyle({
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: '#cbd5e1',
                        align: 'center'
                    })
                ).setOrigin(0.5).setDepth(depth + 2);

                const alertText = scene.add.text(
                    centerX,
                    centerY + 22,
                    `Saldo insuficiente! Faltam ${shortage} ATP.`,
                    createTextStyle({
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontStyle: 'bold',
                        color: '#f87171',
                        align: 'center'
                    })
                ).setOrigin(0.5).setDepth(depth + 2);

                this.elements.push(warningText, alertText);
            }
        }

        const buttonY = centerY + 72;

        if (hasEnoughFunds) {
            // Dois botoes: Aceitar e Cancelar
            const btnWidth = 130;
            const btnHeight = 36;
            const btnSpacing = 20;

            const acceptX = centerX - (btnWidth / 2 + btnSpacing / 2);
            const cancelX = centerX + (btnWidth / 2 + btnSpacing / 2);

            // Botao Aceitar (verde)
            const acceptBg = scene.add.rectangle(acceptX, buttonY, btnWidth, btnHeight, 0x16a34a);
            acceptBg.setStrokeStyle(1, 0x22c55e);
            acceptBg.setDepth(depth + 2);
            acceptBg.setInteractive({ useHandCursor: true });

            const acceptLabelText = scene.add.text(acceptX, buttonY, acceptLabel, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#ffffff'
            })).setOrigin(0.5).setDepth(depth + 3);

            acceptBg.on('pointerdown', () => acceptBg.setFillStyle(0x15803d));
            acceptBg.on('pointerout', () => acceptBg.setFillStyle(0x16a34a));
            acceptBg.on('pointerup', () => {
                this.close();
                if (typeof onAccept === 'function') {
                    onAccept();
                }
            });

            // Botao Cancelar (cinza)
            const cancelBg = scene.add.rectangle(cancelX, buttonY, btnWidth, btnHeight, 0x475569);
            cancelBg.setStrokeStyle(1, 0x64748b);
            cancelBg.setDepth(depth + 2);
            cancelBg.setInteractive({ useHandCursor: true });

            const cancelLabelText = scene.add.text(cancelX, buttonY, cancelLabel, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#ffffff'
            })).setOrigin(0.5).setDepth(depth + 3);

            cancelBg.on('pointerdown', () => cancelBg.setFillStyle(0x334155));
            cancelBg.on('pointerout', () => cancelBg.setFillStyle(0x475569));
            cancelBg.on('pointerup', () => {
                this.close();
                if (typeof onCancel === 'function') {
                    onCancel();
                }
            });

            this.elements.push(acceptBg, acceptLabelText, cancelBg, cancelLabelText);
        } else {
            // Apenas botao Fechar/Cancelar quando nao ha saldo suficiente
            const btnWidth = 140;
            const btnHeight = 36;

            const cancelBg = scene.add.rectangle(centerX, buttonY, btnWidth, btnHeight, 0x475569);
            cancelBg.setStrokeStyle(1, 0x64748b);
            cancelBg.setDepth(depth + 2);
            cancelBg.setInteractive({ useHandCursor: true });

            const cancelLabelText = scene.add.text(centerX, buttonY, 'Fechar', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#ffffff'
            })).setOrigin(0.5).setDepth(depth + 3);

            cancelBg.on('pointerdown', () => cancelBg.setFillStyle(0x334155));
            cancelBg.on('pointerout', () => cancelBg.setFillStyle(0x475569));
            cancelBg.on('pointerup', () => {
                this.close();
                if (typeof onCancel === 'function') {
                    onCancel();
                }
            });

            this.elements.push(cancelBg, cancelLabelText);
        }
    }

    close() {
        if (!this.isOpen) return;
        this.elements.forEach((el) => {
            if (el && typeof el.destroy === 'function') {
                el.destroy();
            }
        });
        this.elements = [];
        this.isOpen = false;
    }
}
