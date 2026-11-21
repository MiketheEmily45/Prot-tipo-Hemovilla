import { getATP, spendATP } from './atpStore.js';
import { canPurchaseCity, CITY_3_PRICE, isCityPurchased, isCityUnlocked, purchaseCity } from './cityUnlocks.js';
import { createTextStyle } from './textUtils.js';
import { playSfx, preloadAudio } from './AudioManager.js';
import {
    equipShopCharacter,
    assignShopCharacterReplacement,
    getCharacterReplacements,
    getCharacterReplacementTarget,
    isReplacementTargetAccessible,
    isShopCharacterPurchased,
    purchaseShopCharacter
} from './shopStore.js';
import { CITY_CHARACTER_IDS } from './cityOccurrenceConfig.js';
import { characterData } from './characterData.js';
import { getShopCharacterPresentation } from './shopCharacterPresentation.js';

const SHOP_ASSETS = {
    'shop-background': 'assets/Telas/Loja/fundo_loja.png',
    'shop-title': 'assets/Telas/Loja/titulo_loja.png',
    'shop-balance-panel': 'assets/Telas/Loja/painel_saldo_atp.png',
    'shop-atp-icon': 'assets/Telas/Loja/icone_atp.png',
    'shop-card-grid': 'assets/Telas/Loja/card_item_loja.png',
    'shop-back-button': 'assets/Telas/Loja/btn_voltar_loja.png',
    'shop-buy-button': 'assets/Telas/Loja/btn_comprar.png',
    'shop-buy-disabled-button': 'assets/Telas/Loja/btn_comprar_desativado.png',
    'shop-equip-button': 'assets/Telas/Loja/btn_equipar.png',
    'shop-city-preview': 'assets/Telas/Loja/previa_Cidade3.png',
    'shop-douglas': 'assets/Telas/Loja/Imagem_Douglas.png',
    'shop-cristina': 'assets/Telas/Loja/Imagem_Cristina.png',
    'shop-nurse': 'assets/Telas/Loja/Imagem_Enfermeira.png',
    'shop-price-500': 'assets/Telas/Loja/preco500_atp.png',
    'shop-price-600': 'assets/Telas/Loja/preco600_atp.png',
    'shop-price-1000': 'assets/Telas/Loja/preco1000_atp.png',
    'shop-confirm-panel': 'assets/Telas/Loja/PopUp_ConfirmarCompra.png',
    'shop-confirm-yes': 'assets/Telas/Loja/moldura_botao_sim.png',
    'shop-confirm-no': 'assets/Telas/Loja/moldura_botao_nao.png'
};

const SHOP_ITEMS = [
    { id: 'douglas', name: 'Douglas', kind: 'character', price: 600, portrait: 'shop-douglas', priceAsset: 'shop-price-600' },
    { id: 'cristina', name: 'Cristina', kind: 'character', price: 600, portrait: 'shop-cristina', priceAsset: 'shop-price-600' },
    { id: 'enfermeira', name: 'Enfermeira', kind: 'character', price: 500, portrait: 'shop-nurse', priceAsset: 'shop-price-500' },
    { id: 'cidade3', name: 'Cidade 3', kind: 'city', price: CITY_3_PRICE, portrait: 'shop-city-preview', priceAsset: 'shop-price-1000' }
];

const CARD_GRID = {
    x: 68,
    y: 108,
    slots: [
        { x: 24, y: 21, width: 143, height: 110 },
        { x: 202, y: 21, width: 143, height: 110 },
        { x: 24, y: 169, width: 143, height: 110 },
        { x: 202, y: 169, width: 143, height: 110 }
    ]
};

// Caixa branca interna de painel_saldo_atp.png (85x34 em x=512, y=2, origin 1,0): x431..507, y6..31.
const BALANCE_BOX_CENTER_X = 469;
const BALANCE_BOX_CENTER_Y = 19;
const BALANCE_ICON_TEXT_GAP = 4;

export class Shop extends Phaser.Scene {
    constructor() {
        super('Shop');
        this.fromScene = 'Start';
        this.returnData = undefined;
        this.cardElements = [];
        this.modalElements = [];
        this.modalOpen = false;
        this.feedbackTimer = null;
    }

    init(data = {}) {
        this.fromScene = data.fromScene || 'Start';
        this.returnData = data.returnData;
        this.cardElements = [];
        this.modalElements = [];
        this.feedbackTimer = null;
        this.modalOpen = false;
    }

    preload() {
        Object.entries(SHOP_ASSETS).forEach(([key, path]) => {
            if (!this.textures.exists(key)) {
                this.load.image(key, path);
            }
        });
        preloadAudio(this);
    }

