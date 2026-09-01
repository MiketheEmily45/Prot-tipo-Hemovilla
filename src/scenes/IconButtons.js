// Cria e gerencia os botoes de icone dos personagens na parte inferior da tela.
import { openCharacterDescription } from './CharacterDescriptionPanel.js';
import { characterData } from './characterData.js';

export function createCharacterIconButtons(scene) {
    const iconY = 560;
    const iconSpacing = 80;
    const centerX = 256;
    const icons = [
        { id: 'joaquim', key: 'joaquim-icon', x: centerX - iconSpacing },
        { id: 'marlene', key: 'marlene-icon', x: centerX },
        { id: 'aparecida', key: 'aparecida-icon', x: centerX + iconSpacing }
    ];

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
