// Cria e gerencia os botoes de icone dos personagens na parte inferior da tela.
import { openCharacterDescription } from './CharacterDescriptionPanel.js';
import { characterData } from './characterData.js';

// Usa os assets do artista e o mesmo feedback de clique dos demais icones.
export function createCityNavigationButtons(scene, pauseButton, onNavigate) {
    const createArrow = (key, direction, x) => {
        const button = scene.add.image(x, pauseButton.y, key).setOrigin(0).setDepth(100);
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => button.setTint(0x8B2E40));
        button.on('pointerout', () => button.clearTint());
        button.on('pointerup', () => {
            button.clearTint();
            onNavigate(direction);
        });
        return button;
    };
    const x = pauseButton.x + pauseButton.displayWidth + 8;
    const previous = createArrow('city-previous', -1, x);
    const next = createArrow('city-next', 1, x + previous.displayWidth + 8);
    return { previous, next };
}

export function createCharacterIconButtons(scene, ids = ['joaquim', 'marlene', 'aparecida']) {
    const iconY = 560;
    const iconSpacing = 80;
    const centerX = 256;
    const icons = ids.map((id, index) => ({
        id, key: `${id}-icon`, x: centerX + (index - (ids.length - 1) / 2) * iconSpacing
    }));

    scene.characterIconButtons = {};

    icons.forEach(({ id, key, x }) => {
        const iconButton = scene.add.image(x, iconY, key);
        iconButton.setOrigin(0.5);
        iconButton.setDepth(100);
        iconButton.setInteractive({ useHandCursor: true });
        scene.characterIconButtons[id] = iconButton;

        iconButton.on('pointerdown', () => {
            iconButton.setTint(0x8B2E40);
        });

        iconButton.on('pointerup', () => {
            updateIconButtonTint(scene, id);
            // O mesmo icone alterna a descricao; outro icone troca o personagem.
            // Consultar a descricao nao altera movimento, balao ou alerta do personagem.
            openCharacterDescription(scene, id, characterData);
        });

        iconButton.on('pointerout', () => {
            updateIconButtonTint(scene, id);
        });
    });
}

export function updateIconButtonTint(scene, iconButtonKey) {
    const iconButton = scene.characterIconButtons && scene.characterIconButtons[iconButtonKey];

    if (!iconButton) {
        return;
    }

    if (scene.alertedIconKeys.has(iconButtonKey)) {
        iconButton.setTint(0xff5555);
        return;
    }

    iconButton.clearTint();
}
