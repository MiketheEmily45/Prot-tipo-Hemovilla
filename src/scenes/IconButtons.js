import { openCharacterDescription } from './CharacterDescriptionPanel.js';
import { characterData } from './characterData.js';
import { allCity1Characters } from './CityCharacters.js';

export class CityNavigationButtons {
    constructor(scene, pauseButton, onNavigate) {
        this.scene = scene;
        this.pauseButton = pauseButton;
        this.onNavigate = onNavigate;
    }

    create() {
        const createArrow = (key, direction, x) => {
            const button = this.scene.add.image(x, this.pauseButton.y, key).setOrigin(0).setDepth(100);
            button.setInteractive({ useHandCursor: true });
            button.on('pointerdown', () => button.setTint(0x8B2E40));
            button.on('pointerout', () => button.clearTint());
            button.on('pointerup', () => {
                button.clearTint();
                this.onNavigate(direction);
            });
            return button;
        };

        const x = this.pauseButton.x + this.pauseButton.displayWidth + 8;
        const previous = createArrow('city-previous', -1, x);
        const next = createArrow('city-next', 1, x + previous.displayWidth + 8);
        return { previous, next };
    }
}

export class CharacterIconButtonBar {
    constructor(scene, ids = allCity1Characters.map(({ id }) => id)) {
        this.scene = scene;
        this.ids = ids;
    }

    create() {
        const iconY = 560;
        const iconSpacing = 80;
        const centerX = 256;
        const ids = this.ids;
        const icons = ids.map((id, index) => ({
            id, key: `${id}-icon`, x: centerX + (index - (ids.length - 1) / 2) * iconSpacing
        }));

        this.scene.characterIconButtons = {};

        icons.forEach(({ id, key, x }) => {
            const iconButton = this.scene.add.image(x, iconY, key);
            iconButton.setOrigin(0.5);
            iconButton.setDepth(100);
            iconButton.setInteractive({ useHandCursor: true });
            this.scene.characterIconButtons[id] = iconButton;

            iconButton.on('pointerdown', () => {
                iconButton.setTint(0x8B2E40);
            });

            iconButton.on('pointerup', () => {
                this.updateTint(id);
                // O mesmo icone alterna a descricao; outro icone troca o personagem.
                // Consultar a descricao nao altera movimento, balao ou alerta do personagem.
                openCharacterDescription(this.scene, id, characterData);
            });

            iconButton.on('pointerout', () => {
                this.updateTint(id);
            });
        });

        return this.scene.characterIconButtons;
    }

    updateTint(id) {
        updateIconButtonTint(this.scene, id);
    }
}

// ========== Funções de compatibilidade ==========

export function createCityNavigationButtons(scene, pauseButton, onNavigate) {
    return new CityNavigationButtons(scene, pauseButton, onNavigate).create();
}

export function createCharacterIconButtons(scene, ids = allCity1Characters.map(({ id }) => id)) {
    return new CharacterIconButtonBar(scene, ids).create();
}

export function updateIconButtonTint(scene, iconButtonKey) {
    const iconButton = scene.characterIconButtons && scene.characterIconButtons[iconButtonKey];

    if (!iconButton) {
        return;
    }

    if (scene.alertedIconKeys && scene.alertedIconKeys.has(iconButtonKey)) {
        iconButton.setTint(0xff5555);
        return;
    }

    iconButton.clearTint();
}
