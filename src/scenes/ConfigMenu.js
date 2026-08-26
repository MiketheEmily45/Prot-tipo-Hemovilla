export class ConfigMenu extends Phaser.Scene {

    constructor() {
        super('ConfigMenu');
    }

    preload() {
        // Usa a mesma tela inicial como fundo para o menu de configuracoes nao ficar vazio.
        this.load.image('config-menu', 'assets/Telas/Fundos/telainicial.png');
        this.load.image('config-button', 'assets/Telas/Botoes/botao_config.png');
    }

    create() {
        this.background = this.add.tileSprite(256, 256, 512, 512, 'config-menu');
        // Mantem o botao na mesma posicao da tela inicial.
        const configButton = this.add.tileSprite(this.background.width / 2 + 200, this.background.height / 2 + 200, 84, 80, 'config-button');
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
