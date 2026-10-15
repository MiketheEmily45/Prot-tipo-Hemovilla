// Exibicao provisoria dos coracoes de atendimento ("♥ ♥ ♥").
export class HeartsDisplay {
    constructor(scene, state, {
        x = 504,
        y = 8,
        originX = 1,
        originY = 0,
        depth = 100,
        backgroundColor = 'rgba(0, 0, 0, 0.65)',
        padding = { x: 6, y: 3 }
    } = {}) {
        this.scene = scene;
        this.state = state;
        this.text = scene.add.text(x, y, '', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#ff4d6d',
            backgroundColor,
            padding
        });
        this.text.setOrigin(originX, originY);
        this.text.setDepth(depth);
        this.update();
    }

    update() {
        const hearts = this.state.hearts;
        this.text.setText(hearts > 0 ? Array(hearts).fill('♥').join(' ') : '—');
    }

    setVisible(visible) {
        this.text.setVisible(visible);
    }

    destroy() {
        if (this.text) {
            this.text.destroy();
            this.text = null;
        }
    }
}
