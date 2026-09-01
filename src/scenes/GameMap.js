import { createCharacterAnimations } from './characterAnimations.js';
import { createHorizontalWalker, updateHorizontalWalker, stopHorizontalWalkerForInteraction, resumeHorizontalWalkerFromInteraction, startMove, startPause, stopJoaquimForInteraction, resumeJoaquimFromInteraction } from './CharacterMovement.js';
import { registerClickableCharacter, updateCharacterIndicators, triggerAllCharactersAlert } from './ClickableCharacterManager.js';
import { createCharacterIconButtons } from './IconButtons.js';

export class GameMap extends Phaser.Scene {

    constructor() {
        super('GameMap');
    }

    preload() {
        //Fundo do Mapa
        this.load.image('map1', 'assets/Mapas/Cidade1/BaseCidade1.png');
        this.load.image('map2', 'assets/Mapas/Cidade1/ComplementosCidade1.png');
        this.load.image('mapcolision1', 'assets/Mapas/Cidade1/ConstrucoesPrincipaisCidade1.png');
        this.load.image('mapcolision2', 'assets/Mapas/Cidade1/ConstrucoesSecundariasCidade1.png');
        this.load.image('pause-button', 'assets/Telas/Botoes/botao_pausa.png');
        this.load.image('joaquim-icon', 'assets/Personagens/SeuJoaquim/SeuJoaquim.Icone.png');
        this.load.image('marlene-icon', 'assets/Personagens/DonaMarlene/DonaMarlene.Icone.png');
        this.load.image('aparecida-icon', 'assets/Personagens/DonaAparecida/DonaAparecida.Icone.png');
        // Moldura usada como painel da descricao dos personagens.
        this.load.image('character-frame', 'assets/Personagens/moldura_personagens.png');
        // Seu Joaquim
        this.load.image('SJPD', 'assets/Personagens/SeuJoaquim/SeuJoaquim.ParadoDireita.png');
        this.load.image('SJPE', 'assets/Personagens/SeuJoaquim/SeuJoaquim.ParadoEsquerda.png');
        this.load.image('SJAD1', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarDireita1.png');
        this.load.image('SJAE1', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarEsquerda1.png');
        this.load.image('SJAD2', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarDireita2.png');
        this.load.image('SJAE2', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarEsquerda2.png');
        //Dona Marlene
        this.load.image('DMPD', 'assets/Personagens/DonaMarlene/DonaMarlene.ParadaDireita.png');
        this.load.image('DMPE', 'assets/Personagens/DonaMarlene/DonaMarlene.ParadaEsquerda.png');
        this.load.image('DMAD1', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarDireita1.png');
        this.load.image('DMAE1', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarEsquerda1.png');
        this.load.image('DMAD2', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarDireita2.png');
        this.load.image('DMAE2', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarEsquerda2.png');
        //Dona Aparecida
        this.load.image('DAPD', 'assets/Personagens/DonaAparecida/DonaAparecida.PosiçãoParadaDireita.png');
        this.load.image('DAPE', 'assets/Personagens/DonaAparecida/DonaAparecida.PosiçãoParadaEsquerda.png');
        this.load.image('DAAD1', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarDireita1.png');
        this.load.image('DAAE1', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarEsquerda1.png');
        this.load.image('DAAD2', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarDireita2.png');
        this.load.image('DAAE2', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarEsquerda2.png');
        // Balao temporario exibido quando um personagem clicavel esta parado.
        this.load.image('balao_temporario', 'assets/Personagens/balao_temporario.png');
        this.load.image('icone_alerta', 'assets/Personagens/icone_alerta.png');
        // Botao de alerta localizado no canto inferior esquerdo da tela.
        this.load.image('alert-button', 'assets/Telas/Botoes/botao_alerta.png');
    }

    create() {
        this.scale.resize(512, 608);
        this.cameras.main.setViewport(0, 0, 512, 608);
        this.physics.world.setBounds(0, 0, 512, 512);

        this.background1 = this.add.tileSprite(256, 256, 512, 512, 'map1');
        this.background2 = this.add.tileSprite(256, 256, 512, 512, 'map2');
        this.background3 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision1');
        this.background4 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision2');

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
            this.scene.start('Start');
        });

        // Botao de alerta localizado no canto inferior esquerdo da tela.
        // Este botao ativa o alerta de todos os personagens quando pressionado.
        const alertButton = this.add.image(8, 600, 'alert-button');
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

        this.joaquim = this.physics.add.sprite(120, 480, 'SJPD');
        this.joaquim.setCollideWorldBounds(true);

        createCharacterAnimations(this);

        this.isMoving = false;
        this.lastDirection = 'down';
        this.idleTextures = {
            up: 'SJPE',
            down: 'SJPD',
            left: 'SJPE',
            right: 'SJPD'
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

        this.horizontalNPCs = [
            createHorizontalWalker(this, {
                sprite: this.physics.add.sprite(280, 290, 'DMPE'),
                name: 'marlene',
                minX: 280,
                maxX: 480,
                speed: 25,
                direction: 'left',
                walkLeftAnim: 'walk_marlene_left',
                walkRightAnim: 'walk_marlene_right',
                idleLeft: 'DMPE',
                idleRight: 'DMPD'
            }),
            createHorizontalWalker(this, {
                sprite: this.physics.add.sprite(300, 100, 'DAPE'),
                name: 'aparecida',
                minX: 300,
                maxX: 480,
                speed: 20,
                direction: 'right',
                walkLeftAnim: 'walk_aparecida_left',
                walkRightAnim: 'walk_aparecida_right',
                idleLeft: 'DAPE',
                idleRight: 'DAPD'
            })
        ];

        registerClickableCharacter(this, {
            sprite: this.horizontalNPCs[0].sprite,
            // A Dona Marlene recebe o balao a esquerda.
            balloonOffset: { x: -55, y: -15 },
            alertInterval: 120000,
            iconButtonKey: 'marlene',
            stop: () => stopHorizontalWalkerForInteraction(this.horizontalNPCs[0]),
            resume: () => resumeHorizontalWalkerFromInteraction(this, this.horizontalNPCs[0])
        });

        registerClickableCharacter(this, {
            sprite: this.horizontalNPCs[1].sprite,
            // A Dona Aparecida recebe o balao a esquerda.
            balloonOffset: { x: -55, y: -15 },
            alertInterval: 240000,
            iconButtonKey: 'aparecida',
            stop: () => stopHorizontalWalkerForInteraction(this.horizontalNPCs[1]),
            resume: () => resumeHorizontalWalkerFromInteraction(this, this.horizontalNPCs[1])
        });
    }

    update(time) {
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

