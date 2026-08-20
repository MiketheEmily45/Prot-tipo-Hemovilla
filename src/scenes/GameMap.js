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
        this.load.image('DAPD', 'assets/Personagens/DonaAparecida/DonaAparecida.ParadaDireita.png');
        this.load.image('DAPE', 'assets/Personagens/DonaAparecida/DonaAparecida.ParadaEsquerda.png');
        this.load.image('DAAD1', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarDireita1.png');
        this.load.image('DAAE1', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarEsquerda1.png');
        this.load.image('DAAD2', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarDireita2.png');
        this.load.image('DAAE2', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarEsquerda2.png');
    }

    create() {
        this.background1 = this.add.tileSprite(256, 256, 512, 512, 'map1');
        this.background2 = this.add.tileSprite(256, 256, 512, 512, 'map2');
        this.background3 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision1');
        this.background4 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision2');

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

        this.startMove();

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
    }

    startMove() {
        this.isPaused = false;
        this.moveStartY = this.joaquim.y;

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
