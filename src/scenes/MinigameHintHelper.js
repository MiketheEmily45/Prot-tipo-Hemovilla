// Dicas passo a passo no minigame para quem tem pouca familiaridade com jogos:
// imediatas no 1o atendimento (com tutorial ativo) e apos 6s parado nos atendimentos seguintes.
import { createTextStyle } from './textUtils.js';
import { getTutorialProgress } from './settingsStore.js';
import { isTutorialActive } from './tutorialState.js';

export const MINIGAME_HINT_IDLE_MS = 6000;

export const MINIGAME_HINTS = Object.freeze({
    MOVE_TO_CHAIR: 'Arraste a seringa até o paciente na poltrona e solte.',
    FILLING: 'Clique e segure sobre a seringa até ela encher.',
    MOVE_TO_TUBE: 'Arraste a seringa cheia até o tubo na mesinha à direita e solte.',
    ABO_BLOOD: 'Arraste o tubo de sangue até cada poço e solte.',
    ABO_SERUM: 'Arraste o frasco Anti-A ao Poço 1 e o Anti-B ao Poço 2.',
    ABO_MIX: 'Segure o clique e mexa o mouse sobre cada poço para misturar.',
    ABO_DIAGNOSE: 'Observe se houve grumos e clique no tipo sanguíneo abaixo.',
    RH_BLOOD: 'Arraste o tubo de sangue até o Poço 1 e solte.',
    RH_SERUM: 'Arraste o frasco Anti-D até o Poço 1 e solte.',
    RH_MIX: 'Segure o clique e mexa o mouse sobre o Poço 1 para misturar.',
    RH_DIAGNOSE: 'Observe se houve grumos e escolha Rh+ ou Rh− abaixo.',
    TRANSFUSE: 'Arraste a bolsa compatível até o paciente na poltrona e solte.'
});

export function isFirstAttendanceTutorialMode() {
    return isTutorialActive() && !getTutorialProgress().aposPrimeiroAtendimento;
}

export class MinigameHintHelper {
    constructor(scene, { y = 384, depth = 90, idleMs = MINIGAME_HINT_IDLE_MS } = {}) {
        this.scene = scene;
        this.idleMs = idleMs;
        this.currentStepKey = null;
        this.idleElapsedMs = 0;
        this.isVisible = false;

        this.text = scene?.add?.text?.(256, y, '', createTextStyle({
            fontFamily: 'monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fef3c7',
            backgroundColor: 'rgba(20, 14, 10, 0.84)',
            padding: { x: 8, y: 4 },
            align: 'center',
            wordWrap: { width: 460, useAdvancedWrap: true }
        })) ?? null;
        this.text?.setOrigin?.(0.5);
        this.text?.setDepth?.(depth);
        this.text?.setVisible?.(false);
    }

    notifyAction() {
        this.idleElapsedMs = 0;
        if (!isFirstAttendanceTutorialMode()) {
            this.hide();
        }
    }

    show(message) {
        if (!this.text || !message) return;
        if (this.text.text !== message) {
            this.text.setText?.(message);
        }
        this.text.setVisible?.(true);
        this.isVisible = true;
    }

    hide() {
        this.text?.setVisible?.(false);
        this.isVisible = false;
    }

    update(delta = 0, { stepKey = null, suppressed = false } = {}) {
        const message = stepKey ? MINIGAME_HINTS[stepKey] : null;
        if (!message || suppressed) {
            this.hide();
            return;
        }

        if (stepKey !== this.currentStepKey) {
            this.currentStepKey = stepKey;
            this.idleElapsedMs = 0;
        }

        if (isFirstAttendanceTutorialMode()) {
            this.show(message);
            return;
        }

        this.idleElapsedMs += Math.max(0, typeof delta === 'number' ? delta : 0);
        if (this.idleElapsedMs >= this.idleMs) {
            this.show(message);
        } else {
            this.hide();
        }
    }

    destroy() {
        this.text?.destroy?.();
        this.text = null;
        this.scene = null;
        this.isVisible = false;
    }
}
