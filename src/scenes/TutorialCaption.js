// Legenda do tutorial: caixa bege/marrom (mesmo visual do ConfirmPopup) no rodape da area do jogo.
import { createTextStyle } from './textUtils.js';
import { playSfx } from './AudioManager.js';
import { TUTORIAL_SKIP_LABEL } from './tutorialSteps.js';

const MARGIN = 6;             // distancia da borda preta externa ate a borda da tela
const BORDER = 4;             // borda preta grossa
const PAD_X = 18;             // margem horizontal da moldura marrom ate o texto
const PAD_Y = 12;             // margem vertical da moldura marrom ate o texto
const MIN_BOX_HEIGHT = 46;
const MAX_LINES = 3;
const FONT_SIZE = 13;
const LINE_SPACING = 4;
const INDICATOR_WIDTH = 22;   // espaco reservado a direita para o indicador piscando
const APPROX_CHARS_PER_LINE = 52;
const DEFAULT_DEPTH = 1000;
const SKIP_TAB = { width: 104, height: 18, right: 10 };

const TEXT_STYLE = {
    fontFamily: 'monospace',
    fontSize: `${FONT_SIZE}px`,
    fontStyle: 'bold',
    color: '#3b2a20',
    lineSpacing: LINE_SPACING
};

/**
 * Divide o texto em paginas de ate MAX_LINES linhas, preferindo cortar entre frases.
 * `fits(texto)` diz se o texto cabe em MAX_LINES linhas.
 */
export function paginateCaption(text, fits) {
    const clean = String(text ?? '').trim();
    if (!clean || fits(clean)) {
        return [clean];
    }

    const sentences = clean.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
    const pages = [];
    let current = '';

    const pushWords = (sentence) => {
        // Frase maior que uma pagina: corta por palavras.
        let chunk = '';
        sentence.split(/\s+/).forEach((word) => {
            const candidate = chunk ? `${chunk} ${word}` : word;
            if (fits(candidate) || !chunk) {
                chunk = candidate;
            } else {
                pages.push(chunk);
                chunk = word;
            }
        });
        return chunk;
    };

    sentences.forEach((sentence) => {
        const candidate = current ? `${current} ${sentence}` : sentence;
        if (fits(candidate)) {
            current = candidate;
            return;
        }
        if (current) {
            pages.push(current);
        }
        current = fits(sentence) ? sentence : pushWords(sentence);
    });
    if (current) {
        pages.push(current);
    }

    // Equilibra nada: cada pagina leva o maximo de frases que cabem em MAX_LINES linhas.
    return pages;
}

