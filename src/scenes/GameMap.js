export class GameMap extends Phaser.Scene {

    constructor() {
        super('GameMap');
    }

    preload() {
        this.load.image('map', 'assets/Map.png');
        this.load.image('map1', 'assets/BaseCidade1.png');
        this.load.image('map2', 'assets/ComplementosCidade1.png');
        this.load.image('mapcolision1', 'assets/ConstrucoesPrincipaisCidade1.png');
        this.load.image('mapcolision2', 'assets/ConstrucoesSecundariasCidade1.png');
        // Load player sprites for all directions
        this.load.image('down', 'assets/down.png');
        this.load.image('down2', 'assets/down2.png');
        this.load.image('down3', 'assets/down3.png');
        this.load.image('up', 'assets/up.png');
        this.load.image('up2', 'assets/up2.png');
        this.load.image('up3', 'assets/up3.png');
        this.load.image('left', 'assets/left.png');
        this.load.image('left2', 'assets/left2.png');
        this.load.image('left3', 'assets/left3.png');
        this.load.image('right', 'assets/right.png');
        this.load.image('right2', 'assets/right2.png');
        this.load.image('right3', 'assets/right3.png');
    }

    create() {
        this.background1 = this.add.tileSprite(256, 256, 512, 512, 'map1');
        this.background2 = this.add.tileSprite(256, 256, 512, 512, 'map2');
        this.background3 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision1');
        this.background4 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision2');
        this.player = this.physics.add.sprite(41, 79, 'down');
        this.player.setCollideWorldBounds(true);
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create walking animations for all directions
        this.anims.create({
            key: 'walk_down',
            frames: [
                { key: 'down' },
                { key: 'down2' },
                { key: 'down3' }
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_up',
            frames: [
                { key: 'up' },
                { key: 'up2' },
                { key: 'up3' }
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_left',
            frames: [
                { key: 'left' },
                { key: 'left2' },
                { key: 'left3' }
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_right',
            frames: [
                { key: 'right' },
                { key: 'right2' },
                { key: 'right3' }
            ],
            frameRate: 5,
            repeat: -1
        });

        this.isMoving = false;
        this.lastDirection = 'down';

        // Seeded random generator for deterministic movement
        this.rngSeeds = ['player-ai', 'move-trajectory'];
        this.random = new Phaser.Math.RandomDataGenerator(this.rngSeeds);
        this.playerSpeed = 120;
        this.minMoveTime = 400;
        this.maxMoveTime = 1100;
        this.minPauseTime = 300;
        this.maxPauseTime = 900;
        this.isPaused = true;
        this.nextDirectionChange = this.time.now + this.random.between(this.minPauseTime, this.maxPauseTime);
        this.currentDirection = null;
        this.startPause();
    }

    startPause() {
        this.isPaused = true;
        this.player.setVelocity(0, 0);
        this.player.stop();
        this.player.setTexture(this.lastDirection);
        this.nextDirectionChange = this.time.now + this.random.between(this.minPauseTime, this.maxPauseTime);
    }

    startMove() {
        const directions = ['up', 'down', 'left', 'right'];
        this.currentDirection = directions[this.random.between(0, directions.length - 1)];
        this.nextDirectionChange = this.time.now + this.random.between(this.minMoveTime, this.maxMoveTime);
        this.isPaused = false;

        switch (this.currentDirection) {
            case 'up':
                this.player.setVelocity(0, -this.playerSpeed);
                this.player.play('walk_up', true);
                this.lastDirection = 'up';
                break;
            case 'down':
                this.player.setVelocity(0, this.playerSpeed);
                this.player.play('walk_down', true);
                this.lastDirection = 'down';
                break;
            case 'left':
                this.player.setVelocity(-this.playerSpeed, 0);
                this.player.play('walk_left', true);
                this.lastDirection = 'left';
                break;
            case 'right':
                this.player.setVelocity(this.playerSpeed, 0);
                this.player.play('walk_right', true);
                this.lastDirection = 'right';
                break;
        }
    }

    update(time) {
        if (time >= this.nextDirectionChange) {
            if (this.isPaused) {
                this.startMove();
            } else {
                this.startPause();
            }
        }

        const body = this.player.body;
        if (!this.isPaused && (body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down)) {
            this.startPause();
        }

        this.isMoving = !this.isPaused;
    }

}
