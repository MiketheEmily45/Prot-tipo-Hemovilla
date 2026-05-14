export class GameMap extends Phaser.Scene {

    constructor() {
        super('GameMap');
    }

    preload() {
        this.load.image('map', 'assets/Map.png');
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
        this.background = this.add.tileSprite(318, 326, 637, 653, 'map');
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
            frameRate: 10,
            repeat: -1
        });

        this.isMoving = false;
        this.lastDirection = 'down';
    }

    update() {
        this.isMoving = false;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            if (this.lastDirection !== 'left') {
                this.player.play('walk_left', true);
                this.lastDirection = 'left';
            }
            this.isMoving = true;
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            if (this.lastDirection !== 'right') {
                this.player.play('walk_right', true);
                this.lastDirection = 'right';
            }
            this.isMoving = true;
        }
        else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-160);
            if (this.lastDirection !== 'up') {
                this.player.play('walk_up', true);
                this.lastDirection = 'up';
            }
            this.isMoving = true;
        }
        else if (this.cursors.down.isDown) {
            this.player.setVelocityY(160);
            if (this.lastDirection !== 'down') {
                this.player.play('walk_down', true);
                this.lastDirection = 'down';
            }
            this.isMoving = true;
        }
        else {
            this.player.setVelocityY(0);
        }

        // Stop animation if not moving
        if (!this.isMoving) {
            this.player.stop();
            // Set sprite to idle frame based on last direction
            this.player.setTexture(this.lastDirection);
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-330);
        }
    }

}