export class TutorialCaption {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ bottomY?: number, depth?: number }} [options] bottomY = borda de baixo da caixa (padrao: altura da camera - margem)
     */
    constructor(scene, { bottomY = null, depth = DEFAULT_DEPTH } = {}) {
        this.scene = scene;
        this.depth = depth;
        this.bottomY = bottomY;
        this.elements = [];
        this.indicatorTween = null;
        this.pages = [];
        this.pageIndex = 0;
        this.blocking = true;
        this.dismissOnLastPage = true;
        this.showSkipButton = true;
        this.callbacks = {};
        this.isOpen = false;
        this.keyHandler = (event) => {
            if (event?.repeat || this.scene?.pauseMenu?.isOpen || this.scene?.characterOverlay || this.scene?.quizPanel?.isOpen) return;
            this.advance();
        };
        this.keyboard = null;
    }

    get cameraSize() {
        const camera = this.scene.cameras?.main;
        return { width: camera?.width || 512, height: camera?.height || 512 };
    }

    /**
     * Mostra uma sequencia de passos.
     * @param {Array<{text: string}>} steps
     * @param {object} options
     * @param {boolean} [options.blocking=true] bloqueia os cliques na cena de tras
     * @param {number} [options.startIndex=0] passo inicial (para retomar)
     * @param {number|null} [options.bottomY] borda de baixo da caixa nesta legenda (padrao: a do construtor)
     * @param {(stepIndex:number)=>void} [options.onStepDone] chamado ao terminar cada passo (todas as paginas dele)
     * @param {()=>void} [options.onComplete] chamado depois do ultimo passo
     * @param {()=>void} [options.onSkip] chamado ao clicar em "Pular tutorial"
     */
    show(steps, {
        blocking = true,
        dismissOnLastPage = true,
        showSkipButton = true,
        startIndex = 0,
        bottomY = null,
        onStepDone = null,
        onComplete = null,
        onSkip = null,
        onPageRender = null,
        onHide = null
    } = {}) {
        this.hide();
        this.activeBottomY = bottomY;

        this.blocking = blocking;
        this.dismissOnLastPage = dismissOnLastPage;
        this.showSkipButton = Boolean(showSkipButton);
        this.callbacks = { onStepDone, onComplete, onSkip, onPageRender, onHide };
        this.pages = this.buildPages(steps).filter((page) => page.stepIndex >= startIndex);
        this.pageIndex = 0;

        if (this.pages.length === 0) {
            onComplete?.();
            return;
        }

        this.isOpen = true;
        this.bindKeys();
        this.render();
    }

    buildPages(steps) {
        const style = createTextStyle({
            ...TEXT_STYLE,
            wordWrap: { width: this.textWidth, useAdvancedWrap: true }
        });
        const measurer = this.scene.add.text(-2000, -2000, '', style);
        measurer.setVisible?.(false);

        const fits = (text) => {
            measurer.setText?.(text);
            const lines = typeof measurer.getWrappedText === 'function'
                ? measurer.getWrappedText(text).length
                : Math.ceil(text.length / APPROX_CHARS_PER_LINE);
            return lines <= MAX_LINES;
        };

        const pages = [];
        steps.forEach((step, stepIndex) => {
            const parts = paginateCaption(step.text, fits);
            parts.forEach((text, partIndex) => {
                pages.push({
                    text,
                    stepIndex,
                    stepId: step.id ?? null,
                    isLastOfStep: partIndex === parts.length - 1
                });
            });
        });

        measurer.destroy?.();
        return pages;
    }

    get textWidth() {
        const { width } = this.cameraSize;
        return width - 2 * (MARGIN + BORDER) - 2 * PAD_X - INDICATOR_WIDTH;
    }

    bindKeys() {
        this.unbindKeys();
        const keyboard = this.scene.input?.keyboard;
        if (keyboard && typeof keyboard.on === 'function') {
            keyboard.on('keydown-SPACE', this.keyHandler);
            keyboard.on('keydown-ENTER', this.keyHandler);
            this.keyboard = keyboard;
        }
    }

    unbindKeys() {
        if (this.keyboard) {
            this.keyboard.off?.('keydown-SPACE', this.keyHandler);
            this.keyboard.off?.('keydown-ENTER', this.keyHandler);
            this.keyboard = null;
        }
    }

    clearElements() {
        this.indicatorTween?.stop?.();
        this.indicatorTween = null;
        this.elements.forEach((el) => el?.destroy?.());
        this.elements = [];
    }

    render() {
        const scene = this.scene;
        const page = this.pages[this.pageIndex];
        const { width, height } = this.cameraSize;
        const depth = this.depth;
        this.clearElements();

        if (this.blocking) {
            // Camada transparente: engole os cliques na cena de tras ate avancar.
            const blocker = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
            blocker.setDepth(depth);
            blocker.setInteractive();
            blocker.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation?.());
            this.elements.push(blocker);
        }

        const boxW = width - 2 * (MARGIN + BORDER);
        const boxX = MARGIN + BORDER;

        const text = scene.add.text(0, 0, page.text, createTextStyle({
            ...TEXT_STYLE,
            wordWrap: { width: this.textWidth, useAdvancedWrap: true }
        }));
        text.setDepth(depth + 2);
        const boxH = Math.max(MIN_BOX_HEIGHT, Math.ceil(text.height) + 2 * PAD_Y);
        const bottomY = this.activeBottomY ?? this.bottomY ?? (height - MARGIN);
        const boxY = bottomY - BORDER - boxH;
        text.setPosition(boxX + PAD_X, boxY + PAD_Y);
        this.elements.push(text);

        const gfx = scene.add.graphics();
        gfx.setDepth(depth + 1);
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(boxX - BORDER, boxY - BORDER, boxW + 2 * BORDER, boxH + 2 * BORDER);
        gfx.fillStyle(0x674430, 1);
        gfx.fillRect(boxX, boxY, boxW, boxH);
        gfx.fillStyle(0x331d11, 1);
        gfx.fillRect(boxX + 10, boxY + 6, boxW - 20, boxH - 12);
        gfx.fillStyle(0xd7c8a9, 1);
        gfx.fillRect(boxX + 14, boxY + 9, boxW - 28, boxH - 18);
        this.elements.push(gfx);

        const canAdvance = this.dismissOnLastPage || this.pageIndex < this.pages.length - 1;
        if (canAdvance) {
            // Clique na caixa avanca.
            const hit = scene.add.rectangle(boxX + boxW / 2, boxY + boxH / 2, boxW + 2 * BORDER, boxH + 2 * BORDER, 0x000000, 0);
            hit.setDepth(depth + 3);
            hit.setInteractive({ useHandCursor: true });
            let pressed = false;
            hit.on('pointerdown', (_p, _x, _y, event) => {
                event?.stopPropagation?.();
                pressed = true;
            });
            hit.on('pointerout', () => { pressed = false; });
            hit.on('pointerup', (_p, _x, _y, event) => {
                event?.stopPropagation?.();
                if (!pressed) return;
                pressed = false;
                this.advance();
            });
            this.elements.push(hit);
        }

        // Indicador piscando (triangulo para baixo) no canto inferior direito da caixa.
        const indicator = scene.add.graphics();
        indicator.setDepth(depth + 2);
        const ix = boxX + boxW - 28;
        const iy = boxY + boxH - 21;
        indicator.fillStyle(0x674430, 1);
        indicator.fillTriangle(ix, iy, ix + 12, iy, ix + 6, iy + 8);
        this.elements.push(indicator);
        if (scene.tweens?.add) {
            this.indicatorTween = scene.tweens.add({
                targets: indicator,
                alpha: { from: 1, to: 0.1 },
                duration: 450,
                yoyo: true,
                repeat: -1
            });
        }

        if (this.showSkipButton) {
            this.createSkipButton(boxX + boxW - SKIP_TAB.right, boxY - BORDER, depth + 4);
        }
        this.callbacks.onPageRender?.(page);
    }

    // Botao pequeno "Pular tutorial" na aba que sai do canto superior direito da caixa.
    createSkipButton(rightX, boxTopY, depth) {
        const scene = this.scene;
        const x = rightX - SKIP_TAB.width;
        const y = boxTopY - SKIP_TAB.height;
        const normal = 0x674430;
        const pressedColor = 0x331d11;

        const gfx = scene.add.graphics();
        gfx.setDepth(depth);
        const draw = (fill) => {
            gfx.clear();
            gfx.fillStyle(0x000000, 1);
            gfx.fillRect(x - 3, y - 3, SKIP_TAB.width + 6, SKIP_TAB.height + BORDER + 3);
            gfx.fillStyle(fill, 1);
            gfx.fillRect(x, y, SKIP_TAB.width, SKIP_TAB.height + BORDER);
        };
        draw(normal);
        this.elements.push(gfx);

        const label = scene.add.text(x + SKIP_TAB.width / 2, y + SKIP_TAB.height / 2 - 1, TUTORIAL_SKIP_LABEL, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#d7c8a9'
        }));
        label.setOrigin(0.5);
        label.setDepth(depth + 1);
        this.elements.push(label);

        const hit = scene.add.rectangle(x + SKIP_TAB.width / 2, y + SKIP_TAB.height / 2, SKIP_TAB.width + 2, SKIP_TAB.height + 2, 0x000000, 0);
        hit.setDepth(depth + 2);
        hit.setInteractive({ useHandCursor: true });
        let pressed = false;
        hit.on('pointerdown', (_p, _x, _y, event) => {
            event?.stopPropagation?.();
            pressed = true;
            draw(pressedColor);
        });
        hit.on('pointerout', () => {
            pressed = false;
            draw(normal);
        });
        hit.on('pointerup', (_p, _x, _y, event) => {
            event?.stopPropagation?.();
            if (!pressed) return;
            pressed = false;
            playSfx(scene, 'clique');
            const onSkip = this.callbacks.onSkip;
            this.hide();
            onSkip?.();
        });
        this.elements.push(hit);
    }

    advance() {
        if (!this.isOpen) return;
        if (!this.dismissOnLastPage && this.pageIndex >= this.pages.length - 1) return;

        playSfx(this.scene, 'clique');
        const page = this.pages[this.pageIndex];
        const { onStepDone, onComplete } = this.callbacks;

        if (page.isLastOfStep) {
            onStepDone?.(page.stepIndex);
        }
        // Os callbacks podem ter fechado ou trocado a legenda.
        if (!this.isOpen || this.pages[this.pageIndex] !== page) return;

        if (this.pageIndex >= this.pages.length - 1) {
            this.hide();
            onComplete?.();
            return;
        }

        this.pageIndex += 1;
        this.render();
    }

    // Fecha sem chamar nenhum callback de conclusao/pulo.
    hide() {
        const onHide = this.callbacks.onHide;
        this.unbindKeys();
        this.clearElements();
        this.isOpen = false;
        this.pages = [];
        this.pageIndex = 0;
        this.callbacks = {};
        onHide?.();
    }

    destroy() {
        this.hide();
        this.scene = null;
    }
}
