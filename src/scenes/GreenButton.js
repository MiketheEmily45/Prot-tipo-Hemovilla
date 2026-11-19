// Botao verde reutilizavel baseado em botao_start.png sem o texto, com rotulo Phaser por cima.
import { createTextStyle } from './textUtils.js';
import { playSfx } from './AudioManager.js';

export const GREEN_BUTTON_SOURCE_KEY = 'start-button';
export const GREEN_BUTTON_SOURCE_PATH = 'assets/Telas/Botoes/botao_start.png';
export const GREEN_BUTTON_BASE_KEY = 'green-button-base';

const SOURCE_WIDTH = 216;
const SOURCE_HEIGHT = 86;
const CORNER_SLICE_W = 22;
const CORNER_SLICE_H = 20;
const FILL_HEX = '#6c940f';
const CORNER_HEX = '#4c631f';
const DEFAULT_TEXT_COLOR = '#BDEE38';
const PRESSED_TINT = 0x8B2E40;

export function preloadGreenButton(scene) {
    if (!scene || !scene.load) return;
    if (!scene.textures?.exists?.(GREEN_BUTTON_SOURCE_KEY)) {
        scene.load.image(GREEN_BUTTON_SOURCE_KEY, GREEN_BUTTON_SOURCE_PATH);
    }
}

function drawFallbackBase(ctx, w, h) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = FILL_HEX;
    ctx.fillRect(4, 3, w - 8, h - 6);

    // Cantos em L no estilo de botao_start.png
    ctx.fillStyle = CORNER_HEX;
    // Superior esquerdo
    ctx.fillRect(4, 3, 13, 5);
    ctx.fillRect(4, 8, 5, 9);
    // Superior direito
    ctx.fillRect(w - 17, 3, 13, 5);
    ctx.fillRect(w - 9, 8, 5, 9);
    // Inferior esquerdo
    ctx.fillRect(4, h - 8, 13, 5);
    ctx.fillRect(4, h - 17, 5, 9);
    // Inferior direito
    ctx.fillRect(w - 17, h - 8, 13, 5);
    ctx.fillRect(w - 9, h - 17, 5, 9);
}

