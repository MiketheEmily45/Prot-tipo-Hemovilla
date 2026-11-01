// Painel do Guia do Minigame (estrutura base com abas, overlay bloqueador e pausa de tempo).
import { createTextStyle } from './textUtils.js';

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

        // 4. Titulo centralizado
        this.titleText = scene.add.text(panelX, panelTop + 34, 'GUIA DE ATENDIMENTO', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#3b2a20'
        })).setOrigin(0.5).setDepth(203);

        // 5. Botao fechar (X)
        const closeX = panelX + panelWidth / 2 - 28;
        const closeY = panelTop + 16;
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
        // Estrutura base de visualizacao para cada aba (sera detalhada nos Passos 3, 4 e 5)
        const scene = this.scene;
        const { panelX, panelY } = GUIDE_PANEL_CONFIG;

        if (this.activeTab === 'tipos') {
            const placeholder = scene.add.text(panelX, panelY + 20, 'Conteúdo da Aba 1 (Tipos):\n(Será integrado no Passo 3)', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#3b2a20',
                align: 'center'
            })).setOrigin(0.5).setDepth(203);
            this.contentElements.push(placeholder);
        } else if (this.activeTab === 'compatibilidade') {
            const placeholder = scene.add.text(panelX, panelY + 20, 'Conteúdo da Aba 2 (Compatibilidade):\n(Será integrado no Passo 4)', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#3b2a20',
                align: 'center'
            })).setOrigin(0.5).setDepth(203);
            this.contentElements.push(placeholder);
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
