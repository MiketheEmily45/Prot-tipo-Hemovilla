// Componente reutilizavel para exibicao do saldo de ATP.
import { getATP } from './atpStore.js';
import { createTextStyle } from './textUtils.js';

export class AtpDisplay {
    /**
     * @param {Phaser.Scene} scene - Cena onde o painel sera renderizado.
     * @param {Object} [options] - Opcoes de posicionamento e dimensao.
     * @param {number} [options.x=504] - Posicao X (borda direita por padrao).
     * @param {number} [options.y=520] - Posicao Y (borda superior por padrao).
     * @param {number} [options.width=84] - Largura total do painel.
     * @param {number} [options.height=24] - Altura total do painel.
     * @param {number} [options.depth=100] - Profundidade na cena.
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.x = options.x ?? 504;
        this.y = options.y ?? 520;
        this.width = options.width ?? 84;
        this.height = options.height ?? 24;
        this.depth = options.depth ?? 100;

        this.bg = null;
        this.icon = null;
        this.text = null;

        this.create();
    }

    create() {
        const scene = this.scene;
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        const depth = this.depth;

        // Fundo escuro com borda sutil
        this.bg = scene.add.rectangle(x, y, width, height, 0x2c1e18, 0.92);
        this.bg.setOrigin(1, 0);
        this.bg.setStrokeStyle(1, 0x8B2E40);
        this.bg.setDepth(depth);

        // Centro vertical do painel
        const centerY = y + Math.round(height / 2);

        // Icone do raio / ATP (deslocado 3px para baixo para centralizar a arte do sprite)
        const iconX = x - width + 14;
        const iconY = centerY + 3;
        this.icon = scene.add.image(iconX, iconY, 'icone-atp');
        this.icon.setOrigin(0.5);
        this.icon.setDepth(depth + 1);
        if (this.icon.texture) {
            this.icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        // Texto com o saldo em amarelo ouro
        const textX = x - width + 28;
        this.text = scene.add.text(textX, centerY, String(getATP()), createTextStyle({
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#f5d547'
        }));
        this.text.setOrigin(0, 0.5);
        this.text.setDepth(depth + 1);
    }

    update() {
        if (this.text && typeof this.text.setText === 'function') {
            this.text.setText(String(getATP()));
        }
    }

    destroy() {
        if (this.bg) {
            this.bg.destroy();
            this.bg = null;
        }
        if (this.icon) {
            this.icon.destroy();
            this.icon = null;
        }
        if (this.text) {
            this.text.destroy();
            this.text = null;
        }
        this.scene = null;
    }
}
