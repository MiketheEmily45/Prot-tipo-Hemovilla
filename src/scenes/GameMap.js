import {
    preloadCityCharacters,
    rememberCityCharacters,
    city1Characters,
    createHorizontalCityCharacter,
    preloadJoaquim,
    createJoaquimAnimations
} from './CityCharacters.js';
import { closeCharacterDescription } from './CharacterDescriptionPanel.js';
import { updateHorizontalWalker, startMove, startPause, stopJoaquimForInteraction, resumeJoaquimFromInteraction } from './CharacterMovement.js';
import { registerClickableCharacter, updateCharacterIndicators, triggerAllCharactersAlert } from './ClickableCharacterManager.js';
import { createCharacterIconButtons } from './IconButtons.js';
import { CityNavigation, preloadCities } from './CityNavigation.js';

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

        // Botao fixo no canto superior esquerdo para voltar ao menu inicial.
        const pauseButton = this.add.image(8, 8, 'pause-button');
        pauseButton.setOrigin(0);
        pauseButton.setDepth(100);
        pauseButton.setInteractive({ useHandCursor: true });
        pauseButton.on('pointerdown', () => {
            // Usa o mesmo escurecimento do botao Iniciar enquanto o clique esta pressionado.
            pauseButton.setTint(0x8B2E40);
        });
        pauseButton.on('pointerup', () => {
            pauseButton.clearTint();
            closeCharacterDescription(this);
            this.scene.start('Start');
        });

        this.cityNavigation.createButtons(pauseButton);

        // Botao de alerta localizado no canto inferior esquerdo da tela.
        // Este botao ativa o alerta de todos os personagens quando pressionado.
        const alertButton = this.add.image(8, 600, 'alert-button');
        this.alertButton = alertButton;
        alertButton.setOrigin(0, 1);
        alertButton.setDepth(100);
        alertButton.setInteractive({ useHandCursor: true });
        alertButton.on('pointerdown', () => {
            // Aplica escurecimento visual enquanto o botao esta sendo pressionado.
            alertButton.setTint(0x8B2E40);
        });
        alertButton.on('pointerup', () => {
            alertButton.clearTint();
            // Chama a funcao que ativa o alerta de todos os personagens do mapa.
            triggerAllCharactersAlert(this);
        });

        this.cursors = this.input.keyboard.createCursorKeys();

        createJoaquimAnimations(this);

        this.joaquim = this.physics.add.sprite(120, 480, 'joaquim-idle-right');
        this.joaquim.setCollideWorldBounds(true);

        this.isMoving = false;
        this.lastDirection = 'down';
        this.idleTextures = {
            up: 'joaquim-idle-left',
            down: 'joaquim-idle-right',
            left: 'joaquim-idle-left',
            right: 'joaquim-idle-right'
        };

        this.playerSpeed = 30;
        this.verticalDistance = 120;
        this.pauseTime = 700;
        this.isPaused = false;
        this.currentDirection = 'up';
        this.moveStartY = this.joaquim.y;
        this.nextDirectionChange = this.time.now + this.pauseTime;
        this.remainingPauseTime = this.pauseTime;

        startMove(this);

        this.clickableCharacters = [];
        registerClickableCharacter(this, {
            sprite: this.joaquim,
            // O Seu Joaquim recebe o balao acima da cabeca.
            balloonOffset: { x: 0, y: -55 },
            alertInterval: 60000,
            iconButtonKey: 'joaquim',
            stop: () => stopJoaquimForInteraction(this),
            resume: () => resumeJoaquimFromInteraction(this)
        });

        this.horizontalNPCs = [];
        city1Characters.forEach((config) => {
            createHorizontalCityCharacter(this, config);
        });
        rememberCityCharacters(this, 0);
    }

    update(time) {
        // As cidades sem personagens nao atualizam movimento nem geram alertas.
        if (this.currentCityIndex !== 0) {
            updateCharacterIndicators(this, time);
            this.horizontalNPCs.forEach((walker) => updateHorizontalWalker(walker));
            return;
        }

        const joaquimInteraction = this.clickableCharacters && this.clickableCharacters[0];
        updateCharacterIndicators(this, time);

        if (joaquimInteraction && joaquimInteraction.isStoppedByClick) {
            this.joaquim.setVelocity(0, 0);

            if (this.horizontalNPCs) {
                this.horizontalNPCs.forEach((walker) => updateHorizontalWalker(walker));
            }

            return;
        }

        if (this.isPaused && time >= this.nextDirectionChange) {
            this.currentDirection = this.currentDirection === 'up' ? 'down' : 'up';
            startMove(this);
        }

        const body = this.joaquim.body;
        if (!this.isPaused && body && (body.blocked.up || body.blocked.down)) {
            startPause(this);
            return;
        }

        if (!this.isPaused && Math.abs(this.joaquim.y - this.moveStartY) >= this.verticalDistance) {
            startPause(this);
            return;
        }

        this.isMoving = !this.isPaused;

        if (this.horizontalNPCs) {
            this.horizontalNPCs.forEach((walker) => updateHorizontalWalker(walker));
        }
    }

}
