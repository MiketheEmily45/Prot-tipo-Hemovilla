export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
    }

    preload() {
        this.load.image('background', 'assets/telainicial.png');
        this.load.image('start-button', 'assets/botaostart.png');
        this.load.image('config-button', 'assets/botaoconfig.png');
        this.load.image('title', 'assets/title.png');
    }

    create() {
        this.background = this.add.tileSprite(318, 326, 637, 653, 'background');
        const title = this.add.image(this.background.width / 2, this.background.height / 2 - 100, 'title');
        title.setOrigin(0.5);
        title.setScale(2);
        const startButton = this.add.tileSprite(this.background.width / 2, this.background.height / 2 + 100, 216, 86, 'start-button');
        startButton.setInteractive();
        startButton.setOrigin(0.5);
        startButton.on('pointerdown', () => {
            startButton.setTint(0x8B2E40);
        })
        startButton.on('pointerup', () => {            
            startButton.clearTint();
            this.scene.start('GameMap');
        })
        const configButton = this.add.tileSprite(this.background.width / 2 + 240, this.background.height / 2 + 250, 84, 80, 'config-button');
        configButton.setInteractive();
        configButton.setOrigin(0.5);
        configButton.on('pointerdown', () => {
            configButton.setTint(0x8B2E40);
        })
        configButton.on('pointerup', () => {            
            configButton.clearTint();
            this.scene.start('ConfigMenu');
        })
    }

    update() {
    
    }
    
}
