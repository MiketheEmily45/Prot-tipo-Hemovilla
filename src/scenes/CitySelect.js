import { cities, preloadCities } from './CityNavigation.js';
import {
    isCityUnlocked,
    canPurchaseCity,
    purchaseCity,
    getCityLockMessage,
    CITY_3_PRICE
} from './cityUnlocks.js';
import { getATP, spendATP } from './atpStore.js';
import { AtpDisplay } from './AtpDisplay.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';
import { createTextStyle } from './textUtils.js';

export const CITY_NAMES = [
    'Centro',
    'Distrito Profissional',
    'Periferia/lazer'
];

export class CitySelect extends Phaser.Scene {
    constructor() {
        super('CitySelect');
    }

    init(data) {
        this.currentCityIndex = data && typeof data.targetCityIndex === 'number'
            ? data.targetCityIndex
            : (data && typeof data.cityIndex === 'number'
                ? data.cityIndex
                : (data && typeof data.currentCityIndex === 'number' ? data.currentCityIndex : 0));

        this.selectedIndex = this.currentCityIndex;
    }

    preload() {
        preloadCities(this);
        this.load.image('icone-atp', 'assets/Minigame/Cenario/IconeATP.png');
    }

    create() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);

        // Fundo tematico escuro
        this.add.rectangle(256, 256, 512, 512, 0x090d16);

        // Titulo superior
        this.add.text(256, 28, 'SELEÇÃO DE CIDADE', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#f8fafc'
        })).setOrigin(0.5);

        // Botao Fechar / Voltar ao mapa no canto superior esquerdo
        this.createBackButton();

        // Painel de saldo de ATP no canto superior direito
        this.atpDisplay = new AtpDisplay(this, { x: 504, y: 16, width: 84, height: 24 });

        // Dialogo reutilizavel de confirmacao
        this.confirmationDialog = new ConfirmationDialog(this);

        // Grupo de elementos visuais do preview da cidade (recriados ao trocar de cidade)
        this.previewElements = [];

        // Setas laterais de navegacao
        this.createNavigationArrows();

        // Renderiza a cidade inicial
        this.renderCityView();
    }

    createBackButton() {
        const btnX = 40;
        const btnY = 28;
        const btnW = 56;
        const btnH = 30;

        const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1e293b);
        bg.setStrokeStyle(1, 0x475569);
        bg.setInteractive({ useHandCursor: true });

        const label = this.add.text(btnX, btnY, 'Voltar', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff'
        })).setOrigin(0.5);

        bg.on('pointerdown', () => bg.setFillStyle(0x0f172a));
        bg.on('pointerout', () => bg.setFillStyle(0x1e293b));
        bg.on('pointerup', () => {
            bg.setFillStyle(0x1e293b);
            this.scene.start('GameMap', { targetCityIndex: this.currentCityIndex });
        });
    }

    createNavigationArrows() {
        // Seta esquerda
        this.leftArrow = this.add.image(44, 230, 'city-previous');
        this.leftArrow.setOrigin(0.5);
        this.leftArrow.setDepth(50);
        this.leftArrow.setInteractive({ useHandCursor: true });
        this.leftArrow.on('pointerdown', () => this.leftArrow.setTint(0x8B2E40));
        this.leftArrow.on('pointerout', () => this.leftArrow.clearTint());
        this.leftArrow.on('pointerup', () => {
            this.leftArrow.clearTint();
            if (this.selectedIndex > 0) {
                this.setSelectedIndex(this.selectedIndex - 1);
            }
        });

        // Seta direita
        this.rightArrow = this.add.image(468, 230, 'city-next');
        this.rightArrow.setOrigin(0.5);
        this.rightArrow.setDepth(50);
        this.rightArrow.setInteractive({ useHandCursor: true });
        this.rightArrow.on('pointerdown', () => this.rightArrow.setTint(0x8B2E40));
        this.rightArrow.on('pointerout', () => this.rightArrow.clearTint());
        this.rightArrow.on('pointerup', () => {
            this.rightArrow.clearTint();
            if (this.selectedIndex < cities.length - 1) {
                this.setSelectedIndex(this.selectedIndex + 1);
            }
        });
    }

    setSelectedIndex(newIndex) {
        if (newIndex < 0 || newIndex >= cities.length || newIndex === this.selectedIndex) return;
        this.selectedIndex = newIndex;
        this.renderCityView();
    }

    renderCityView() {
        // Limpa os elementos do preview anterior
        this.previewElements.forEach((el) => {
            if (el && typeof el.destroy === 'function') {
                el.destroy();
            }
        });
        this.previewElements = [];

        const cityIndex = this.selectedIndex;
        const cityName = CITY_NAMES[cityIndex] || `Cidade ${cityIndex + 1}`;
        const unlocked = isCityUnlocked(cityIndex);
        const canBuy = canPurchaseCity(cityIndex);
        const isCurrent = cityIndex === this.currentCityIndex;

        // Atualiza visibilidade das setas laterais
        this.leftArrow.setVisible(cityIndex > 0);
        this.leftArrow.input.enabled = cityIndex > 0;
        this.rightArrow.setVisible(cityIndex < cities.length - 1);
        this.rightArrow.input.enabled = cityIndex < cities.length - 1;

        // Nome da cidade e subtitulo
        const nameText = this.add.text(256, 68, cityName, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#38bdf8'
        })).setOrigin(0.5);
        this.previewElements.push(nameText);

        const indexLabel = this.add.text(256, 88, `Cidade ${cityIndex + 1} de ${cities.length}`, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#94a3b8'
        })).setOrigin(0.5);
        this.previewElements.push(indexLabel);

        // Moldura do preview (270x270, escala de 512 para 270 = ~0.527)
        const previewSize = 270;
        const previewX = 256;
        const previewY = 236;
        const scale = previewSize / 512;

        const previewBg = this.add.rectangle(previewX, previewY, previewSize, previewSize, 0x0f172a);
        previewBg.setStrokeStyle(2, unlocked ? 0x38bdf8 : 0x475569);
        this.previewElements.push(previewBg);

        // Camadas do mapa da cidade em escala reduzida
        const currentCityDef = cities[cityIndex];
        if (currentCityDef && currentCityDef.layers) {
            currentCityDef.layers.forEach((_, layerIdx) => {
                const layerKey = `city-${cityIndex}-layer-${layerIdx}`;
                if (this.textures.exists(layerKey)) {
                    const layerSprite = this.add.image(previewX, previewY, layerKey);
                    layerSprite.setScale(scale);
                    if (!unlocked) {
                        layerSprite.setTint(0x555555);
                    }
                    this.previewElements.push(layerSprite);
                }
            });
        }

        // Se bloqueada: overlay escuro e cadeado desenhado em codigo
        if (!unlocked) {
            const overlay = this.add.rectangle(previewX, previewY, previewSize, previewSize, 0x000000, 0.55);
            this.previewElements.push(overlay);

            const lockGfx = this.add.graphics();
            lockGfx.setDepth(10);

            // Alca do cadeado (arco/retangulo arredondado vazado)
            lockGfx.lineStyle(6, 0xe2e8f0, 1);
            lockGfx.strokeRoundedRect(previewX - 18, previewY - 34, 36, 32, 14);

            // Corpo do cadeado
            lockGfx.fillStyle(0xd97706, 1);
            lockGfx.fillRoundedRect(previewX - 26, previewY - 10, 52, 42, 6);
            lockGfx.lineStyle(2, 0x78350f, 1);
            lockGfx.strokeRoundedRect(previewX - 26, previewY - 10, 52, 42, 6);

            // Buraco da fechadura
            lockGfx.fillStyle(0x0f172a, 1);
            lockGfx.fillCircle(previewX, previewY + 7, 5);
            lockGfx.fillRect(previewX - 3, previewY + 7, 6, 12);

            this.previewElements.push(lockGfx);
        }

        // Botao inferior de acao com 4 estados
        this.createActionButton(isCurrent, unlocked, canBuy, cityIndex);
    }

    createActionButton(isCurrent, unlocked, canBuy, cityIndex) {
        const btnX = 256;
        const btnY = 412;
        const btnW = 230;
        const btnH = 42;

        let labelText = '';
        let bgColor = 0x1e293b;
        let strokeColor = 0x334155;
        let textColor = '#ffffff';
        let isClickable = false;
        let clickHandler = null;

        if (isCurrent) {
            // Estado 1: Selecionado (cidade atual, desabilitado)
            labelText = 'Selecionado';
            bgColor = 0x334155;
            strokeColor = 0x475569;
            textColor = '#94a3b8';
            isClickable = false;
        } else if (unlocked) {
            // Estado 2: Selecionar (cidade liberada, ativa)
            labelText = 'Selecionar';
            bgColor = 0x16a34a;
            strokeColor = 0x22c55e;
            textColor = '#ffffff';
            isClickable = true;
            clickHandler = () => {
                this.scene.start('GameMap', { targetCityIndex: cityIndex });
            };
        } else if (canBuy) {
            // Estado 3: Comprar (pode ser comprada por 1000 ATP)
            labelText = `Comprar (${CITY_3_PRICE} ATP)`;
            bgColor = 0x0284c7;
            strokeColor = 0x38bdf8;
            textColor = '#ffffff';
            isClickable = true;
            clickHandler = () => {
                this.confirmationDialog.show({
                    title: 'Liberar Cidade 3',
                    message: 'Deseja comprar o acesso à Periferia/lazer por 1000 ATP?',
                    price: CITY_3_PRICE,
                    currentATP: getATP(),
                    acceptLabel: 'Comprar',
                    cancelLabel: 'Cancelar',
                    onAccept: () => {
                        const success = spendATP(CITY_3_PRICE);
                        if (success) {
                            purchaseCity(2);
                            this.atpDisplay?.update();
                            this.renderCityView();
                        }
                    }
                });
            };
        } else {
            // Estado 4: Bloqueado (nao pode liberar nem comprar ainda)
            labelText = 'Bloqueado';
            bgColor = 0x1e293b;
            strokeColor = 0x334155;
            textColor = '#64748b';
            isClickable = false;
        }

        const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, bgColor);
        btnBg.setStrokeStyle(1.5, strokeColor);
        this.previewElements.push(btnBg);

        const btnText = this.add.text(btnX, btnY, labelText, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: textColor
        })).setOrigin(0.5);
        this.previewElements.push(btnText);

        if (isClickable && clickHandler) {
            btnBg.setInteractive({ useHandCursor: true });
            btnBg.on('pointerdown', () => btnBg.setFillStyle(bgColor === 0x16a34a ? 0x15803d : 0x0369a1));
            btnBg.on('pointerout', () => btnBg.setFillStyle(bgColor));
            btnBg.on('pointerup', () => {
                btnBg.setFillStyle(bgColor);
                clickHandler();
            });
        }

        // Dica sob a cidade bloqueada (ou aviso de compra)
        if (!unlocked) {
            const hint = getCityLockMessage(cityIndex);
            if (hint) {
                const hintText = this.add.text(btnX, 458, hint, createTextStyle({
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: canBuy ? '#38bdf8' : '#f59e0b',
                    align: 'center',
                    wordWrap: { width: 360 }
                })).setOrigin(0.5);
                this.previewElements.push(hintText);
            }
        }
    }

    refresh() {
        this.atpDisplay?.update();
        this.renderCityView();
    }
}
