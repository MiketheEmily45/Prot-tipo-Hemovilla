export class ConfigMenu extends Phaser.Scene {

    constructor() {
        super('ConfigMenu');
    }

    preload() {
        this.load.image('config-menu', 'assets/telaconfig.png');
        this.load.image('config-button', 'assets/botaoconfig.png');
    }

    create() {
        this.background = this.add.tileSprite(318, 326, 637, 653, 'config-menu');
        const configButton = this.add.tileSprite(this.background.width / 2 + 240, this.background.height / 2 + 250, 84, 80, 'config-button');
        configButton.setInteractive();
        configButton.setOrigin(0.5);
        configButton.on('pointerdown', () => {
            configButton.setTint(0x8B2E40);
        })
        configButton.on('pointerup', () => {            
            configButton.clearTint();
            this.scene.start('Start');
        })
    }

    update() {

    }
}