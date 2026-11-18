import { createTextStyle } from './textUtils.js';
import { playSfx } from './AudioManager.js';

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

        // Painel central com borda preta externa e contorno verde-oliva
        const panelWidth = 380;
        const panelHeight = 230;
        const outerBorder = scene.add.rectangle(centerX, centerY, panelWidth + 8, panelHeight + 8, 0x000000);
        outerBorder.setDepth(depth + 1);
        this.elements.push(outerBorder);

        const panel = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x171c10);
        panel.setStrokeStyle(3, 0x718E10);
        panel.setDepth(depth + 1);
        this.elements.push(panel);

        // Titulo
        const titleText = scene.add.text(centerX, centerY - 80, title, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#BDEE38'
        })).setOrigin(0.5).setDepth(depth + 2);
        this.elements.push(titleText);

        // Mensagem explicativa
        const msgText = scene.add.text(centerX, centerY - 38, message, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#f5f5f4',
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
                        color: '#BDEE38',
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
                        color: '#d4d4d8',
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

            // Botao Aceitar (verde-oliva)
            const acceptBg = scene.add.rectangle(acceptX, buttonY, btnWidth, btnHeight, 0x718E10);
            acceptBg.setStrokeStyle(2, 0x000000);
            acceptBg.setDepth(depth + 2);
            acceptBg.setInteractive({ useHandCursor: true });

            const acceptLabelText = scene.add.text(acceptX, buttonY, acceptLabel, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#BDEE38'
            })).setOrigin(0.5).setDepth(depth + 3);

            acceptBg.on('pointerdown', () => acceptBg.setFillStyle(0x4A5E17));
            acceptBg.on('pointerout', () => acceptBg.setFillStyle(0x718E10));
            acceptBg.on('pointerup', () => {
                this.close();
                if (typeof onAccept === 'function') {
                    onAccept();
                } else {
                    playSfx(scene, 'clique');
                }
            });

            // Botao Cancelar (oliva escuro)
            const cancelBg = scene.add.rectangle(cancelX, buttonY, btnWidth, btnHeight, 0x4A5E17);
            cancelBg.setStrokeStyle(2, 0x000000);
            cancelBg.setDepth(depth + 2);
            cancelBg.setInteractive({ useHandCursor: true });

            const cancelLabelText = scene.add.text(cancelX, buttonY, cancelLabel, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#d9e8b5'
            })).setOrigin(0.5).setDepth(depth + 3);

            cancelBg.on('pointerdown', () => cancelBg.setFillStyle(0x33410f));
            cancelBg.on('pointerout', () => cancelBg.setFillStyle(0x4A5E17));
            cancelBg.on('pointerup', () => {
                playSfx(scene, 'clique');
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

            const cancelBg = scene.add.rectangle(centerX, buttonY, btnWidth, btnHeight, 0x718E10);
            cancelBg.setStrokeStyle(2, 0x000000);
            cancelBg.setDepth(depth + 2);
            cancelBg.setInteractive({ useHandCursor: true });

            const cancelLabelText = scene.add.text(centerX, buttonY, 'Fechar', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#BDEE38'
            })).setOrigin(0.5).setDepth(depth + 3);

            cancelBg.on('pointerdown', () => cancelBg.setFillStyle(0x4A5E17));
            cancelBg.on('pointerout', () => cancelBg.setFillStyle(0x718E10));
            cancelBg.on('pointerup', () => {
                playSfx(scene, 'clique');
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
