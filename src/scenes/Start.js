import { preloadAudio, playSceneMusic, stopMusic, playSfx } from './AudioManager.js';

export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
    }

    preload() {
        this.load.image('background', 'assets/Telas/Fundos/telainicial.png');
        this.load.image('start-button', 'assets/Telas/Botoes/botao_start.png');
        this.load.image('config-button', 'assets/Telas/Botoes/botao_config.png');
        this.load.image('title', 'assets/Telas/Fundos/title.png');
        preloadAudio(this);
    }

    create() {
        this.playMusic();
        this.setupViewport();
        this.setupBackground();
        this.setupTitle();
        this.setupStartButton();
        this.setupConfigButton();
    }

    playMusic() {
        playSceneMusic(this, 'Start');
    }

    setupViewport() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);
    }

    setupBackground() {
        this.background = this.add.tileSprite(256, 256, 512, 512, 'background');
    }

    setupTitle() {
        const title = this.add.image(this.background.width / 2, this.background.height / 2 - 100, 'title');
        title.setOrigin(0.5);
        title.setScale(2);
        this.title = title;
    }

    setupStartButton() {
        const startButton = this.add.tileSprite(this.background.width / 2, this.background.height / 2 + 120, 216, 86, 'start-button');
        startButton.setInteractive();
        startButton.setOrigin(0.5);
        startButton.on('pointerdown', () => {
            startButton.setTint(0x8B2E40);
        });
        startButton.on('pointerup', () => {            
            startButton.clearTint();
            playSfx(this, 'clique');
            stopMusic(this, 'start-music');
            this.scene.start('GameMap');
        });
        this.startButton = startButton;
    }

    setupConfigButton() {
        const configButton = this.add.tileSprite(this.background.width / 2 + 200, this.background.height / 2 + 200, 84, 80, 'config-button');
        configButton.setInteractive();
        configButton.setOrigin(0.5);
        configButton.on('pointerdown', () => {
            configButton.setTint(0x8B2E40);
        });
        configButton.on('pointerup', () => {            
            configButton.clearTint();
            playSfx(this, 'clique');
            this.scene.start('ConfigMenu', { fromScene: 'Start' });
        });
        this.configButton = configButton;
    }

    update() {
    
    }
    
}