    create() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);
        Object.keys(SHOP_ASSETS).forEach((key) => {
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        });

        this.add.image(256, 256, 'shop-background').setDepth(0);
        this.add.image(256, 41, 'shop-title').setDepth(1);
        this.add.image(CARD_GRID.x, CARD_GRID.y, 'shop-card-grid').setOrigin(0, 0).setDepth(1);
        this.createBalancePanel();
        this.createBackButton();
        this.createFeedbackText();
        this.renderCards();

        this.escapeHandler = () => {
            if (this.modalOpen) {
                this.closePurchaseDialog();
            } else {
                this.returnToPreviousScene();
            }
        };
        this.input.keyboard?.on('keydown-ESC', this.escapeHandler);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown-ESC', this.escapeHandler);
            this.feedbackTimer?.remove(false);
        });
    }

    createBalancePanel() {
        this.add.image(512, 2, 'shop-balance-panel')
            .setOrigin(1, 0)
            .setDepth(2);
        this.balanceIcon = this.add.image(BALANCE_BOX_CENTER_X, BALANCE_BOX_CENTER_Y, 'shop-atp-icon')
            .setOrigin(0, 0.5)
            .setDepth(3);
        this.balanceText = this.add.text(BALANCE_BOX_CENTER_X, BALANCE_BOX_CENTER_Y, String(getATP()), createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#000000'
        })).setOrigin(0, 0.5).setDepth(3);
        this.layoutBalanceDisplay();
    }

    layoutBalanceDisplay() {
        if (!this.balanceIcon || !this.balanceText) return;
        const iconWidth = this.balanceIcon.displayWidth || 21;
        const textWidth = this.balanceText.displayWidth || this.balanceText.width || 0;
        const totalWidth = iconWidth + BALANCE_ICON_TEXT_GAP + textWidth;
        const startX = Math.round(BALANCE_BOX_CENTER_X - totalWidth / 2);
        this.balanceIcon.setPosition(startX, BALANCE_BOX_CENTER_Y);
        this.balanceText.setPosition(Math.round(startX + iconWidth + BALANCE_ICON_TEXT_GAP), BALANCE_BOX_CENTER_Y);
    }

    createBackButton() {
        this.backButton = this.add.image(462, 472, 'shop-back-button').setDepth(5);
        this.backButton.setInteractive({ useHandCursor: true });
        this.backButton.on('pointerdown', () => this.backButton.setTint(0x8B2E40));
        this.backButton.on('pointerout', () => this.backButton.clearTint());
        this.backButton.on('pointerup', () => {
            this.backButton.clearTint();
            playSfx(this, 'clique');
            this.returnToPreviousScene();
        });
    }

    createFeedbackText() {
        this.feedbackText = this.add.text(256, 474, '', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 8, y: 4 }
        })).setOrigin(0.5).setDepth(20).setVisible(false);
    }

    updateBalance() {
        this.balanceText?.setText(String(getATP()));
        this.layoutBalanceDisplay();
    }

    renderCards() {
        this.cardElements.forEach((element) => element.destroy());
        this.cardElements = [];

        SHOP_ITEMS.forEach((item, index) => {
            const slot = CARD_GRID.slots[index];
            const left = CARD_GRID.x + slot.x;
            const top = CARD_GRID.y + slot.y;
            const centerX = Math.round(left + slot.width / 2);
            const centerY = Math.round(top + slot.height / 2);
            const depth = 2;

            this.cardElements.push(
                this.add.image(centerX, centerY, item.portrait)
                    .setDepth(depth)
            );
            this.cardElements.push(
                this.add.text(left + 4, top + slot.height - 9, item.name, createTextStyle({
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontStyle: 'bold',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    padding: { x: 2, y: 1 }
                })).setOrigin(0, 0.5).setDepth(depth + 1)
            );
            this.cardElements.push(
                this.add.image(left + slot.width - 2, top + slot.height - 2, item.priceAsset)
                    .setOrigin(1, 1)
                    .setDepth(depth + 1)
            );

            this.createCardAction(item, centerX, top + slot.height + 9);
        });
    }

    createCardAction(item, x, y) {
        if (item.kind === 'character' && isShopCharacterPurchased(item.id)) {
            this.createImageButton(x, y, 'shop-equip-button', () => {
                this.openReplacementDialog(item);
            });
            const targetId = getCharacterReplacementTarget(item.id);
            if (targetId) {
                const targetName = (characterData[targetId]?.nome || targetId).replace(/^(Dona|Seu) /, '');
                this.cardElements.push(
                    this.add.text(Math.round(x), Math.round(y + 18), `Substitui ${targetName}`, createTextStyle({
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        fontStyle: 'bold',
                        color: '#21161b',
                        align: 'center'
                    })).setOrigin(0.5).setDepth(5)
                );
            }
            return;
        }

        if (item.kind === 'city' && (isCityPurchased(2) || isCityUnlocked(2))) {
            this.createStatusButton(x, y, isCityPurchased(2) ? 'COMPRADA' : 'LIBERADA');
            return;
        }

        const hasEnoughATP = getATP() >= item.price;
        const canBuy = item.kind === 'city' ? canPurchaseCity(2) && hasEnoughATP : hasEnoughATP;
        const buttonKey = canBuy ? 'shop-buy-button' : 'shop-buy-disabled-button';

        this.createImageButton(x, y, buttonKey, () => {
            if (!canBuy) {
                const message = item.kind === 'city' && !canPurchaseCity(2)
                    ? 'Libere a Cidade 2 antes de comprar esta cidade.'
                    : `Saldo insuficiente: faltam ${Math.max(0, item.price - getATP())} ATP.`;
                playSfx(this, 'bloqueado');
                this.showFeedback(message);
                return;
            }
            this.openPurchaseDialog(item);
        });
    }

    openReplacementDialog(item) {
        if (this.modalOpen) return;
        this.modalOpen = true;
        this.modalElements = [];

        const backdrop = this.add.rectangle(256, 256, 512, 512, 0x000000, 0.76)
            .setDepth(100)
            .setInteractive();
        backdrop.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            this.closePurchaseDialog();
        });
        this.modalElements.push(backdrop);
        this.modalElements.push(
            this.add.rectangle(256, 256, 448, 408, 0x652638, 0.98)
                .setStrokeStyle(3, 0x21161b)
                .setDepth(101),
            this.add.text(256, 73, 'ESCOLHA QUEM SUBSTITUIR', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center'
            })).setOrigin(0.5).setDepth(102),
            this.add.text(256, 96, 'Somente personagens de cidades liberadas', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#f5d6dc',
                align: 'center'
            })).setOrigin(0.5).setDepth(102)
        );

        const replacements = getCharacterReplacements();
        const targets = Object.entries(CITY_CHARACTER_IDS).flatMap(([cityNumber, ids]) =>
            ids.map((id) => ({
                id,
                cityNumber: Number(cityNumber),
                name: characterData[id]?.nome || id
            }))
        );

        targets.forEach((target, index) => {
            const column = index % 3;
            const row = Math.floor(index / 3);
            const x = 108 + column * 148;
            const y = 154 + row * 96;
            const isAccessible = isReplacementTargetAccessible(target.id);
            const currentExtraId = replacements[target.id];
            const currentExtra = getShopCharacterPresentation(currentExtraId);
            const fill = isAccessible ? 0x3c6b45 : 0x484848;
            const tile = this.add.rectangle(x, y, 132, 78, fill, 1)
                .setStrokeStyle(2, isAccessible ? 0x19251b : 0x303030)
                .setDepth(102);
            this.modalElements.push(tile);

            this.modalElements.push(
                this.add.text(x, y - 20, target.name, createTextStyle({
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontStyle: 'bold',
                    color: isAccessible ? '#ffffff' : '#aaaaaa',
                    align: 'center'
                })).setOrigin(0.5).setDepth(103),
                this.add.text(x, y, `Cidade ${target.cityNumber}`, createTextStyle({
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: isAccessible ? '#e5f5e8' : '#bbbbbb',
                    align: 'center'
                })).setOrigin(0.5).setDepth(103),
                this.add.text(
                    x,
                    y + 20,
                    !isAccessible ? 'BLOQUEADA' : currentExtra ? `Atual: ${currentExtra.name}` : 'DISPONÍVEL',
                    createTextStyle({
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        fontStyle: 'bold',
                        color: isAccessible ? '#bdee38' : '#cccccc',
                        align: 'center'
                    })
                ).setOrigin(0.5).setDepth(103)
            );

            tile.setInteractive({ useHandCursor: isAccessible });
            if (!isAccessible) {
                tile.on('pointerup', (_pointer, _localX, _localY, event) => {
                    event?.stopPropagation?.();
                    playSfx(this, 'bloqueado');
                    this.showFeedback(`A Cidade ${target.cityNumber} ainda está bloqueada.`);
                });
                return;
            }

            let isPressed = false;
            tile.on('pointerdown', () => {
                isPressed = true;
                tile.setFillStyle(0x527f5a);
            });
            tile.on('pointerout', () => {
                isPressed = false;
                tile.setFillStyle(fill);
            });
            tile.on('pointerup', (_pointer, _localX, _localY, event) => {
                event?.stopPropagation?.();
                tile.setFillStyle(fill);
                if (!isPressed) return;
                isPressed = false;
                if (!assignShopCharacterReplacement(item.id, target.id)) {
                    this.showFeedback('Não foi possível substituir este personagem.');
                    return;
                }
                equipShopCharacter(item.id);
                this.closePurchaseDialog();
                playSfx(this, 'clique');
                this.renderCards();
                this.showFeedback(`${item.name} agora substitui ${target.name}.`);
            });
        });

        const close = this.add.rectangle(256, 425, 136, 30, 0x873646)
            .setStrokeStyle(2, 0x21161b)
            .setDepth(102)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(256, 425, 'CANCELAR', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff'
        })).setOrigin(0.5).setDepth(103);
        close.on('pointerup', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            this.closePurchaseDialog();
            playSfx(this, 'clique');
        });
        this.modalElements.push(close, closeText);
    }

    createImageButton(x, y, textureKey, onClick) {
        const button = this.add.image(x, y, textureKey).setDepth(4);
        button.setInteractive({ useHandCursor: true });
        let isPressed = false;

        button.on('pointerdown', () => {
            isPressed = true;
            button.setTint(0x8B2E40);
        });
        button.on('pointerout', () => {
            isPressed = false;
            button.clearTint();
        });
        button.on('pointerup', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            button.clearTint();
            if (!isPressed || this.modalOpen) return;
            isPressed = false;
            onClick();
        });

        this.cardElements.push(button);
        return button;
    }

    createStatusButton(x, y, label) {
        const background = this.add.rectangle(Math.round(x), Math.round(y), 89, 25, 0x3f3f3f)
            .setStrokeStyle(2, 0x000000)
            .setDepth(4);
        const text = this.add.text(Math.round(x), Math.round(y), label, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#bdee38'
        })).setOrigin(0.5).setDepth(5);
        this.cardElements.push(background, text);
    }

    openPurchaseDialog(item) {
        if (this.modalOpen) return;
        this.modalOpen = true;
        this.modalElements = [];

        const backdrop = this.add.rectangle(256, 256, 512, 512, 0x000000, 0.72)
            .setDepth(100)
            .setInteractive();
        backdrop.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());
        this.modalElements.push(backdrop);
        this.modalElements.push(
            this.add.image(256, 256, 'shop-confirm-panel').setDepth(101),
            this.add.text(256, 250, `Comprar ${item.name}?`, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#000000',
                align: 'center'
            })).setOrigin(0.5).setDepth(102),
            this.add.text(256, 267, `Preço: ${item.price} | Saldo: ${getATP()} ATP`, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '10px',
                fontStyle: 'bold',
                color: '#000000',
                align: 'center'
            })).setOrigin(0.5).setDepth(102)
        );

        this.createModalButton(219, 287, 'shop-confirm-yes', () => {
            this.closePurchaseDialog();
            this.completePurchase(item);
        });
        this.createModalButton(293, 287, 'shop-confirm-no', () => {
            this.closePurchaseDialog();
            playSfx(this, 'clique');
        });
    }

    createModalButton(x, y, textureKey, onClick) {
        const button = this.add.image(x, y, textureKey).setDepth(102);
        button.setInteractive({ useHandCursor: true });
        let isPressed = false;

        button.on('pointerdown', () => {
            isPressed = true;
            button.setTint(0x8B2E40);
        });
        button.on('pointerout', () => {
            isPressed = false;
            button.clearTint();
        });
        button.on('pointerup', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            button.clearTint();
            if (!isPressed) return;
            isPressed = false;
            playSfx(this, 'clique');
            onClick();
        });
        this.modalElements.push(button);
    }

    completePurchase(item) {
        const alreadyAvailable = item.kind === 'city'
            ? isCityPurchased(2) || isCityUnlocked(2)
            : isShopCharacterPurchased(item.id);
        if (alreadyAvailable) {
            this.renderCards();
            this.showFeedback(`${item.name} já está disponível.`);
            return;
        }
        if (item.kind === 'city' && !canPurchaseCity(2)) {
            this.showFeedback('Libere a Cidade 2 antes de comprar esta cidade.');
            return;
        }

        if (getATP() < item.price || !spendATP(item.price)) {
            this.showFeedback(`Saldo insuficiente: são necessários ${item.price} ATP.`);
            return;
        }

        if (item.kind === 'city') {
            purchaseCity(2);
        } else if (!purchaseShopCharacter(item.id)) {
            this.showFeedback('Não foi possível concluir a compra.');
            return;
        }

        playSfx(this, 'compra');
        this.updateBalance();
        this.renderCards();
        this.showFeedback(`${item.name} comprado!`);
    }

    closePurchaseDialog() {
        this.modalElements.forEach((element) => element.destroy());
        this.modalElements = [];
        this.modalOpen = false;
    }

    showFeedback(message) {
        this.feedbackText.setText(message).setVisible(true);
        this.feedbackTimer?.remove(false);
        this.feedbackTimer = this.time.delayedCall(2200, () => {
            this.feedbackText?.setVisible(false);
        });
    }

    returnToPreviousScene() {
        this.scene.start(this.fromScene, this.returnData);
    }
}
