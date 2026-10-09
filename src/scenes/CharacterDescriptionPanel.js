// Gerencia o painel de descricao de personagens com overlay, moldura, 
// texto com scroll/mascara e botao de fechar.

export const DESCRIPTION_PANEL_CONFIG = {
    panelWidth: 448,
    panelHeight: 448,
    panelX: 256,
    contentWidth: 390,
    fontSize: 18,
    titleFontSize: 22,
    lineSpacing: 2
};

export class CharacterDescriptionPanel {
    constructor(scene, characterData = {}) {
        this.scene = scene;
        this.characterData = characterData;
    }

    open(characterId) {
        const scene = this.scene;
        const characterData = this.characterData;
        const data = characterData[characterId];

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

        // Todas as cidades exibem o tipo, mesmo enquanto o roteiro nao o definiu.
        const content = [
            `Tipo sanguíneo: ${data.tipoSanguineo ?? 'A definir'}`,
            data.descricao,
            ...(data.condicao ? [`Condição: ${data.condicao}`] : [])
        ].join('\n\n');

        const {
            panelWidth,
            panelHeight,
            panelX,
            contentWidth,
            fontSize,
            titleFontSize,
            lineSpacing
        } = DESCRIPTION_PANEL_CONFIG;

        // Escurece somente o mapa para manter a faixa de icones clicavel.
        const overlay = scene.add.rectangle(256, 256, 512, 512, 0x000000, 0.68);
        overlay.setDepth(200);
        overlay.setInteractive({ useHandCursor: true });
        overlay.on('pointerdown', () => this.close());

        let descriptionX = panelX;

        const title = scene.add.text(panelX, 0, data.nome, {
            fontFamily: 'monospace',
            fontSize: `${titleFontSize}px`,
            fontStyle: 'bold',
            color: '#3b2a20'
        }).setOrigin(0.5, 0);

        const description = scene.add.text(panelX, 0, content, {
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            color: '#3b2a20',
            lineSpacing: lineSpacing,
            wordWrap: { width: contentWidth, useAdvancedWrap: true }
        }).setOrigin(0.5, 0);

        if (scene.currentCityIndex === 1 || scene.currentCityIndex === 2) {
            // Fixa a margem esquerda usando Bruno na Cidade2 e Yasmin na
            // Cidade3. Textos mais curtos, como o de Caue, nao ficam deslocados.
            const alignmentReference = scene.currentCityIndex === 1
                ? characterData.bruno : characterData.yasmin;
            if (alignmentReference) {
                description.setText([
                    `Tipo sanguíneo: ${alignmentReference.tipoSanguineo ?? 'A definir'}`,
                    alignmentReference.descricao,
                    ...(alignmentReference.condicao ? [`Condição: ${alignmentReference.condicao}`] : [])
                ].join('\n\n'));
                descriptionX = panelX - description.width / 2;
                description.setOrigin(0, 0);
                description.setText(content);
            }
        }

        // O painel fica 20 pixels acima do centro vertical da tela.
        const panelTop = 284 - panelHeight / 2;
        const panelY = panelTop + panelHeight / 2;
        const frame = scene.add.image(panelX, panelY, 'character-frame');
        frame.setDisplaySize(panelWidth, panelHeight);
        frame.setDepth(201);

        const panelBlocker = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xffffff, 0);
        panelBlocker.setDepth(202);
        panelBlocker.setInteractive();
        panelBlocker.on('pointerdown', (_pointer, _localX, _localY, event) => event.stopPropagation());

        title.setPosition(panelX, panelTop + 34);
        title.setDepth(203);
        const descriptionTop = panelTop + 70 + title.height;
        const descriptionBottom = panelTop + panelHeight - 20;
        const descriptionViewportHeight = descriptionBottom - descriptionTop;
        // A mascara impede que o texto ultrapasse a area interna da moldura.
        const descriptionMask = scene.make.graphics({ add: false });
        descriptionMask.fillStyle(0xffffff);
        descriptionMask.fillRect(
            panelX - contentWidth / 2,
            descriptionTop,
            contentWidth,
            descriptionViewportHeight
        );
        description.setPosition(descriptionX, descriptionTop);
        description.setMask(descriptionMask.createGeometryMask());
        description.setDepth(203);

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
            description.y = descriptionTop - descriptionScrollY;
        };
        scene.input.on('wheel', onDescriptionWheel);

        const closeButton = scene.add.text(panelX + panelWidth / 2 - 28, panelTop + 14, 'X', {
            fontFamily: 'monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#afadab'
        }).setOrigin(0.5);
        closeButton.setDepth(204);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event.stopPropagation();
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
