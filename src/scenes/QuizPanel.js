// Minitela do Quiz de compatibilidade sanguinea no mapa (estilo do PauseMenu).
// Os relogios de ocorrencia continuam correndo normalmente com o quiz aberto.
import { createTextStyle } from './textUtils.js';
import { GreenButton } from './GreenButton.js';
import { addATP } from './atpStore.js';
import { playSfx } from './AudioManager.js';
import {
    QUIZ_QUESTIONS_PER_ROUND,
    QUIZ_ATP_PER_CORRECT,
    QUIZ_PERFECT_BONUS_ATP
} from './quizConfig.js';
import {
    generateQuizRound,
    calculateQuizReward,
    startQuizCooldown,
    isQuizOnCooldown
} from './quizLogic.js';

const DEFAULT_QUIZ_DEPTH = 1400;
const PANEL_WIDTH = 416;
const PANEL_HEIGHT = 408;

export class QuizPanel {
    constructor(scene, { depth = DEFAULT_QUIZ_DEPTH } = {}) {
        this.scene = scene;
        this.depth = depth;
        this.isOpen = false;

        this.backdrop = null;
        this.panelElements = [];
        this.buttons = [];

        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answeredCount = 0;
        this.answeredCurrent = false;
        this.roundFinished = false;
        this.cityIndex = 0;

        scene.events?.once?.('shutdown', () => this.destroy());
    }

    open(cityIndex = 0) {
        if (this.isOpen || !this.scene || isQuizOnCooldown()) {
            return false;
        }

        this.cityIndex = typeof cityIndex === 'number' ? cityIndex : (this.scene.currentCityIndex ?? 0);
        this.questions = generateQuizRound({
            cityIndex: this.cityIndex,
            count: QUIZ_QUESTIONS_PER_ROUND
        });
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answeredCount = 0;
        this.answeredCurrent = false;
        this.roundFinished = false;
        this.isOpen = true;

        this.createBackdrop();
        this.renderQuestion();
        return true;
    }

    close() {
        if (!this.isOpen) return;

        // Inicia o intervalo de cooldown se o jogador respondeu ao menos 1 pergunta ou terminou a rodada.
        if ((this.answeredCount > 0 || this.roundFinished) && !isQuizOnCooldown()) {
            startQuizCooldown();
        }

        this.destroyPanelElements();
        this.destroyBackdrop();
        this.isOpen = false;
        this.scene?.mapControls?.updateQuizButtonState?.();
    }

