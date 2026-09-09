import { switchCityCharacters } from './CityCharacters.js';
import { createCityNavigationButtons } from './IconButtons.js';
import { closeCharacterDescription } from './CharacterDescriptionPanel.js';

// A ordem das camadas segue a composicao original da Cidade1.
export const cities = [
    { folder: 'Cidade1', layers: ['BaseCidade1', 'ComplementosCidade1', 'ConstrucoesPrincipaisCidade1', 'ConstrucoesSecundariasCidade1'] },
    { folder: 'Cidade 2', layers: ['BaseCidade2', 'ComplementosCidade2', 'ConstrucoesPrincipaisCidade2', 'ConstrucoesSecundariasCidade2'] },
    { folder: 'Cidade 3', layers: ['BaseCidade3', 'ComplementosCidade3', 'ConstruçõesPrincipaisCidade3'] }
];

const layerKey = (city, layer) => `city-${city}-layer-${layer}`;

export function preloadCities(scene) {
    cities.forEach((city, cityIndex) => city.layers.forEach((file, layerIndex) => {
        scene.load.image(layerKey(cityIndex, layerIndex), `assets/Mapas/${city.folder}/${file}.png`);
    }));
    scene.load.image('city-previous', 'assets/Telas/Botoes/cidade_anterior.png');
    scene.load.image('city-next', 'assets/Telas/Botoes/cidade_posterior.png');
}

export class CityNavigation {
    constructor(scene) {
        this.scene = scene;
        scene.currentCityIndex = 0;
        this.layers = cities[0].layers.map((_, index) =>
            scene.add.tileSprite(256, 256, 512, 512, layerKey(0, index)));
    }

    createButtons(pauseButton) {
        this.buttons = createCityNavigationButtons(this.scene, pauseButton, (direction) => {
            this.goTo(this.scene.currentCityIndex + direction);
        });
        this.updateButtons();
    }

    goTo(index) {
        const scene = this.scene;
        if (!Number.isInteger(index) || index < 0 || index >= cities.length || index === scene.currentCityIndex) return;

        closeCharacterDescription(scene);
        switchCityCharacters(scene, index);
        scene.currentCityIndex = index;
        this.layers.forEach((layer, layerIndex) => {
            const visible = layerIndex < cities[index].layers.length;
            layer.setVisible(visible);
            if (visible) layer.setTexture(layerKey(index, layerIndex));
        });

        this.updateButtons();
    }

    updateButtons() {
        // Mantem o espaco reservado para cada seta nos extremos da navegacao.
        this.buttons.previous.setVisible(this.scene.currentCityIndex > 0);
        this.buttons.previous.input.enabled = this.scene.currentCityIndex > 0;
        this.buttons.next.setVisible(this.scene.currentCityIndex < cities.length - 1);
        this.buttons.next.input.enabled = this.scene.currentCityIndex < cities.length - 1;
    }
}