export function ensureGreenButtonTexture(scene, width = SOURCE_WIDTH, height = SOURCE_HEIGHT) {
    const textures = scene?.textures;
    if (!textures || typeof textures.createCanvas !== 'function') {
        return GREEN_BUTTON_SOURCE_KEY;
    }

    if (!textures.exists(GREEN_BUTTON_BASE_KEY)) {
        const baseCanvasTex = textures.createCanvas(GREEN_BUTTON_BASE_KEY, SOURCE_WIDTH, SOURCE_HEIGHT);
        const ctx = baseCanvasTex?.getContext?.();
        if (ctx) {
            ctx.imageSmoothingEnabled = false;
            const hasStartBtn = textures.exists(GREEN_BUTTON_SOURCE_KEY) && GREEN_BUTTON_SOURCE_KEY !== '__MISSING';
            const srcImg = hasStartBtn ? textures.get(GREEN_BUTTON_SOURCE_KEY)?.getSourceImage?.() : null;

            if (srcImg && srcImg.width > 0) {
                ctx.drawImage(srcImg, 0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
                // Limpa a palavra "INICIAR" do centro mantendo bordas e cantos originais de botao_start.png
                ctx.fillStyle = FILL_HEX;
                ctx.fillRect(20, 20, SOURCE_WIDTH - 40, SOURCE_HEIGHT - 40);
            } else {
                drawFallbackBase(ctx, SOURCE_WIDTH, SOURCE_HEIGHT);
            }
            baseCanvasTex.refresh();
            if (typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode?.NEAREST !== undefined) {
                baseCanvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        }
    }

    const targetW = Math.max(48, Math.round(width));
    const targetH = Math.max(32, Math.round(height));
    if (targetW === SOURCE_WIDTH && targetH === SOURCE_HEIGHT) {
        return GREEN_BUTTON_BASE_KEY;
    }

    const sizedKey = `${GREEN_BUTTON_BASE_KEY}-${targetW}x${targetH}`;
    if (textures.exists(sizedKey)) {
        return sizedKey;
    }

    const baseSource = textures.get(GREEN_BUTTON_BASE_KEY)?.getSourceImage?.();
    if (!baseSource) {
        return GREEN_BUTTON_BASE_KEY;
    }

    const sizedTex = textures.createCanvas(sizedKey, targetW, targetH);
    const sctx = sizedTex?.getContext?.();
    if (sctx) {
        sctx.imageSmoothingEnabled = false;
        const cw = Math.min(CORNER_SLICE_W, Math.floor(targetW / 2));
        const ch = Math.min(CORNER_SLICE_H, Math.floor(targetH / 2));
        const swCenter = SOURCE_WIDTH - 2 * CORNER_SLICE_W;
        const shCenter = SOURCE_HEIGHT - 2 * CORNER_SLICE_H;
        const dwCenter = Math.max(1, targetW - 2 * cw);
        const dhCenter = Math.max(1, targetH - 2 * ch);

        // 4 cantos
        sctx.drawImage(baseSource, 0, 0, CORNER_SLICE_W, CORNER_SLICE_H, 0, 0, cw, ch);
        sctx.drawImage(baseSource, SOURCE_WIDTH - CORNER_SLICE_W, 0, CORNER_SLICE_W, CORNER_SLICE_H, targetW - cw, 0, cw, ch);
        sctx.drawImage(baseSource, 0, SOURCE_HEIGHT - CORNER_SLICE_H, CORNER_SLICE_W, CORNER_SLICE_H, 0, targetH - ch, cw, ch);
        sctx.drawImage(baseSource, SOURCE_WIDTH - CORNER_SLICE_W, SOURCE_HEIGHT - CORNER_SLICE_H, CORNER_SLICE_W, CORNER_SLICE_H, targetW - cw, targetH - ch, cw, ch);

        // 4 bordas
        sctx.drawImage(baseSource, CORNER_SLICE_W, 0, swCenter, CORNER_SLICE_H, cw, 0, dwCenter, ch);
        sctx.drawImage(baseSource, CORNER_SLICE_W, SOURCE_HEIGHT - CORNER_SLICE_H, swCenter, CORNER_SLICE_H, cw, targetH - ch, dwCenter, ch);
        sctx.drawImage(baseSource, 0, CORNER_SLICE_H, CORNER_SLICE_W, shCenter, 0, ch, cw, dhCenter);
        sctx.drawImage(baseSource, SOURCE_WIDTH - CORNER_SLICE_W, CORNER_SLICE_H, CORNER_SLICE_W, shCenter, targetW - cw, ch, cw, dhCenter);

        // Miolo
        sctx.drawImage(baseSource, CORNER_SLICE_W, CORNER_SLICE_H, swCenter, shCenter, cw, ch, dwCenter, dhCenter);

        sizedTex.refresh();
        if (typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode?.NEAREST !== undefined) {
            sizedTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
    }

    return sizedKey;
}

export class GreenButton {
    constructor(scene, {
        x = 256,
        y = 256,
        width = 236,
        height = 50,
        label = '',
        fontSize = '16px',
        textColor = DEFAULT_TEXT_COLOR,
        depth = 100,
        onClick = null
    } = {}) {
        this.scene = scene;
        this.onClick = onClick;
        this.enabled = true;
        this.isPressed = false;

        const textureKey = ensureGreenButtonTexture(scene, width, height);

        this.background = scene.add.image(x, y, textureKey);
        this.background.setOrigin(0.5);
        this.background.setDisplaySize(width, height);
        this.background.setDepth(depth);
        this.background.setInteractive({ useHandCursor: true });

        this.label = scene.add.text(x, y, label, createTextStyle({
            fontFamily: 'monospace',
            fontSize,
            fontStyle: 'bold',
            color: textColor,
            align: 'center'
        })).setOrigin(0.5).setDepth(depth + 1);

        this.bindEvents();
    }

    bindEvents() {
        this.background.on('pointerdown', (_pointer, _lx, _ly, event) => {
            event?.stopPropagation?.();
            if (!this.enabled) return;
            this.isPressed = true;
            this.background.setTint(PRESSED_TINT);
            this.label.setTint(PRESSED_TINT);
        });

        this.background.on('pointerout', () => {
            if (!this.isPressed) return;
            this.isPressed = false;
            this.background.clearTint();
            this.label.clearTint();
        });

        this.background.on('pointerup', (_pointer, _lx, _ly, event) => {
            event?.stopPropagation?.();
            if (!this.enabled || !this.isPressed) {
                this.isPressed = false;
                this.background.clearTint();
                this.label.clearTint();
                return;
            }
            this.isPressed = false;
            this.background.clearTint();
            this.label.clearTint();
            playSfx(this.scene, 'clique');
            if (typeof this.onClick === 'function') {
                this.onClick();
            }
        });
    }

    setText(newText) {
        this.label?.setText(newText);
        return this;
    }

    setPosition(x, y) {
        this.background?.setPosition(x, y);
        this.label?.setPosition(x, y);
        return this;
    }

    setVisible(visible) {
        this.background?.setVisible(visible);
        this.label?.setVisible(visible);
        if (this.background?.input) {
            this.background.input.enabled = Boolean(visible && this.enabled);
        }
        return this;
    }

    setAlpha(alpha) {
        this.background?.setAlpha(alpha);
        this.label?.setAlpha(alpha);
        return this;
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (this.background?.input) {
            this.background.input.enabled = Boolean(this.enabled && this.background.visible);
        }
        return this;
    }

    destroy() {
        this.background?.destroy?.();
        this.label?.destroy?.();
        this.background = null;
        this.label = null;
        this.scene = null;
        this.onClick = null;
    }
}

export function createGreenButton(scene, options) {
    return new GreenButton(scene, options);
}