    createBackdrop() {
        this.destroyBackdrop();
        const scene = this.scene;
        const width = scene.cameras?.main?.width || 512;
        const height = scene.cameras?.main?.height || 608;

        this.backdrop = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);
        this.backdrop.setDepth(this.depth);
        this.backdrop.setInteractive();
        this.backdrop.on('pointerdown', (_p, _lx, _ly, event) => event?.stopPropagation?.());
    }

    destroyBackdrop() {
        this.backdrop?.destroy?.();
        this.backdrop = null;
    }

    destroyPanelElements() {
        this.buttons.forEach((btn) => btn?.destroy?.());
        this.buttons = [];
        this.panelElements.forEach((el) => el?.destroy?.());
        this.panelElements = [];
    }

    drawPanelFrame() {
        const scene = this.scene;
        const centerX = 256;
        const centerY = 264;
        const boxX = Math.round(centerX - PANEL_WIDTH / 2);
        const boxY = Math.round(centerY - PANEL_HEIGHT / 2);

        const boxGfx = scene.add.graphics();
        boxGfx.setDepth(this.depth + 1);

        boxGfx.fillStyle(0x000000, 1);
        boxGfx.fillRect(boxX - 4, boxY - 4, PANEL_WIDTH + 8, PANEL_HEIGHT + 8);

        boxGfx.fillStyle(0x674430, 1);
        boxGfx.fillRect(boxX, boxY, PANEL_WIDTH, PANEL_HEIGHT);

        boxGfx.fillStyle(0x331d11, 1);
        boxGfx.fillRect(boxX + 10, boxY + 10, PANEL_WIDTH - 20, PANEL_HEIGHT - 20);

        boxGfx.fillStyle(0xd7c8a9, 1);
        boxGfx.fillRect(boxX + 14, boxY + 14, PANEL_WIDTH - 28, PANEL_HEIGHT - 28);

        this.panelElements.push(boxGfx);

        // Botao fechar no canto superior direito da moldura
        const closeBtn = new GreenButton(scene, {
            x: boxX + PANEL_WIDTH - 36,
            y: boxY + 36,
            width: 34,
            height: 30,
            label: 'X',
            fontSize: '14px',
            depth: this.depth + 4,
            onClick: () => this.close()
        });
        this.buttons.push(closeBtn);

        return { centerX, centerY, boxX, boxY };
    }

    renderQuestion() {
        this.destroyPanelElements();
        const scene = this.scene;
        if (!scene || !this.isOpen) return;

        const question = this.questions[this.currentIndex];
        if (!question) {
            this.renderSummary();
            return;
        }

        this.answeredCurrent = false;
        const { centerX, boxX, boxY } = this.drawPanelFrame();

        // Titulo e contador de progresso
        const title = scene.add.text(centerX - 12, boxY + 34, 'QUIZ DE COMPATIBILIDADE', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#3b2a20',
            align: 'center'
        })).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(title);

        const cityLabel = `Cidade ${this.cityIndex + 1}`;
        const progress = scene.add.text(
            centerX,
            boxY + 58,
            `Pergunta ${this.currentIndex + 1}/${this.questions.length}  •  ${cityLabel}`,
            createTextStyle({
                fontFamily: 'monospace',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#5c4033',
                align: 'center'
            })
        ).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(progress);

        // Enunciado
        const promptText = scene.add.text(centerX, boxY + 110, question.prompt, createTextStyle({
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#2b1b12',
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: PANEL_WIDTH - 56, useAdvancedWrap: true }
        })).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(promptText);

        // Botoes de resposta
        this.optionButtons = [];
        if (question.format === 'yesno') {
            const btnW = 152;
            const btnH = 48;
            const btnY = boxY + 206;
            const offsets = [-86, 86];
            question.options.forEach((opt, idx) => {
                const btn = new GreenButton(scene, {
                    x: centerX + offsets[idx],
                    y: btnY,
                    width: btnW,
                    height: btnH,
                    label: opt,
                    fontSize: '16px',
                    depth: this.depth + 3,
                    onClick: () => this.handleAnswer(opt)
                });
                this.buttons.push(btn);
                this.optionButtons.push({ btn, value: opt });
            });
        } else {
            const btnW = 172;
            const btnH = 46;
            const colOffsets = [-92, 92];
            const rowYs = [boxY + 188, boxY + 244];
            question.options.forEach((opt, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const fontSize = opt.length > 14 ? '11px' : (opt.length > 10 ? '12px' : '14px');
                const btn = new GreenButton(scene, {
                    x: centerX + colOffsets[col],
                    y: rowYs[row],
                    width: btnW,
                    height: btnH,
                    label: opt,
                    fontSize,
                    depth: this.depth + 3,
                    onClick: () => this.handleAnswer(opt)
                });
                this.buttons.push(btn);
                this.optionButtons.push({ btn, value: opt });
            });
        }

        // Area de feedback (preenchida ao responder)
        this.feedbackText = scene.add.text(centerX, boxY + 306, '', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#2b1b12',
            align: 'center',
            lineSpacing: 3,
            wordWrap: { width: PANEL_WIDTH - 48, useAdvancedWrap: true }
        })).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(this.feedbackText);

        this.nextButtonAnchor = { x: centerX, y: boxY + 362, boxX, boxY };
    }

    handleAnswer(selectedOption) {
        if (this.answeredCurrent || !this.isOpen) return;
        const question = this.questions[this.currentIndex];
        if (!question) return;

        this.answeredCurrent = true;
        this.answeredCount++;

        const isCorrect = selectedOption === question.correctAnswer;

        this.optionButtons.forEach(({ btn, value }) => {
            btn.setEnabled(false);
            if (value !== selectedOption && value !== question.correctAnswer) {
                btn.setAlpha(0.55);
            }
        });

        if (isCorrect) {
            this.correctCount++;
            addATP(QUIZ_ATP_PER_CORRECT);
            this.scene.atpDisplay?.update?.();
            playSfx(this.scene, 'acerto');
            this.feedbackText?.setColor?.('#1d6b1d');
            this.feedbackText?.setText?.(`Correto! +${QUIZ_ATP_PER_CORRECT} ATP`);
        } else {
            playSfx(this.scene, 'erro');
            this.feedbackText?.setColor?.('#8b1e1e');
            this.feedbackText?.setText?.(question.explanation);
        }

        const isLast = this.currentIndex >= this.questions.length - 1;
        const nextBtn = new GreenButton(this.scene, {
            x: this.nextButtonAnchor.x,
            y: this.nextButtonAnchor.y,
            width: 210,
            height: 42,
            label: isLast ? 'Ver resultado' : 'Próxima',
            fontSize: '14px',
            depth: this.depth + 3,
            onClick: () => {
                if (isLast) {
                    this.finishRound();
                } else {
                    this.currentIndex++;
                    this.renderQuestion();
                }
            }
        });
        this.buttons.push(nextBtn);
    }

    finishRound() {
        this.roundFinished = true;
        const reward = calculateQuizReward(this.correctCount, this.questions.length);

        if (reward.perfectBonus > 0) {
            addATP(reward.perfectBonus);
            this.scene.atpDisplay?.update?.();
            playSfx(this.scene, 'vitoria');
        }

        startQuizCooldown();
        this.scene?.mapControls?.updateQuizButtonState?.();
        this.renderSummary(reward);
    }

    renderSummary(reward = calculateQuizReward(this.correctCount, this.questions.length)) {
        this.destroyPanelElements();
        const scene = this.scene;
        if (!scene || !this.isOpen) return;

        const { centerX, boxY } = this.drawPanelFrame();

        const title = scene.add.text(centerX - 12, boxY + 42, 'RESULTADO DO QUIZ', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#3b2a20',
            align: 'center'
        })).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(title);

        const scoreText = scene.add.text(
            centerX,
            boxY + 132,
            `Acertos: ${reward.correctCount}/${reward.totalQuestions}`,
            createTextStyle({
                fontFamily: 'monospace',
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#2b1b12',
                align: 'center'
            })
        ).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(scoreText);

        const bonusLine = reward.perfectBonus > 0
            ? `\nBônus perfeito: +${QUIZ_PERFECT_BONUS_ATP} ATP!`
            : '';
        const atpSummary = scene.add.text(
            centerX,
            boxY + 206,
            `ATP ganho: +${reward.totalAtp} ATP${bonusLine}`,
            createTextStyle({
                fontFamily: 'monospace',
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#1d6b1d',
                align: 'center',
                lineSpacing: 6
            })
        ).setOrigin(0.5).setDepth(this.depth + 2);
        this.panelElements.push(atpSummary);

        const closeBtn = new GreenButton(scene, {
            x: centerX,
            y: boxY + 324,
            width: 210,
            height: 46,
            label: 'Fechar',
            fontSize: '15px',
            depth: this.depth + 3,
            onClick: () => this.close()
        });
        this.buttons.push(closeBtn);
    }

    destroy() {
        this.destroyPanelElements();
        this.destroyBackdrop();
        this.isOpen = false;
        this.scene = null;
    }
}
