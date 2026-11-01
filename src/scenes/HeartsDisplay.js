// Exibicao dos coracoes de atendimento usando os quadros de vidas.
const HEART_TEXTURES = {
    3: 'coracoes-3',
    2: 'coracoes-2',
    1: 'coracoes-1',
    0: 'coracoes-0'
};

export class HeartsDisplay {
    constructor(scene, state, {
        x = 504,
        y = 8,
        originX = 1,
        originY = 0,
        depth = 100,
        scale = 1
    } = {}) {
        this.scene = scene;
        this.state = state;

        this.sprite = scene.add.image(x, y, this.resolveTexture());
        this.sprite.setOrigin(originX, originY);
        this.sprite.setDepth(depth);
        this.sprite.setScale(scale);

        // Garante filtro Nearest para pixel art nitida
        if (this.sprite.texture) {
            this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        // Mantem compatibilidade com referencias a this.text se houver
        this.text = this.sprite;

        this.update();
    }

    resolveTexture() {
        const hearts = Math.max(0, Math.min(3, this.state.hearts));
        return HEART_TEXTURES[hearts] || 'coracoes-0';
    }

    update() {
        const textureKey = this.resolveTexture();
        if (this.sprite && this.sprite.texture.key !== textureKey) {
            this.sprite.setTexture(textureKey);
            if (this.sprite.texture) {
                this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        }
    }

    setVisible(visible) {
        if (this.sprite) {
            this.sprite.setVisible(visible);
        }
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
            this.text = null;
        }
    }
}