// Painel do Guia do Minigame (estrutura base com abas, overlay bloqueador e pausa de tempo).
import { createTextStyle } from './textUtils.js';
import { getCompatibilityGuideEntries } from './bloodCompatibility.js';

export const GUIDE_PANEL_CONFIG = {
    panelWidth: 448,
    panelHeight: 410,
    panelX: 256,
    panelY: 256
};

export const GUIDE_TABS = [
    { id: 'tipos', label: 'Tipos' },
    { id: 'compatibilidade', label: 'Compatibilidade' },
    { id: 'contaminadas', label: 'Contaminadas' }
];

export class GuidePanel {
    constructor(scene, attendanceState, options = {}) {
        this.scene = scene;
        this.attendanceState = attendanceState;
        this.onToggleVisibility = options.onToggleVisibility || null;
        this.isOpen = false;
        this.activeTab = 'tipos';
        this.wasClockRunning = false;

        // Elementos da moldura e controle
        this.overlay = null;
        this.frame = null;
        this.panelBlocker = null;
        this.closeButton = null;
        this.titleText = null;
        this.tabButtons = [];
        this.contentElements = [];
    }

    open(initialTab = 'tipos') {
        if (this.isOpen) {
            this.selectTab(initialTab);
            return;
        }

        const scene = this.scene;
        this.isOpen = true;
        this.activeTab = initialTab;

        if (typeof this.onToggleVisibility === 'function') {
            this.onToggleVisibility(false);
        }

        // Pausa o relogio se ele estiver rodando, guardando o estado para retomar apenas se necessario
        this.wasClockRunning = Boolean(this.attendanceState?.isClockRunning);
        if (this.wasClockRunning) {
            this.attendanceState.pause();
        }

        const { panelWidth, panelHeight, panelX, panelY } = GUIDE_PANEL_CONFIG;
        const panelTop = panelY - panelHeight / 2;

        // 1. Overlay escurecido que bloqueia a cena do minigame ao fundo
        this.overlay = scene.add.rectangle(256, 256, 512, 512, 0x000000, 0.72);
        this.overlay.setDepth(200);
        this.overlay.setInteractive({ useHandCursor: true });
        this.overlay.on('pointerdown', () => this.close());

        // 2. Moldura central
        this.frame = scene.add.image(panelX, panelY, 'character-frame');
        this.frame.setDisplaySize(panelWidth, panelHeight);
        this.frame.setDepth(201);

        // 3. Bloqueador de cliques dentro da moldura para nao fechar no clique interno
        this.panelBlocker = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xffffff, 0);
        this.panelBlocker.setDepth(202);
        this.panelBlocker.setInteractive();
        this.panelBlocker.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());

        // 4. Titulo centralizado (descido 4 px para nao encostar na borda superior do pergaminho)
        this.titleText = scene.add.text(panelX, panelTop + 38, 'GUIA DE ATENDIMENTO', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#3b2a20'
        })).setOrigin(0.5).setDepth(203);

        // 5. Botao fechar (X)
        const closeX = panelX + panelWidth / 2 - 28;
        const closeY = panelTop + 12;
        this.closeButton = scene.add.text(closeX, closeY, 'X', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#afadab'
        })).setOrigin(0.5).setDepth(204);
        this.closeButton.setInteractive({ useHandCursor: true });
        this.closeButton.on('pointerover', () => this.closeButton.setColor('#ffffff'));
        this.closeButton.on('pointerout', () => this.closeButton.setColor('#afadab'));
        this.closeButton.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            this.close();
        });

        // 6. Abas superiores
        this.createTabs(panelTop + 64);

        // 7. Renderiza o conteudo da aba ativa
        this.renderTabContent();
    }

    createTabs(tabY) {
        const scene = this.scene;
        const tabWidth = 120;
        const tabHeight = 24;
        const startX = 256 - tabWidth; // Tres abas centralizadas: -120, 0, +120

        this.tabButtons = GUIDE_TABS.map((tab, index) => {
            const x = startX + index * tabWidth;
            const bg = scene.add.rectangle(x, tabY, tabWidth - 6, tabHeight, 0x2c1e18, 0.85);
            bg.setStrokeStyle(1, 0x8B2E40);
            bg.setDepth(203);
            bg.setInteractive({ useHandCursor: true });

            const label = scene.add.text(x, tabY, tab.label, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#d1d5db'
            })).setOrigin(0.5).setDepth(204);
            label.setInteractive({ useHandCursor: true });

            const onSelect = () => this.selectTab(tab.id);
            bg.on('pointerup', onSelect);
            label.on('pointerup', onSelect);

            return { id: tab.id, bg, label };
        });

        this.updateTabStyles();
    }

    updateTabStyles() {
        this.tabButtons.forEach(({ id, bg, label }) => {
            const isActive = id === this.activeTab;
            if (isActive) {
                bg.setFillStyle(0x8B2E40, 1);
                bg.setStrokeStyle(2, 0xfbbf24);
                label.setColor('#ffffff');
            } else {
                bg.setFillStyle(0x2c1e18, 0.7);
                bg.setStrokeStyle(1, 0x5a3e36);
                label.setColor('#9ca3af');
            }
        });
    }

    selectTab(tabId) {
        if (this.activeTab === tabId && this.contentElements.length > 0) {
            return;
        }

        this.activeTab = tabId;
        this.updateTabStyles();
        this.clearContent();
        this.renderTabContent();
    }

    clearContent() {
        this.contentElements.forEach((el) => {
            if (el && typeof el.destroy === 'function') {
                el.destroy();
            }
        });
        this.contentElements = [];
    }

    renderTabContent() {
        // Estrutura base de visualizacao para cada aba
        const scene = this.scene;
        const { panelX, panelY } = GUIDE_PANEL_CONFIG;

        if (this.activeTab === 'tipos') {
            this.renderTiposTab();
        } else if (this.activeTab === 'compatibilidade') {
            this.renderCompatibilidadeTab();
        } else if (this.activeTab === 'contaminadas') {
            const placeholder = scene.add.text(panelX, panelY + 20, 'Conteúdo da Aba 3 (Contaminadas):\n(Será integrado no Passo 5)', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#3b2a20',
                align: 'center'
            })).setOrigin(0.5).setDepth(203);
            this.contentElements.push(placeholder);
        }
    }

    renderTiposTab() {
        const scene = this.scene;
        const { panelX } = GUIDE_PANEL_CONFIG;

        const tiposData = [
            {
                tipo: 'Tipo A',
                hemaciaKey: 'hemacia-A',
                antigenos: 'Antígenos na membrana: Antígeno A.',
                reacao: 'Reação: reage (aglutina) com soro Anti-A (não reage com Anti-B).',
                antibodies: ['anticorpo-anti-a'],
                textWrapWidth: 268
            },
            {
                tipo: 'Tipo B',
                hemaciaKey: 'hemacia-B',
                antigenos: 'Antígenos na membrana: Antígeno B.',
                reacao: 'Reação: reage (aglutina) com soro Anti-B (não reage com Anti-A).',
                antibodies: ['anticorpo-anti-b'],
                textWrapWidth: 268
            },
            {
                tipo: 'Tipo AB',
                hemaciaKey: 'hemacia-AB',
                antigenos: 'Antígenos na membrana: Antígenos A e B.',
                reacao: 'Reação: reage (aglutina) com Anti-A e com Anti-B.',
                antibodies: ['anticorpo-anti-a', 'anticorpo-anti-b'],
                textWrapWidth: 240
            },
            {
                tipo: 'Tipo O',
                hemaciaKey: 'hemacia-O',
                antigenos: 'Antígenos na membrana: nenhum antígeno A ou B.',
                reacao: 'Reação: não reage com Anti-A nem com Anti-B.',
                antibodies: [],
                textWrapWidth: 314
            }
        ];

        const startY = 134;
        const rowHeight = 77;

        tiposData.forEach((item, index) => {
            const rowY = startY + index * rowHeight;
            const rowCenter = rowY + 38;

            // Linha divisoria sutil entre os itens (distribuicao uniforme aproveitando o espaco)
            if (index < tiposData.length - 1) {
                const separator = scene.add.line(
                    panelX,
                    rowY + rowHeight,
                    0,
                    0,
                    364,
                    0,
                    0x8c7355,
                    0.35
                ).setDepth(203);
                this.contentElements.push(separator);
            }

            // Hemacia no lado esquerdo com escala inteira e filtro NEAREST para maxima nitidez
            const hemacia = scene.add.image(94, rowCenter, item.hemaciaKey);
            hemacia.setScale(1);
            if (hemacia.texture) {
                hemacia.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
            hemacia.setDepth(203);
            this.contentElements.push(hemacia);

            // Nome do tipo (destaque, maior que a legenda)
            const title = scene.add.text(126, rowY + 5, item.tipo, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#8B2E40'
            })).setDepth(203);
            this.contentElements.push(title);

            // Legenda de antigenos aprovada (resolucao 3, coordenadas inteiras)
            const antigenText = scene.add.text(126, rowY + 22, item.antigenos, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#3b2a20',
                wordWrap: { width: item.textWrapWidth, useAdvancedWrap: true }
            })).setDepth(203);
            this.contentElements.push(antigenText);

            // Legenda de reacao aprovada (resolucao 3, coordenadas inteiras)
            const reacaoText = scene.add.text(126, rowY + 37, item.reacao, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#3b2a20',
                lineSpacing: 2,
                wordWrap: { width: item.textWrapWidth, useAdvancedWrap: true }
            })).setDepth(203);
            this.contentElements.push(reacaoText);

            // Icones de anticorpo ao lado da reacao com escala inteira 1 (dobro do tamanho anterior) e filtro NEAREST
            if (item.antibodies.length === 1) {
                const abIcon = scene.add.image(418, rowCenter, item.antibodies[0]);
                abIcon.setScale(1);
                if (abIcon.texture) {
                    abIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                abIcon.setDepth(203);
                this.contentElements.push(abIcon);
            } else if (item.antibodies.length === 2) {
                const ab1 = scene.add.image(388, rowCenter, item.antibodies[0]);
                ab1.setScale(1);
                if (ab1.texture) {
                    ab1.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                ab1.setDepth(203);
                this.contentElements.push(ab1);

                const ab2 = scene.add.image(424, rowCenter, item.antibodies[1]);
                ab2.setScale(1);
                if (ab2.texture) {
                    ab2.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                ab2.setDepth(203);
                this.contentElements.push(ab2);
            }
        });
    }

    

    renderCompatibilidadeTab() {
        const scene = this.scene;
        const { panelX } = GUIDE_PANEL_CONFIG;
        const entries = getCompatibilityGuideEntries();

        const startY = 134;
        const rowHeight = 77;
        const bagOrigin = { x: 33.5 / 64, y: 20.5 / 64 };

        entries.forEach((item, index) => {
            const rowY = startY + index * rowHeight;

            // Linha divisoria sutil entre os itens (distribuicao uniforme aproveitando o espaco)
            if (index < entries.length - 1) {
                const separator = scene.add.line(
                    panelX,
                    rowY + rowHeight,
                    0,
                    0,
                    364,
                    0,
                    0x8c7355,
                    0.35
                ).setDepth(203);
                this.contentElements.push(separator);
            }

            // Coluna esquerda: rotulo "Paciente X" em vinho (#8B2E40) com a hemacia do tipo
            const patientLabel = scene.add.text(94, rowY + 8, item.patientLabel, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#8B2E40'
            })).setOrigin(0.5, 0).setDepth(203);
            this.contentElements.push(patientLabel);

            const hemacia = scene.add.image(94, rowY + 47, item.hemaciaKey);
            hemacia.setScale(0.75);
            if (hemacia.texture) {
                hemacia.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
            hemacia.setDepth(203);
            this.contentElements.push(hemacia);

            // Coluna direita: rotulo "Pode receber:", miniaturas das bolsas compativeis e explicacao
            const receiveLabel = scene.add.text(144, rowY + 20, 'Pode receber:', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#5a3e36'
            })).setOrigin(0, 0.5).setDepth(203);
            this.contentElements.push(receiveLabel);

            // Miniaturas das bolsas compativeis (mesmos sprites que a Fase 3 usa hoje)
            const bagStartX = 248;
            const bagSpacing = 36;
            item.compatibleBags.forEach((bagType, bagIdx) => {
                const bagX = bagStartX + bagIdx * bagSpacing;
                const bagY = rowY + 20;
                const bagSprite = scene.add.image(bagX, bagY, 'bolsa-' + bagType);
                bagSprite.setOrigin(bagOrigin.x, bagOrigin.y);
                bagSprite.setScale(1);
                if (bagSprite.texture) {
                    bagSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                bagSprite.setDepth(203);
                this.contentElements.push(bagSprite);
            });

            // Linha curta de explicacao (resolucao 3, coordenadas inteiras)
            const explanationText = scene.add.text(144, rowY + 54, item.explanation, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#3b2a20'
            })).setOrigin(0, 0.5).setDepth(203);
            this.contentElements.push(explanationText);
        });
    }

    close(resumeClock = true) {
                if (!this.isOpen) {
            return;
        }

        this.isOpen = false;
        this.clearContent();

        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
        if (this.frame) {
            this.frame.destroy();
            this.frame = null;
        }
        if (this.panelBlocker) {
            this.panelBlocker.destroy();
            this.panelBlocker = null;
        }
        if (this.titleText) {
            this.titleText.destroy();
            this.titleText = null;
        }
        if (this.closeButton) {
            this.closeButton.destroy();
            this.closeButton = null;
        }

        this.tabButtons.forEach(({ bg, label }) => {
            bg.destroy();
            label.destroy();
        });
        this.tabButtons = [];

        if (typeof this.onToggleVisibility === 'function') {
            this.onToggleVisibility(true);
        }

        // Retoma o relogio uma unica vez, apenas se ele estava rodando antes de abrir
        if (resumeClock && this.wasClockRunning && this.attendanceState) {
            this.attendanceState.resume();
        }
        this.wasClockRunning = false;
    }

    destroy() {
        this.close(false);
        this.scene = null;
        this.attendanceState = null;
        this.onToggleVisibility = null;
    }
}
