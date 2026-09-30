// Tela do mini-game

export class Minigame extends Phaser.Scene {

    constructor() {
        super('Minigame');
    }

    preload() {
        this.load.image('minigame-background', 'assets/Mini-game/Cenario/SalaHospital.png');
        this.load.image('pause-button', 'assets/Telas/Botoes/botao_pausa.png');
    }

    create() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);

        this.background = this.add.tileSprite(256, 256, 512, 512, 'minigame-background');

        const pauseButton = this.add.image(8, 8, 'pause-button');
        pauseButton.setOrigin(0);
        pauseButton.setDepth(100);
        pauseButton.setInteractive({ useHandCursor: true });

        pauseButton.on('pointerdown', () => {
            pauseButton.setTint(0x8B2E40);
        });

        pauseButton.on('pointerup', () => {
            pauseButton.clearTint();
            this.scene.start('Start');
        });
    }

    update() {

    }
}