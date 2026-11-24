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
import { preloadAudio, playSceneMusic } from './AudioManager.js';
import { TutorialManager, MAP_CAPTION_BOTTOM_Y } from './TutorialManager.js';
import { TutorialCaption } from './TutorialCaption.js';
import {
    CITY_2_UNLOCKED_NOTICE_TEXT,
    QUIZ_NEW_TYPES_NOTICE_TEXT,
    markCity2UnlockedNoticeSeen,
    markQuizCityNoticeSeen,
    shouldShowCity2UnlockedNotice,
    shouldShowQuizCityNotice
} from './mapNotices.js';
import { PauseMenu, preloadPauseMenu } from './PauseMenu.js';
import { QuizPanel } from './QuizPanel.js';

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
        preloadPauseMenu(this);
        this.load.image('city-select-button', 'assets/Telas/Botoes/escolher_cidade.png');
        this.load.image('shop-hud-button', 'assets/Telas/Loja/btn_loja_hud.png');
        // Moldura usada como painel da descricao dos personagens.
        this.load.image('character-frame', 'assets/Personagens/moldura_personagens.png');
        // Balao temporario exibido quando um personagem clicavel esta parado.
        this.load.image('balao_temporario', 'assets/Personagens/balao_temporario.png');
        this.load.image('icone_alerta', 'assets/Personagens/icone_alerta.png');
        this.load.image('botao_minigame', 'assets/Telas/Botoes/botao_minigame.png');
        this.load.image('botao_descricao', 'assets/Telas/Botoes/botao_descricao.png');
        preloadAudio(this);
        // Botao de alerta localizado no canto inferior esquerdo da tela.
        this.load.image('alert-button', 'assets/Telas/Botoes/botao_alerta.png');
        // Icone do saldo de ATP
        this.load.image('icone-atp', 'assets/Minigame/Cenario/IconeATP.png');
    }

    create() {
        playSceneMusic(this, 'GameMap');
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
        this.pauseMenu = new PauseMenu(this, { mode: 'city' });
        this.quizPanel = new QuizPanel(this);

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

        // Tutorial: introducao e ocorrencia inicial do Seu Joaquim (se ainda pendentes).
        this.tutorialManager = new TutorialManager(this, { bottomY: MAP_CAPTION_BOTTOM_Y });
        this.noticeCaption = new TutorialCaption(this, { bottomY: MAP_CAPTION_BOTTOM_Y, depth: 1010 });
        this.events?.once?.('shutdown', () => this.noticeCaption?.destroy());
        this.tutorialManager.startMap();
        this.checkPendingMapNotices();
        this.mapControls?.updateQuizButtonState?.();
    }

    checkPendingMapNotices() {
        if (!this.noticeCaption || this.noticeCaption.isOpen || this.tutorialManager?.caption?.isOpen) {
            return;
        }

        const steps = [];
        const cityIndex = this.currentCityIndex ?? 0;

        if (shouldShowCity2UnlockedNotice()) {
            markCity2UnlockedNoticeSeen();
            steps.push({ id: 'N-CITY2', text: CITY_2_UNLOCKED_NOTICE_TEXT });
        }

        if (shouldShowQuizCityNotice(cityIndex)) {
            markQuizCityNoticeSeen(cityIndex);
            steps.push({ id: 'N-QUIZ', text: QUIZ_NEW_TYPES_NOTICE_TEXT });
        }

        if (steps.length > 0) {
            this.noticeCaption.show(steps, {
                blocking: true,
                dismissOnLastPage: true,
                showSkipButton: false
            });
        }
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
        if (this.pauseMenu?.isOpen) {
            return;
        }

        this.mapControls?.updateQuizButtonState?.();

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
