import { switchCityCharacters } from './CityCharacters.js';
import { closeCharacterDescription } from './CharacterDescriptionPanel.js';
import { createTextStyle } from './textUtils.js';
import { isCityUnlocked, getCityLockMessage } from './cityUnlocks.js';

// A ordem das camadas segue a composicao original da Cidade 1.
export const cities = [
    { folder: 'Cidade 1', layers: ['BaseCidade1', 'ComplementosCidade1', 'ConstrucoesPrincipaisCidade1', 'ConstrucoesSecundariasCidade1'] },
    { folder: 'Cidade 2', layers: ['BaseCidade2', 'ComplementosCidade2', 'ConstrucoesPrincipaisCidade2', 'ConstrucoesSecundariasCidade2'] },
    { folder: 'Cidade 3', layers: ['BaseCidade3', 'ComplementosCidade3', 'ConstrucoesPrincipaisCidade3'] }
];

export const layerKey = (city, layer) => `city-${city}-layer-${layer}`;

export function preloadCities(scene) {
    CityNavigation.preload(scene);
}

export class CityNavigation {
    static cities = cities;

    static preload(scene) {
        cities.forEach((city, cityIndex) => city.layers.forEach((file, layerIndex) => {
            scene.load.image(layerKey(cityIndex, layerIndex), `assets/Mapas/${city.folder}/${file}.png`);
        }));
        scene.load.image('city-previous', 'assets/Telas/Botoes/cidade_anterior.png');
        scene.load.image('city-next', 'assets/Telas/Botoes/cidade_posterior.png');
    }

    constructor(scene) {
        this.scene = scene;
        scene.currentCityIndex = 0;
        this.layers = cities[0].layers.map((_, index) =>
            scene.add.tileSprite(256, 256, 512, 512, layerKey(0, index)));
        this.lockNoticeElements = [];
        this.lockNoticeTimer = null;
        this.buttons = null;
    }

    get currentCityIndex() {
        return this.scene.currentCityIndex;
    }

    get totalCities() {
        return cities.length;
    }

    goTo(index) {
        const scene = this.scene;
        if (!Number.isInteger(index) || index < 0 || index >= cities.length || index === scene.currentCityIndex) return;

        if (!isCityUnlocked(index)) {
            const message = getCityLockMessage(index);
            if (message) {
                this.showLockNotice(message);
            }
            return;
        }

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

    showLockNotice(message) {
        const scene = this.scene;
        if (!scene || !scene.add) return;

        this.clearLockNotice();

        const x = 256;
        const y = 50;

        const text = scene.add.text(x, y, message, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff'
        })).setOrigin(0.5).setDepth(201);

        const padX = 24;
        const padY = 10;
        const width = Math.round(text.width + padX);
        const height = Math.round(text.height + padY);

        const bg = scene.add.rectangle(x, y, width, height, 0x2c1e18, 0.92);
        bg.setStrokeStyle(1, 0x8B2E40);
        bg.setDepth(200);

        this.lockNoticeElements = [bg, text];

        this.lockNoticeTimer = scene.time.delayedCall(2400, () => {
            this.clearLockNotice();
        });
    }

    clearLockNotice() {
        if (this.lockNoticeTimer) {
            this.lockNoticeTimer.remove();
            this.lockNoticeTimer = null;
        }
        this.lockNoticeElements.forEach((el) => {
            if (el && typeof el.destroy === 'function') {
                el.destroy();
            }
        });
        this.lockNoticeElements = [];
    }

    updateButtons() {
        if (!this.buttons) return;
        if (this.buttons.previous) {
            this.buttons.previous.setVisible(this.scene.currentCityIndex > 0);
            if (this.buttons.previous.input) {
                this.buttons.previous.input.enabled = this.scene.currentCityIndex > 0;
            }
        }
        if (this.buttons.next) {
            this.buttons.next.setVisible(this.scene.currentCityIndex < cities.length - 1);
            if (this.buttons.next.input) {
                this.buttons.next.input.enabled = this.scene.currentCityIndex < cities.length - 1;
            }
        }
    }
}
