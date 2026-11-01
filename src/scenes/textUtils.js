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