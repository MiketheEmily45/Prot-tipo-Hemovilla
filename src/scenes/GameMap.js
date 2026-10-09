import {
    preloadCityCharacters,
    rememberCityCharacters,
    city1Characters,
    joaquimCharacter,
    createCityCharacter,
    preloadJoaquim
} from './CityCharacters.js';
import { ClickableCharacterManager, updateCharacterIndicators } from './ClickableCharacterManager.js';
import { createCharacterIconButtons } from './IconButtons.js';
import { CityNavigation, preloadCities } from './CityNavigation.js';
import { MapControls } from './MapControls.js';

export class GameMap extends Phaser.Scene {

    constructor() {
        super('GameMap');
    }

    preload() {
        preloadCities(this);
        preloadCityCharacters(this);
        preloadJoaquim(this);
        this.load.image('pause-button', 'assets/Telas/Botoes/botao_pausa.png');
        this.load.image('start-button', 'assets/Telas/Botoes/botao_start.png');
        // Moldura usada como painel da descricao dos personagens.
        this.load.image('character-frame', 'assets/Personagens/moldura_personagens.png');
        // Balao temporario exibido quando um personagem clicavel esta parado.
        this.load.image('balao_temporario', 'assets/Personagens/balao_temporario.png');
        this.load.image('icone_alerta', 'assets/Personagens/icone_alerta.png');
        this.load.image('botao_minigame', 'assets/Telas/Botoes/botao_minigame.png');
        this.load.image('botao_descricao', 'assets/Telas/Botoes/botao_descricao.png');
        this.load.audio('alert-sound', 'assets/Musica/som_alerta.mp3');
        this.load.audio('masculine-huh', 'assets/SFX/MasculineHuh.mp3');
        this.load.audio('feminine-huh', 'assets/SFX/FeminineHuh.mp3');
        // Botao de alerta localizado no canto inferior esquerdo da tela.
        this.load.image('alert-button', 'assets/Telas/Botoes/botao_alerta.png');
    }

    create() {
        this.scale.resize(512, 608);
        this.cameras.main.setViewport(0, 0, 512, 608);
        this.physics.world.setBounds(0, 0, 512, 512);

        this.cityNavigation = new CityNavigation(this);
        this.cityCharacterGroups = {};
        this.characterOverlay = null;

        this.alertedIconKeys = new Set();
        createCharacterIconButtons(this);

        this.mapControls = new MapControls(this);
        const { pauseButton } = this.mapControls.create();
        this.cityNavigation.createButtons(pauseButton);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.clickableCharacters = [];
        this.clickableCharacterManager = new ClickableCharacterManager(this);
        this.npcs = [];

        createCityCharacter(this, joaquimCharacter);
        city1Characters.forEach((config) => {
            createCityCharacter(this, config);
        });
        rememberCityCharacters(this, 0);
    }

    update(time) {
        updateCharacterIndicators(this, time);

        if (this.npcs) {
            this.npcs.forEach((npc) => npc.update(time));
        }
    }

}
