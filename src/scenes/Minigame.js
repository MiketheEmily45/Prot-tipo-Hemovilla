export class Minigame extends Phaser.Scene {

    constructor() {
        super('Minigame');
    }

    preload() {
        this.load.image('minigame-background', 'assets/Telas/Fundos/telainicial.png');
        this.load.image('minigame-back-button', 'assets/Telas/Botoes/botao_pausa.png');
    }

    create() {
        this.scale.resize(512, 512);
        this.cameras.main.setViewport(0, 0, 512, 512);

        this.background = this.add.tileSprite(256, 256, 512, 512, 'minigame-background');

        const title = this.add.text(256, 150, 'Minigame', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);

        const instructions = this.add.text(256, 230, 'Tela de minigame', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#f3d6a0'
        });
        instructions.setOrigin(0.5);

        const backButton = this.add.image(256, 380, 'minigame-back-button');
        backButton.setOrigin(0.5);
        backButton.setScale(0.9);
        backButton.setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => {
            backButton.setTint(0x8B2E40);
        });

        backButton.on('pointerup', () => {
            backButton.clearTint();
            this.scene.start('GameMap');
        });
    }

    update() {

    }
}