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
    }

    create() {
        this.scale.resize(512, 608);
        this.cameras.main.setViewport(0, 0, 512, 608);
        this.physics.world.setBounds(0, 0, 512, 512);

        this.background1 = this.add.tileSprite(256, 256, 512, 512, 'map1');
        this.background2 = this.add.tileSprite(256, 256, 512, 512, 'map2');
        this.background3 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision1');
        this.background4 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision2');

        this.createCharacterIconButtons();

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

        this.cursors = this.input.keyboard.createCursorKeys();

        this.joaquim = this.physics.add.sprite(120, 480, 'SJPD');
        this.joaquim.setCollideWorldBounds(true);

        this.anims.create({
            key: 'walk_Joaquim_down',
            frames: [
                { key: 'SJAD1' },
                { key: 'SJAD2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Joaquim_up',
            frames: [
                { key: 'SJAE1' },
                { key: 'SJAE2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Joaquim_left',
            frames: [
                { key: 'SJAE1' },
                { key: 'SJAE2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Joaquim_right',
            frames: [
                { key: 'SJAD1' },
                { key: 'SJAD2' }
            ],
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_marlene_left',
            frames: [
                { key: 'DMAE1' },
                { key: 'DMAE2' }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_marlene_right',
            frames: [
                { key: 'DMAD1' },
                { key: 'DMAD2' }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_aparecida_left',
            frames: [
                { key: 'DAAE1' },
                { key: 'DAAE2' }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_aparecida_right',
            frames: [
                { key: 'DAAD1' },
                { key: 'DAAD2' }
            ],
            frameRate: 4,
            repeat: -1
        });

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

        this.startMove();

        this.clickableCharacters = [];
        this.registerClickableCharacter({
            sprite: this.joaquim,
            // O Seu Joaquim recebe o balao acima da cabeca.
            balloonOffset: { x: 0, y: -55 },
            alertInterval: 60000,
            stop: () => this.stopJoaquimForInteraction(),
            resume: () => this.resumeJoaquimFromInteraction()
        });

        this.horizontalNPCs = [
            this.createHorizontalWalker({
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
            this.createHorizontalWalker({
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

        this.registerClickableCharacter({
            sprite: this.horizontalNPCs[0].sprite,
            // A Dona Marlene recebe o balao a esquerda.
            balloonOffset: { x: -55, y: -15 },
            alertInterval: 120000,
            stop: () => this.stopHorizontalWalkerForInteraction(this.horizontalNPCs[0]),
            resume: () => this.resumeHorizontalWalkerFromInteraction(this.horizontalNPCs[0])
        });

        this.registerClickableCharacter({
            sprite: this.horizontalNPCs[1].sprite,
            // A Dona Aparecida recebe o balao a esquerda.
            balloonOffset: { x: -55, y: -15 },
            alertInterval: 240000,
            stop: () => this.stopHorizontalWalkerForInteraction(this.horizontalNPCs[1]),
            resume: () => this.resumeHorizontalWalkerFromInteraction(this.horizontalNPCs[1])
        });
    }

    createCharacterIconButtons() {
        const iconY = 560;
        const iconSpacing = 80;
        const centerX = 256;
        const icons = [
            { key: 'joaquim-icon', x: centerX - iconSpacing },
            { key: 'marlene-icon', x: centerX },
            { key: 'aparecida-icon', x: centerX + iconSpacing }
        ];

        icons.forEach(({ key, x }) => {
            const iconButton = this.add.image(x, iconY, key);
            iconButton.setOrigin(0.5);
            iconButton.setDepth(100);
            iconButton.setInteractive({ useHandCursor: true });

            iconButton.on('pointerdown', () => {
                iconButton.setTint(0x8B2E40);
            });

            iconButton.on('pointerup', () => {
                iconButton.clearTint();
            });

            iconButton.on('pointerout', () => {
                iconButton.clearTint();
            });
        });
    }

    registerClickableCharacter(config) {
        const character = {
            ...config,
            isStoppedByClick: false,
            balloon: null,
            // Cada personagem controla seu proprio alerta e quando ele deve aparecer.
            alertIcon: null,
            alertOffset: config.alertOffset || { x: -13, y: -35 },
            nextAlertTime: config.alertInterval ? this.time.now + config.alertInterval : null
        };

        character.sprite.setInteractive({ useHandCursor: true });
        character.sprite.on('pointerdown', () => this.toggleCharacterInteraction(character));
        this.clickableCharacters.push(character);
    }

    toggleCharacterInteraction(character) {
        if (character.alertIcon) {
            this.resetCharacterAlert(character);
        }

        if (character.isStoppedByClick) {
            character.isStoppedByClick = false;
            character.balloon.destroy();
            character.balloon = null;
            character.resume();
            return;
        }

        character.isStoppedByClick = true;
        character.stop();
        character.balloon = this.add.image(0, 0, 'balao_temporario');
        this.updateCharacterBalloonPosition(character);
    }

    resetCharacterAlert(character) {
        // Ao interagir com um personagem alertado, remove o icone e reinicia a contagem.
        character.alertIcon.destroy();
        character.alertIcon = null;
        character.nextAlertTime = this.time.now + character.alertInterval;
    }

    updateCharacterBalloonPosition(character) {
        if (!character.balloon) {
            return;
        }

        character.balloon.setPosition(
            character.sprite.x + character.balloonOffset.x,
            character.sprite.y + character.balloonOffset.y
        );
    }

    updateCharacterAlert(character, time) {
        if (!character.alertInterval) {
            return;
        }

        // Quando o tempo configurado termina, cria o icone uma unica vez.
        if (!character.alertIcon && time >= character.nextAlertTime) {
            character.alertIcon = this.add.image(0, 0, 'icone_alerta');
            character.alertIcon.setDepth(character.sprite.depth + 1);
        }

        // Mantem o alerta acompanhando o personagem enquanto ele se movimenta.
        if (character.alertIcon) {
            character.alertIcon.setPosition(
                character.sprite.x + character.alertOffset.x,
                character.sprite.y + character.alertOffset.y
            );
        }
    }

    updateCharacterIndicators(time) {
        if (!this.clickableCharacters) {
            return;
        }

        this.clickableCharacters.forEach((character) => {
            this.updateCharacterBalloonPosition(character);
            this.updateCharacterAlert(character, time);
        });
    }

    stopJoaquimForInteraction() {
        if (this.isPaused) {
            this.remainingPauseTime = Math.max(0, this.nextDirectionChange - this.time.now);
        }

        this.joaquim.setVelocity(0, 0);
        this.joaquim.anims.stop();
        this.joaquim.setTexture(this.idleTextures[this.lastDirection] || 'SJPD');
    }

    resumeJoaquimFromInteraction() {
        if (this.isPaused) {
            this.nextDirectionChange = this.time.now + this.remainingPauseTime;
            this.joaquim.setVelocity(0, 0);
            this.joaquim.setTexture(this.idleTextures[this.lastDirection] || 'SJPD');
            return;
        }

        this.startMove(false);
    }

    stopHorizontalWalkerForInteraction(walker) {
        walker.isStoppedByClick = true;
        walker.sprite.setVelocityX(0);
        walker.sprite.anims.stop();
        walker.sprite.setTexture(walker.direction === 'left' ? walker.idleLeft : walker.idleRight);
    }

    resumeHorizontalWalkerFromInteraction(walker) {
        walker.isStoppedByClick = false;
        this.updateHorizontalWalker(walker);
    }

    createHorizontalWalker(config) {
        const walker = {
            ...config,
            sprite: config.sprite,
            direction: config.direction || 'left'
        };

        walker.sprite.setCollideWorldBounds(true);
        walker.sprite.setImmovable(true);
        walker.sprite.setVelocityX(walker.direction === 'left' ? -walker.speed : walker.speed);
        walker.sprite.play(walker.direction === 'left' ? walker.walkLeftAnim : walker.walkRightAnim, true);

        return walker;
    }

    updateHorizontalWalker(walker) {
        if (walker.isStoppedByClick) {
            walker.sprite.setVelocityX(0);
            return;
        }

        const { sprite, minX, maxX, speed, walkLeftAnim, walkRightAnim } = walker;

        if (walker.direction === 'left' && sprite.x <= minX) {
            walker.direction = 'right';
        } else if (walker.direction === 'right' && sprite.x >= maxX) {
            walker.direction = 'left';
        }

        const velocityX = walker.direction === 'left' ? -speed : speed;
        sprite.setVelocityX(velocityX);
        sprite.play(walker.direction === 'left' ? walkLeftAnim : walkRightAnim, true);
    }

    startPause() {
        this.isPaused = true;
        this.joaquim.setVelocity(0, 0);
        this.joaquim.anims.stop();
        this.joaquim.setTexture(this.idleTextures[this.lastDirection] || 'SJPD');
        this.nextDirectionChange = this.time.now + this.pauseTime;
        this.remainingPauseTime = this.pauseTime;
    }

    startMove(resetMoveStart = true) {
        this.isPaused = false;

        if (resetMoveStart) {
            this.moveStartY = this.joaquim.y;
        }

        if (this.currentDirection === 'up') {
            this.joaquim.setVelocity(0, -this.playerSpeed);
            this.joaquim.play('walk_Joaquim_up', true);
            this.lastDirection = 'up';
        } else {
            this.joaquim.setVelocity(0, this.playerSpeed);
            this.joaquim.play('walk_Joaquim_down', true);
            this.lastDirection = 'down';
        }
    }

    update(time) {
        const joaquimInteraction = this.clickableCharacters && this.clickableCharacters[0];
        this.updateCharacterIndicators(time);

        if (joaquimInteraction && joaquimInteraction.isStoppedByClick) {
            this.joaquim.setVelocity(0, 0);

            if (this.horizontalNPCs) {
                this.horizontalNPCs.forEach((walker) => this.updateHorizontalWalker(walker));
            }

            return;
        }

        if (this.isPaused && time >= this.nextDirectionChange) {
            this.currentDirection = this.currentDirection === 'up' ? 'down' : 'up';
            this.startMove();
        }

        const body = this.joaquim.body;
        if (!this.isPaused && body && (body.blocked.up || body.blocked.down)) {
            this.startPause();
            return;
        }

        if (!this.isPaused && Math.abs(this.joaquim.y - this.moveStartY) >= this.verticalDistance) {
            this.startPause();
            return;
        }

        this.isMoving = !this.isPaused;

        if (this.horizontalNPCs) {
            this.horizontalNPCs.forEach((walker) => this.updateHorizontalWalker(walker));
        }
    }

}
