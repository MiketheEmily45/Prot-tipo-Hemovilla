// Constantes e utilidades para renderizacao de texto com alta nitidez.
export const TEXT_RESOLUTION = 3;

/**
 * Retorna as configuracoes de estilo de texto mescladas com a resolucao padrao de alta nitidez.
 * @param {Phaser.Types.GameObjects.Text.TextStyle} [style={}]
 * @returns {Phaser.Types.GameObjects.Text.TextStyle}
 */
export function createTextStyle(style = {}) {
    return {
        resolution: TEXT_RESOLUTION,
        ...style
    };
}

/**
 * Aplica quebra de linha na largura maxima e reduz a fonte ate caber na caixa.
 * @param {Phaser.GameObjects.Text} textObject
 * @param {{ maxWidth?: number, maxHeight?: number, maxFontSize?: number, minFontSize?: number, step?: number }} [options]
 * @returns {{ fontSize: number, fits: boolean, width: number, height: number }}
 */
export function fitTextToBox(textObject, {
    maxWidth,
    maxHeight = Infinity,
    maxFontSize = 18,
    minFontSize = 10,
    step = 1
} = {}) {
    if (!textObject) {
        return { fontSize: minFontSize, fits: true, width: 0, height: 0 };
    }

    const safeMaxWidth = typeof maxWidth === 'number' && maxWidth > 0 ? maxWidth : Infinity;
    const safeMaxHeight = typeof maxHeight === 'number' && maxHeight > 0 ? maxHeight : Infinity;
    const startSize = Math.max(minFontSize, Math.round(maxFontSize));
    const endSize = Math.max(1, Math.round(minFontSize));
    const safeStep = Math.max(0.5, step);

    if (Number.isFinite(safeMaxWidth)) {
        if (typeof textObject.setWordWrapWidth === 'function') {
            textObject.setWordWrapWidth(safeMaxWidth, true);
        } else if (typeof textObject.setStyle === 'function') {
            textObject.setStyle({ wordWrap: { width: safeMaxWidth, useAdvancedWrap: true } });
        }
    }

    let currentSize = startSize;
    let width = textObject.width ?? 0;
    let height = textObject.height ?? 0;
    let fits = width <= safeMaxWidth + 0.5 && height <= safeMaxHeight + 0.5;

    for (let size = startSize; size >= endSize; size -= safeStep) {
        currentSize = size;
        textObject.setFontSize?.(`${size}px`);
        width = textObject.width ?? 0;
        height = textObject.height ?? 0;
        fits = width <= safeMaxWidth + 0.5 && height <= safeMaxHeight + 0.5;
        if (fits) {
            break;
        }
    }

    return { fontSize: currentSize, fits, width, height };
}