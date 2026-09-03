export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
    }

    preload() {
        this.load.image('background', 'assets/Telas/Fundos/telainicial.png');
        this.load.image('start-button', 'assets/Telas/Botoes/botao_start.png');
        this.load.image('config-button', 'assets/Telas/Botoes/botao_config.png');
        this.load.image('title', 'assets/Telas/Fundos/title.png');
        this.load.audio('start-music', 'assets/Musica/MenuMusic.mp3');
    }

    create() {
        this.sound.play('start-music', { loop: true });
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);
        this.background = this.add.tileSprite(256, 256, 512, 512, 'background');
        const title = this.add.image(this.background.width / 2, this.background.height / 2 - 100, 'title');
        title.setOrigin(0.5);
        title.setScale(2);
        const startButton = this.add.tileSprite(this.background.width / 2, this.background.height / 2 + 120, 216, 86, 'start-button');
        startButton.setInteractive();
        startButton.setOrigin(0.5);
        startButton.on('pointerdown', () => {
            startButton.setTint(0x8B2E40);
        })
        startButton.on('pointerup', () => {            
            startButton.clearTint();
            this.sound.stopByKey('start-music');
            this.scene.start('GameMap');
        })
        const configButton = this.add.tileSprite(this.background.width / 2 + 200, this.background.height / 2 + 200, 84, 80, 'config-button');
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
