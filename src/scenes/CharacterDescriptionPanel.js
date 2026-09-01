// Gerencia a mini-tela de descricao de personagens com overlay, moldura, 
// texto com scroll/mascara e botao de fechar.
// O estado do painel (scene.characterOverlay) continua vivendo na scene.

export function openCharacterDescription(scene, characterId, characterData) {
    const data = characterData[characterId];

    if (!data) {
        return;
    }

    if (scene.characterOverlay) {
        // Clicar no personagem atual fecha o painel. Clicar em outro
        // remove o painel anterior antes de criar o novo conteudo.
        if (scene.characterOverlay.characterId === characterId) {
            closeCharacterDescription(scene);
            return;
        }

        closeCharacterDescription(scene);
    }

    // Escurece somente o mapa para manter a faixa de icones clicavel.
    const overlay = scene.add.rectangle(256, 256, 512, 512, 0x000000, 0.68);
    overlay.setDepth(200);
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', () => closeCharacterDescription(scene));

    const panelWidth = 448;
    const panelHeight = 448;
    const panelX = 256;
    const contentWidth = 390;
    const fontSizes = [18, 16, 14];
    let description;
    let title;

    // Tenta fontes maiores primeiro; a menor opcao continua legivel e o
    // restante do texto pode ser acessado com a rolagem.
    for (const fontSize of fontSizes) {
        const lineHeight = Math.round(fontSize * 1.25);
        const candidate = scene.add.text(panelX, 0, data.descricao, {
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            color: '#3b2a20',
            lineSpacing: 2,
            wordWrap: { width: contentWidth, useAdvancedWrap: true }
        }).setOrigin(0.5, 0);
        const candidateTitle = scene.add.text(panelX, 0, data.nome, {
            fontFamily: 'monospace',
            fontSize: `${fontSize + 4}px`,
            fontStyle: 'bold',
            color: '#3b2a20'
        }).setOrigin(0.5, 0);
        const requiredHeight = 32 + lineHeight + candidateTitle.height + candidate.height;

        if (requiredHeight <= panelHeight - 24 || fontSize === fontSizes[fontSizes.length - 1]) {
            description = candidate;
            title = candidateTitle;
            break;
        }

        candidate.destroy();
        candidateTitle.destroy();
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
    description.setPosition(panelX, descriptionTop);
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
        closeCharacterDescription(scene);
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

export function closeCharacterDescription(scene) {
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
