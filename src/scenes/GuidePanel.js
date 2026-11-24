// Painel do Guia do Minigame (estrutura base com abas, overlay bloqueador e pausa de tempo).
import { createTextStyle, fitTextToBox } from './textUtils.js';
import { getCompatibilityGuideEntries, RH_GUIDE_RULE_SUMMARY } from './bloodCompatibility.js';
import { isRhEnabledForCity } from './cityOccurrenceConfig.js';
import { CONTAMINATED_SCREENING_INFO } from './contaminatedInfo.js';
import { playSfx } from './AudioManager.js';

const BAG_ORIGIN = { x: 33.5 / 64, y: 20.5 / 64 };

export const GUIDE_PANEL_CONFIG = {
    panelWidth: 448,
    panelHeight: 410,
    panelX: 256,
    panelY: 256
};

export const GUIDE_TABS = [
    { id: 'tipos', label: 'Tipos' },
    { id: 'aglutinacao', label: 'Aglutinação' },
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
            playSfx(scene, 'clique');
            this.close();
        });

        // 6. Abas superiores
        this.createTabs(panelTop + 64);

        // 7. Renderiza o conteudo da aba ativa
        this.renderTabContent();
    }

    createTabs(tabY) {
        const scene = this.scene;
        const tabWidths = {
            tipos: 60,
            aglutinacao: 92,
            compatibilidade: 114,
            contaminadas: 90
        };
        const tabGap = 4;
        const tabHeight = 24;
        const totalWidth = GUIDE_TABS.reduce((sum, tab) => sum + (tabWidths[tab.id] || 90), 0)
            + tabGap * (GUIDE_TABS.length - 1);
        let cursorX = Math.round(GUIDE_PANEL_CONFIG.panelX - totalWidth / 2);

        this.tabButtons = GUIDE_TABS.map((tab) => {
            const width = tabWidths[tab.id] || 90;
            const x = Math.round(cursorX + width / 2);
            cursorX += width + tabGap;

            const bg = scene.add.rectangle(x, tabY, width, tabHeight, 0x2c1e18, 0.85);
            bg.setStrokeStyle(1, 0x8B2E40);
            bg.setDepth(203);
            bg.setInteractive({ useHandCursor: true });

            const label = scene.add.text(x, tabY, tab.label, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '10px',
                fontStyle: 'bold',
                color: '#d1d5db'
            })).setOrigin(0.5).setDepth(204);
            fitTextToBox(label, {
                maxWidth: width - 8,
                maxHeight: 18,
                maxFontSize: 10,
                minFontSize: 8
            });
            label.setInteractive({ useHandCursor: true });

            const onSelect = () => {
                playSfx(scene, 'clique');
                this.selectTab(tab.id);
            };
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
        } else if (this.activeTab === 'aglutinacao') {
            this.renderAglutinacaoTab();
        } else if (this.activeTab === 'compatibilidade') {
            this.renderCompatibilidadeTab();
        } else if (this.activeTab === 'contaminadas') {
            this.renderContaminadasTab();
        }
    }

    isRhEnabled() {
        const cityNumber = (this.scene?.cityIndex ?? 0) + 1;
        return isRhEnabledForCity(cityNumber);
    }

    renderTiposTab() {
        const scene = this.scene;
        const { panelX } = GUIDE_PANEL_CONFIG;

        const tiposData = [
            {
                tipo: 'Tipo A',
                hemaciaKey: 'hemacia-A',
                antigenos: 'Antígeno A na membrana.',
                reacao: 'Aglutina com soro Anti-A (não reage com Anti-B).',
                antibodies: ['anticorpo-anti-a'],
                textWrapWidth: 260
            },
            {
                tipo: 'Tipo B',
                hemaciaKey: 'hemacia-B',
                antigenos: 'Antígeno B na membrana.',
                reacao: 'Aglutina com soro Anti-B (não reage com Anti-A).',
                antibodies: ['anticorpo-anti-b'],
                textWrapWidth: 260
            },
            {
                tipo: 'Tipo AB',
                hemaciaKey: 'hemacia-AB',
                antigenos: 'Antígenos A e B na membrana.',
                reacao: 'Aglutina com Anti-A e com Anti-B.',
                antibodies: ['anticorpo-anti-a', 'anticorpo-anti-b'],
                textWrapWidth: 234
            },
            {
                tipo: 'Tipo O',
                hemaciaKey: 'hemacia-O',
                antigenos: 'Nenhum antígeno A ou B na membrana.',
                reacao: 'Não aglutina com Anti-A nem com Anti-B.',
                antibodies: [],
                textWrapWidth: 310
            }
        ];

        const startY = 128;
        const rowHeight = 51;

        tiposData.forEach((item, index) => {
            const rowY = startY + index * rowHeight;
            const rowCenter = rowY + 25;

            // Linha divisoria sutil entre os tipos ABO
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

            const hemacia = scene.add.image(94, rowCenter, item.hemaciaKey);
            hemacia.setScale(0.72);
            if (hemacia.texture) {
                hemacia.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
            hemacia.setDepth(203);
            this.contentElements.push(hemacia);

            const title = scene.add.text(126, rowY + 2, item.tipo, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#8B2E40',
                wordWrap: { width: item.textWrapWidth, useAdvancedWrap: true }
            })).setDepth(203);
            fitTextToBox(title, {
                maxWidth: item.textWrapWidth,
                maxHeight: 15,
                maxFontSize: 12,
                minFontSize: 9
            });
            this.contentElements.push(title);

            const antigenText = scene.add.text(126, rowY + 16, item.antigenos, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#3b2a20',
                wordWrap: { width: item.textWrapWidth, useAdvancedWrap: true }
            })).setDepth(203);
            fitTextToBox(antigenText, {
                maxWidth: item.textWrapWidth,
                maxHeight: 13,
                maxFontSize: 10,
                minFontSize: 8
            });
            this.contentElements.push(antigenText);

            const reacaoText = scene.add.text(126, rowY + 29, item.reacao, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#3b2a20',
                lineSpacing: 1,
                wordWrap: { width: item.textWrapWidth, useAdvancedWrap: true }
            })).setDepth(203);
            fitTextToBox(reacaoText, {
                maxWidth: item.textWrapWidth,
                maxHeight: 20,
                maxFontSize: 10,
                minFontSize: 8
            });
            this.contentElements.push(reacaoText);

            if (item.antibodies.length === 1) {
                const abIcon = scene.add.image(418, rowCenter, item.antibodies[0]);
                abIcon.setScale(0.75);
                if (abIcon.texture) {
                    abIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                abIcon.setDepth(203);
                this.contentElements.push(abIcon);
            } else if (item.antibodies.length === 2) {
                const ab1 = scene.add.image(392, rowCenter, item.antibodies[0]);
                ab1.setScale(0.75);
                if (ab1.texture) {
                    ab1.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                ab1.setDepth(203);
                this.contentElements.push(ab1);

                const ab2 = scene.add.image(422, rowCenter, item.antibodies[1]);
                ab2.setScale(0.75);
                if (ab2.texture) {
                    ab2.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                ab2.setDepth(203);
                this.contentElements.push(ab2);
            }
        });

        // Bloco do Fator Rh (teste com soro Anti-D)
        const rhBox = scene.add.rectangle(panelX, 380, 366, 80, 0x8B2E40, 0.09);
        rhBox.setStrokeStyle(1, 0x8B2E40, 0.45);
        rhBox.setDepth(203);
        this.contentElements.push(rhBox);

        const rhTitle = scene.add.text(80, 345, 'Fator Rh — Teste com soro Anti-D', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#8B2E40',
            wordWrap: { width: 348, useAdvancedWrap: true }
        })).setDepth(203);
        fitTextToBox(rhTitle, {
            maxWidth: 348,
            maxHeight: 16,
            maxFontSize: 11,
            minFontSize: 8
        });
        this.contentElements.push(rhTitle);

        const rhRows = [
            {
                key: 'hemacia-rh-pos',
                scale: 0.48,
                y: 374,
                text: 'Rh+: tem antígeno D. Aglutina com Anti-D.'
            },
            {
                key: 'hemacia-rh-neg',
                scale: 0.52,
                y: 403,
                text: 'Rh−: sem antígeno D. Não aglutina (liso).'
            }
        ];

        rhRows.forEach((row) => {
            if (scene.textures?.exists?.(row.key)) {
                const cell = scene.add.image(94, row.y, row.key);
                cell.setScale(row.scale);
                if (cell.texture) {
                    cell.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                cell.setDepth(203);
                this.contentElements.push(cell);
            }

            const label = scene.add.text(114, row.y, row.text, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '10px',
                fontStyle: 'bold',
                color: '#3b2a20',
                wordWrap: { width: 274, useAdvancedWrap: true }
            })).setOrigin(0, 0.5).setDepth(203);
            fitTextToBox(label, {
                maxWidth: 274,
                maxHeight: 26,
                maxFontSize: 10,
                minFontSize: 8
            });
            this.contentElements.push(label);
        });

        if (scene.textures?.exists?.('anticorpo-anti-d')) {
            const antiD = scene.add.image(416, 388, 'anticorpo-anti-d');
            antiD.setScale(0.85);
            if (antiD.texture) {
                antiD.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
            antiD.setDepth(203);
            this.contentElements.push(antiD);
        }
    }

    renderAglutinacaoTab() {
        const scene = this.scene;
        const { panelX } = GUIDE_PANEL_CONFIG;

        const legendBg = scene.add.rectangle(panelX, 145, 366, 26, 0x8B2E40, 0.08);
        legendBg.setStrokeStyle(1, 0x8c7355, 0.45);
        legendBg.setDepth(203);
        this.contentElements.push(legendBg);

        const legendItems = [
            { y: 139, colorHex: '#8B2E40', swatch: 0x8B2E40, text: 'Aglutinou: o sangue fica granulado' },
            { y: 151, colorHex: '#2c5e2e', swatch: 0x2e7d32, text: 'Não aglutinou: continua liso' }
        ];
        legendItems.forEach((item) => {
            const dot = scene.add.rectangle(82, item.y, 8, 8, item.swatch, 1).setDepth(203);
            this.contentElements.push(dot);

            const txt = scene.add.text(92, item.y, item.text, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '10px',
                fontStyle: 'bold',
                color: item.colorHex,
                wordWrap: { width: 338, useAdvancedWrap: true }
            })).setOrigin(0, 0.5).setDepth(203);
            fitTextToBox(txt, {
                maxWidth: 338,
                maxHeight: 12,
                maxFontSize: 10,
                minFontSize: 8
            });
            this.contentElements.push(txt);
        });

        const rows = [
            {
                tipo: 'Tipo A',
                wells: [
                    { serum: 'Anti-A', imageKey: 'guia-tipoA-antiA', agglutinated: true },
                    { serum: 'Anti-B', imageKey: 'guia-tipoA-antiB', agglutinated: false }
                ]
            },
            {
                tipo: 'Tipo B',
                wells: [
                    { serum: 'Anti-A', imageKey: 'guia-tipoB-antiA', agglutinated: false },
                    { serum: 'Anti-B', imageKey: 'guia-tipoB-antiB', agglutinated: true }
                ]
            },
            {
                tipo: 'Tipo AB',
                wells: [
                    { serum: 'Anti-A', imageKey: 'guia-tipoAB-antiA', agglutinated: true },
                    { serum: 'Anti-B', imageKey: 'guia-tipoAB-antiB', agglutinated: true }
                ]
            },
            {
                tipo: 'Tipo O',
                wells: [
                    { serum: 'Anti-A', imageKey: 'guia-tipoO-antiA', agglutinated: false },
                    { serum: 'Anti-B', imageKey: 'guia-tipoO-antiB', agglutinated: false }
                ]
            }
        ];

        const startY = 162;
        const rowHeight = 65;
        const columns = [
            { imgX: 152, textX: 184, textMaxW: 88 },
            { imgX: 308, textX: 340, textMaxW: 96 }
        ];

        rows.forEach((row, index) => {
            const rowY = startY + index * rowHeight;
            const rowCenter = rowY + 32;

            if (index < rows.length - 1) {
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

            const tipoText = scene.add.text(94, rowCenter, row.tipo, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#8B2E40',
                wordWrap: { width: 48, useAdvancedWrap: true }
            })).setOrigin(0.5, 0.5).setDepth(203);
            fitTextToBox(tipoText, {
                maxWidth: 48,
                maxHeight: 22,
                maxFontSize: 12,
                minFontSize: 9
            });
            this.contentElements.push(tipoText);

            row.wells.forEach((well, colIdx) => {
                const col = columns[colIdx];
                const borderColor = well.agglutinated ? 0x8B2E40 : 0x2e7d32;
                const statusColor = well.agglutinated ? '#8B2E40' : '#2c5e2e';
                const statusText = well.agglutinated ? 'Aglutinou:\ngranulado' : 'Não aglutinou:\nliso';

                const imgFrame = scene.add.rectangle(col.imgX, rowCenter, 54, 54, 0xffffff, 0.25);
                imgFrame.setStrokeStyle(2, borderColor, 1);
                imgFrame.setDepth(203);
                this.contentElements.push(imgFrame);

                if (scene.textures?.exists?.(well.imageKey)) {
                    const wellImg = scene.add.image(col.imgX, rowCenter, well.imageKey);
                    wellImg.setDisplaySize(50, 50);
                    if (wellImg.texture) {
                        wellImg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                    }
                    wellImg.setDepth(203);
                    this.contentElements.push(wellImg);
                }

                const serumLabel = scene.add.text(col.textX, rowCenter - 12, well.serum, createTextStyle({
                    fontFamily: 'monospace',
                    fontSize: '9px',
                    fontStyle: 'bold',
                    color: '#3b2a20',
                    wordWrap: { width: col.textMaxW, useAdvancedWrap: true }
                })).setOrigin(0, 0.5).setDepth(203);
                fitTextToBox(serumLabel, {
                    maxWidth: col.textMaxW,
                    maxHeight: 12,
                    maxFontSize: 9,
                    minFontSize: 8
                });
                this.contentElements.push(serumLabel);

                const resultLabel = scene.add.text(col.textX, rowCenter + 9, statusText, createTextStyle({
                    fontFamily: 'monospace',
                    fontSize: '9px',
                    fontStyle: 'bold',
                    color: statusColor,
                    lineSpacing: 1,
                    wordWrap: { width: col.textMaxW, useAdvancedWrap: true }
                })).setOrigin(0, 0.5).setDepth(203);
                fitTextToBox(resultLabel, {
                    maxWidth: col.textMaxW,
                    maxHeight: 28,
                    maxFontSize: 9,
                    minFontSize: 8
                });
                this.contentElements.push(resultLabel);
            });
        });
    }

    renderCompatibilidadeTab() {
        const rhEnabled = this.isRhEnabled();
        const entries = getCompatibilityGuideEntries({ rhEnabled });

        if (rhEnabled) {
            this.renderRhCompatibilityRows(entries);
            return;
        }

        this.renderAboCompatibilityRows(entries);
    }

    renderAboCompatibilityRows(entries) {
        const scene = this.scene;
        const { panelX } = GUIDE_PANEL_CONFIG;

        const startY = 130;
        const rowHeight = 72;

        entries.forEach((item, index) => {
            const rowY = startY + index * rowHeight;

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

            const patientLabel = scene.add.text(94, rowY + 6, item.patientLabel, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#8B2E40',
                align: 'center',
                wordWrap: { width: 80, useAdvancedWrap: true }
            })).setOrigin(0.5, 0).setDepth(203);
            fitTextToBox(patientLabel, {
                maxWidth: 80,
                maxHeight: 16,
                maxFontSize: 12,
                minFontSize: 9
            });
            this.contentElements.push(patientLabel);

            const hemacia = scene.add.image(94, rowY + 44, item.hemaciaKey);
            hemacia.setScale(0.75);
            if (hemacia.texture) {
                hemacia.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
            hemacia.setDepth(203);
            this.contentElements.push(hemacia);

            const receiveLabel = scene.add.text(144, rowY + 18, 'Pode receber:', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#5a3e36',
                wordWrap: { width: 96, useAdvancedWrap: true }
            })).setOrigin(0, 0.5).setDepth(203);
            fitTextToBox(receiveLabel, {
                maxWidth: 96,
                maxHeight: 16,
                maxFontSize: 11,
                minFontSize: 8
            });
            this.contentElements.push(receiveLabel);

            const bagStartX = 248;
            const bagSpacing = 36;
            item.compatibleBags.forEach((bagType, bagIdx) => {
                const bagX = bagStartX + bagIdx * bagSpacing;
                const bagY = rowY + 18;
                const bagSprite = scene.add.image(bagX, bagY, 'bolsa-' + bagType);
                bagSprite.setOrigin(BAG_ORIGIN.x, BAG_ORIGIN.y);
                bagSprite.setScale(1);
                if (bagSprite.texture) {
                    bagSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                bagSprite.setDepth(203);
                this.contentElements.push(bagSprite);
            });

            const explanationText = scene.add.text(144, rowY + 50, item.explanation, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#3b2a20',
                wordWrap: { width: 294, useAdvancedWrap: true }
            })).setOrigin(0, 0.5).setDepth(203);
            fitTextToBox(explanationText, {
                maxWidth: 294,
                maxHeight: 28,
                maxFontSize: 11,
                minFontSize: 8
            });
            this.contentElements.push(explanationText);
        });
    }

    renderRhCompatibilityRows(entries) {
        const scene = this.scene;
        const { panelX } = GUIDE_PANEL_CONFIG;

        // Faixa superior com a regra geral do fator Rh
        const ruleBg = scene.add.rectangle(panelX, 140, 366, 22, 0x8B2E40, 0.12);
        ruleBg.setStrokeStyle(1, 0x8B2E40, 0.45);
        ruleBg.setDepth(203);
        this.contentElements.push(ruleBg);

        const ruleText = scene.add.text(panelX, 140, RH_GUIDE_RULE_SUMMARY, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#8B2E40',
            align: 'center',
            wordWrap: { width: 356, useAdvancedWrap: true }
        })).setOrigin(0.5, 0.5).setDepth(203);
        fitTextToBox(ruleText, {
            maxWidth: 356,
            maxHeight: 18,
            maxFontSize: 10,
            minFontSize: 8
        });
        this.contentElements.push(ruleText);

        const startY = 156;
        const rowHeight = 33;

        entries.forEach((item, index) => {
            const rowY = startY + index * rowHeight;
            const rowCenter = rowY + rowHeight / 2;

            if (index < entries.length - 1) {
                const separator = scene.add.line(
                    panelX,
                    rowY + rowHeight,
                    0,
                    0,
                    364,
                    0,
                    0x8c7355,
                    0.3
                ).setDepth(203);
                this.contentElements.push(separator);
            }

            const patientLabel = scene.add.text(76, rowCenter, item.patientLabel, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#8B2E40',
                wordWrap: { width: 88, useAdvancedWrap: true }
            })).setOrigin(0, 0.5).setDepth(203);
            fitTextToBox(patientLabel, {
                maxWidth: 88,
                maxHeight: 26,
                maxFontSize: 11,
                minFontSize: 8
            });
            this.contentElements.push(patientLabel);

            // AB+ recebe os 8 tipos: mostra texto resumido para caber com clareza na moldura
            if (item.compatibleBags.length > 4) {
                const allText = scene.add.text(168, rowCenter, item.explanation, createTextStyle({
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontStyle: 'bold',
                    color: '#3b2a20',
                    wordWrap: { width: 270, useAdvancedWrap: true }
                })).setOrigin(0, 0.5).setDepth(203);
                fitTextToBox(allText, {
                    maxWidth: 270,
                    maxHeight: 28,
                    maxFontSize: 11,
                    minFontSize: 8
                });
                this.contentElements.push(allText);
                return;
            }

            const bagStartX = 178;
            const bagSpacing = 28;
            item.compatibleBags.forEach((bagType, bagIdx) => {
                const bagX = bagStartX + bagIdx * bagSpacing;
                const bagSprite = scene.add.image(bagX, rowCenter, 'bolsa-' + bagType);
                bagSprite.setOrigin(BAG_ORIGIN.x, BAG_ORIGIN.y);
                bagSprite.setScale(0.72);
                if (bagSprite.texture) {
                    bagSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
                bagSprite.setDepth(203);
                this.contentElements.push(bagSprite);
            });

            const explanationText = scene.add.text(294, rowCenter, item.explanation, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#3b2a20',
                wordWrap: { width: 146, useAdvancedWrap: true }
            })).setOrigin(0, 0.5).setDepth(203);
            fitTextToBox(explanationText, {
                maxWidth: 146,
                maxHeight: 28,
                maxFontSize: 10,
                minFontSize: 8
            });
            this.contentElements.push(explanationText);
        });
    }

    renderContaminadasTab() {
        const scene = this.scene;
        const { panelX } = GUIDE_PANEL_CONFIG;
        const info = CONTAMINATED_SCREENING_INFO;

        // Titulo unico da aba ("TRIAGEM E SEGURANCA") em vinho (#8B2E40)
        const title = scene.add.text(panelX, 132, info.title, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#8B2E40',
            align: 'center',
            wordWrap: { width: 360, useAdvancedWrap: true }
        })).setOrigin(0.5, 0).setDepth(203);
        fitTextToBox(title, {
            maxWidth: 360,
            maxHeight: 18,
            maxFontSize: 13,
            minFontSize: 10
        });
        this.contentElements.push(title);

        // Texto introdutorio sobre a triagem sorologica em 11px
        const introText = scene.add.text(panelX, 150, info.intro, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#3b2a20',
            align: 'center',
            lineSpacing: 2,
            wordWrap: { width: 360, useAdvancedWrap: true }
        })).setOrigin(0.5, 0).setDepth(203);
        fitTextToBox(introText, {
            maxWidth: 360,
            maxHeight: 40,
            maxFontSize: 11,
            minFontSize: 8
        });
        this.contentElements.push(introText);

        // Linha divisoria sutil abaixo da introducao
        const headerSeparator = scene.add.line(
            panelX,
            194,
            0,
            0,
            364,
            0,
            0x8c7355,
            0.35
        ).setDepth(203);
        this.contentElements.push(headerSeparator);

        // Lista das 4 doencas rastreadas (distribuicao uniforme em linhas de 39px)
        const startY = 196;
        const rowHeight = 39;

        info.diseases.forEach((item, index) => {
            const rowY = startY + index * rowHeight;

            const bullet = scene.add.text(84, rowY + 3, '•', createTextStyle({
                fontFamily: 'monospace',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#8B2E40'
            })).setOrigin(0.5, 0).setDepth(203);
            this.contentElements.push(bullet);

            const diseaseName = scene.add.text(96, rowY + 3, item.name, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#8B2E40',
                wordWrap: { width: 342, useAdvancedWrap: true }
            })).setOrigin(0, 0).setDepth(203);
            fitTextToBox(diseaseName, {
                maxWidth: 342,
                maxHeight: 15,
                maxFontSize: 12,
                minFontSize: 9
            });
            this.contentElements.push(diseaseName);

            const diseaseDesc = scene.add.text(96, rowY + 18, item.description, createTextStyle({
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#3b2a20',
                wordWrap: { width: 342, useAdvancedWrap: true }
            })).setOrigin(0, 0).setDepth(203);
            fitTextToBox(diseaseDesc, {
                maxWidth: 342,
                maxHeight: 20,
                maxFontSize: 11,
                minFontSize: 8
            });
            this.contentElements.push(diseaseDesc);

            if (index < info.diseases.length - 1) {
                const separator = scene.add.line(
                    panelX,
                    rowY + rowHeight,
                    0,
                    0,
                    364,
                    0,
                    0x8c7355,
                    0.25
                ).setDepth(203);
                this.contentElements.push(separator);
            }
        });

        // Caixa de alerta / rodape com miniaturas das bolsas contaminadas (selo de perigo)
        const footerY = 390;
        const footerBg = scene.add.rectangle(panelX, footerY, 366, 58, 0x8B2E40, 0.12);
        footerBg.setStrokeStyle(1, 0x8B2E40, 0.5);
        footerBg.setDepth(203);
        this.contentElements.push(footerBg);

        ['bolsa-C+', 'bolsa-C-'].forEach((bagKey, idx) => {
            if (!scene.textures?.exists?.(bagKey)) return;
            const bag = scene.add.image(96 + idx * 32, footerY, bagKey);
            bag.setOrigin(BAG_ORIGIN.x, BAG_ORIGIN.y);
            bag.setScale(0.95);
            if (bag.texture) {
                bag.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
            bag.setDepth(203);
            this.contentElements.push(bag);
        });

        const footerText = scene.add.text(150, footerY, info.footerNotice, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#8B2E40',
            align: 'left',
            lineSpacing: 2,
            wordWrap: { width: 284, useAdvancedWrap: true }
        })).setOrigin(0, 0.5).setDepth(203);
        fitTextToBox(footerText, {
            maxWidth: 284,
            maxHeight: 50,
            maxFontSize: 10,
            minFontSize: 8
        });
        this.contentElements.push(footerText);
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
