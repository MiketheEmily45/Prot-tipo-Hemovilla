import {
    preloadCityCharacters,
    rememberCityCharacters,
    allCity1Characters,
    createCityCharacter
} from './CityCharacters.js';
import { ClickableCharacterManager, updateCharacterIndicators } from './ClickableCharacterManager.js';
import { createCharacterIconButtons } from './IconButtons.js';
import { CityNavigation, preloadCities } from './CityNavigation.js';
import { MapControls } from './MapControls.js';
import { AtpDisplay } from './AtpDisplay.js';
import { updateActiveCityTimers, getOccurrence } from './occurrenceState.js';

export class GameMap extends Phaser.Scene {

    constructor() {
        super('GameMap');
    }

    init(data) {
        this.targetCityIndex = data && typeof data.targetCityIndex === 'number'
            ? data.targetCityIndex
            : (data && typeof data.cityIndex === 'number' ? data.cityIndex : 0);
    }

    preload() {
        preloadCities(this);
        preloadCityCharacters(this);
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
        // Icone do saldo de ATP
        this.load.image('icone-atp', 'assets/Minigame/Cenario/IconeATP.png');
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
        this.mapControls.create();

        // Painel de exibicao de saldo de ATP na barra inferior (canto superior direito da barra preta)
        this.atpDisplay = new AtpDisplay(this, { x: 504, y: 520, width: 84, height: 24 });
        this.events.on('wake', () => this.atpDisplay?.update());
        this.events.on('resume', () => this.atpDisplay?.update());

        this.cursors = this.input.keyboard.createCursorKeys();

        this.clickableCharacters = [];
        this.clickableCharacterManager = new ClickableCharacterManager(this);
        this.npcs = [];

        allCity1Characters.forEach((config) => {
            createCityCharacter(this, config);
        });
        rememberCityCharacters(this, 0);

        if (this.targetCityIndex && this.targetCityIndex > 0) {
            this.cityNavigation.goTo(this.targetCityIndex);
        }

        this.syncActiveCityAlerts(true);
    }

    syncActiveCityAlerts(silent = true) {
        if (!this.clickableCharacters) return;
        this.clickableCharacters.forEach((char) => {
            const occ = getOccurrence(char.iconButtonKey);
            if (occ && occ.hasAlert) {
                this.clickableCharacterManager?.getAlertManager().applyAlert(char, silent);
            } else if (occ && !occ.hasAlert) {
                this.clickableCharacterManager?.getAlertManager().removeAlert(char);
            }
        });
    }

    update(time, delta) {
        if (typeof delta === 'number' && delta > 0) {
            const newlyAlerted = updateActiveCityTimers(this.currentCityIndex ?? 0, delta);
            if (newlyAlerted && newlyAlerted.length > 0) {
                newlyAlerted.forEach((occ) => {
                    const char = this.clickableCharacters?.find((c) => c.iconButtonKey === occ.id);
                    if (char) {
                        this.clickableCharacterManager?.getAlertManager().applyAlert(char, false);
                    }
                });
            }
        }

        updateCharacterIndicators(this, time);

        if (this.npcs) {
            this.npcs.forEach((npc) => npc.update(time));
        }
    }

}
