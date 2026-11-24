// Gerencia o painel de descricao de personagens com overlay, moldura, 
// texto com scroll/mascara e botao de fechar.

import { getDiscoveredType } from './discoveredTypes.js';
import { createTextStyle, fitTextToBox } from './textUtils.js';
import { playSfx } from './AudioManager.js';
import { getCharacterReplacement } from './shopStore.js';
import { getShopCharacterPresentation } from './shopCharacterPresentation.js';

export const DESCRIPTION_PANEL_CONFIG = {
    panelWidth: 448,
    panelHeight: 448,
    panelX: 256,
    contentWidth: 372,
    fontSize: 18,
    minFontSize: 12,
    titleFontSize: 22,
    minTitleFontSize: 14,
    lineSpacing: 2
};

// Acima da legenda do tutorial (1000..1006) e do Joaquim elevado (1020..1023), abaixo de Quiz (1400) e Pause (1500).
const PANEL_BASE_DEPTH = 1100;

export class CharacterDescriptionPanel {
    constructor(scene, characterData = {}) {
        this.scene = scene;
        this.characterData = characterData;
    }

    open(characterId) {
        const scene = this.scene;
        const characterData = this.characterData;
        const baseData = characterData[characterId];
        const replacement = getShopCharacterPresentation(getCharacterReplacement(characterId));
        const data = baseData && replacement
            ? { ...baseData, nome: replacement.name, descricao: replacement.description }
            : baseData;

        if (!data) {
            return;
        }

        if (scene.characterOverlay) {
            // Clicar no personagem atual fecha o painel. Clicar em outro
            // remove o painel anterior antes de criar o novo conteudo.
            if (scene.characterOverlay.characterId === characterId) {
                this.close();
                return;
            }

            this.close();
        }

        // O tipo so aparece depois de descoberto no minigame; antes disso mostra "?".
        const content = [
            `Tipo sanguíneo: ${getDiscoveredType(characterId) ?? '?'}`,
            data.descricao,
            ...(data.condicao ? [`Condição: ${data.condicao}`] : [])
        ].join('\n\n');

        const {
            panelWidth,
            panelHeight,
            panelX,
            contentWidth,
            fontSize,
            minFontSize,
            titleFontSize,
            minTitleFontSize,
            lineSpacing
        } = DESCRIPTION_PANEL_CONFIG;

        // Escurece somente o mapa para manter a faixa de icones clicavel.
        const overlay = scene.add.rectangle(256, 256, 512, 512, 0x000000, 0.68);
        overlay.setDepth(PANEL_BASE_DEPTH);
        overlay.setInteractive({ useHandCursor: true });
        overlay.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            this.close();
        });

        // O painel fica 20 pixels acima do centro vertical da tela.
        const panelTop = 284 - panelHeight / 2;
        const panelY = panelTop + panelHeight / 2;
        const frame = scene.add.image(panelX, panelY, 'character-frame');
        frame.setDisplaySize(panelWidth, panelHeight);
        frame.setDepth(PANEL_BASE_DEPTH + 1);

        const panelBlocker = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xffffff, 0);
        panelBlocker.setDepth(PANEL_BASE_DEPTH + 2);
        panelBlocker.setInteractive();
        panelBlocker.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());

        const title = scene.add.text(panelX, panelTop + 40, data.nome, createTextStyle({
            fontFamily: 'monospace',
            fontSize: `${titleFontSize}px`,
            fontStyle: 'bold',
            color: '#3b2a20',
            align: 'center',
            wordWrap: { width: contentWidth - 36, useAdvancedWrap: true }
        })).setOrigin(0.5, 0);
        fitTextToBox(title, {
            maxWidth: contentWidth - 36,
            maxHeight: 34,
            maxFontSize: titleFontSize,
            minFontSize: minTitleFontSize
        });
        title.setDepth(PANEL_BASE_DEPTH + 3);

        const descriptionX = Math.round(panelX - contentWidth / 2);
        const descriptionTop = Math.round(title.y + title.height + 12);
        const descriptionBottom = panelTop + 406;
        const descriptionViewportHeight = descriptionBottom - descriptionTop;

        const description = scene.add.text(descriptionX, descriptionTop, content, createTextStyle({
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            color: '#3b2a20',
            lineSpacing: lineSpacing,
            wordWrap: { width: contentWidth, useAdvancedWrap: true }
        })).setOrigin(0, 0);
        fitTextToBox(description, {
            maxWidth: contentWidth,
            maxHeight: descriptionViewportHeight,
            maxFontSize: fontSize,
            minFontSize
        });

        // A mascara impede que o texto ultrapasse a area interna da moldura (scroll atua como reserva em 12px).
        const descriptionMask = scene.make.graphics({ add: false });
        descriptionMask.fillStyle(0xffffff);
        descriptionMask.fillRect(
            descriptionX,
            descriptionTop,
            contentWidth,
            descriptionViewportHeight
        );
        description.setMask(descriptionMask.createGeometryMask());
        description.setDepth(PANEL_BASE_DEPTH + 3);

        let descriptionScrollY = 0;
        const maxDescriptionScroll = Math.max(0, description.height - descriptionViewportHeight);

        // Move apenas a descricao quando o cursor estiver sobre sua area.
        const onDescriptionWheel = (pointer, _gameObjects, _deltaX, deltaY) => {
            const isOverDescription = pointer.x >= panelX - contentWidth / 2
                && pointer.x <= panelX + contentWidth / 2
                && pointer.y >= descriptionTop
                && pointer.y <= descriptionBottom;

            if (!isOverDescription || maxDescriptionScroll === 0) {
                return;
            }

            descriptionScrollY = Phaser.Math.Clamp(
                descriptionScrollY + deltaY,
                0,
                maxDescriptionScroll
            );
            description.y = Math.round(descriptionTop - descriptionScrollY);
        };
        scene.input.on('wheel', onDescriptionWheel);

        const closeButton = scene.add.text(panelX + panelWidth / 2 - 28, panelTop + 14, 'X', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#afadab'
        })).setOrigin(0.5);
        closeButton.setDepth(PANEL_BASE_DEPTH + 4);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            playSfx(scene, 'clique');
            this.close();
        });

        scene.characterOverlay = {
            characterId,
            overlay,
            frame,
            panelBlocker,
            title,
            description,
            descriptionMask,
            closeButton,
            onDescriptionWheel
        };
    }

    close() {
        const scene = this.scene;
        if (!scene.characterOverlay) {
            return;
        }

        // Remove o evento de rolagem junto com os objetos para evitar listeners
        // ativos depois que a mini-tela foi fechada.
        scene.input.off('wheel', scene.characterOverlay.onDescriptionWheel);
        Object.entries(scene.characterOverlay).forEach(([key, element]) => {
            if (key !== 'onDescriptionWheel' && key !== 'characterId') {
                element.destroy();
            }
        });
        scene.characterOverlay = null;
    }
}

export function openCharacterDescription(scene, characterId, characterData) {
    if (!scene.descriptionPanel) {
        scene.descriptionPanel = new CharacterDescriptionPanel(scene, characterData);
    } else {
        scene.descriptionPanel.characterData = characterData;
    }
    scene.descriptionPanel.open(characterId);
}

export function closeCharacterDescription(scene) {
    if (scene.descriptionPanel) {
        scene.descriptionPanel.close();
    } else {
        new CharacterDescriptionPanel(scene).close();
    }
}
