// Controla as legendas do tutorial em uma cena (mapa, minigame ou selecao de cidade).
// Os textos ficam em tutorialSteps.js; o estado (flags) fica nas configuracoes (settingsStore.js).
import { TutorialCaption } from './TutorialCaption.js';
import { TUTORIAL_STEPS, TUTORIAL_SECTION_BLOCKING, TUTORIAL_CAPTION_BOTTOM_Y } from './tutorialSteps.js';
import { getTutorialProgress, updateTutorialProgress, skipTutorial } from './settingsStore.js';
import {
    TUTORIAL_CHARACTER_ID,
    isTutorialActive,
    isTutorialSectionPending,
    refreshOccurrenceClockFreeze,
    consumeAttendanceJustCompleted
} from './tutorialState.js';
import { isCharacterAttended } from './atpStore.js';

// No mapa (512x608) a caixa fica no fim da area da cidade (512 px), acima da barra dos icones.
export const MAP_CAPTION_BOTTOM_Y = 506;

export class TutorialManager {
    constructor(scene, { bottomY = null, depth = undefined } = {}) {
        this.scene = scene;
        this.caption = new TutorialCaption(scene, { bottomY, depth });
        this.currentSection = null;
        scene.events?.once?.('shutdown', () => this.destroy());
    }

    destroy() {
        this.caption?.destroy();
        this.caption = null;
        this.currentSection = null;
    }

    // ===== Nucleo =====

    runSection(section, { startIndex = 0, dismissOnLastPage = true, onStepDone = null, onDone = null } = {}) {
        if (!this.caption) return;
        this.currentSection = section;
        this.caption.show(TUTORIAL_STEPS[section], {
            blocking: TUTORIAL_SECTION_BLOCKING[section],
            dismissOnLastPage,
            startIndex,
            bottomY: TUTORIAL_CAPTION_BOTTOM_Y[section] ?? null,
            onStepDone,
            onComplete: () => {
                this.currentSection = null;
                this.markSeen(section);
                onDone?.();
            },
            onSkip: () => this.skip()
        });
    }

    markSeen(section) {
        updateTutorialProgress({ [section]: true });
        refreshOccurrenceClockFreeze();
    }

    // Botao "Pular tutorial": tudo visto, dicas desligadas, nada forcado depois.
    skip() {
        this.caption?.hide();
        this.currentSection = null;
        skipTutorial();
        refreshOccurrenceClockFreeze();
    }

    // Fecha a secao atual (se houver) marcando-a como vista.
    completeCurrentSection() {
        const section = this.currentSection;
        if (!section) return;
        this.caption?.hide();
        this.currentSection = null;
        this.markSeen(section);
    }

    // ===== Mapa: introducao (A), ocorrencia inicial (B) e depois do 1o atendimento (D) =====

    startMap() {
        const justCompleted = consumeAttendanceJustCompleted();
        refreshOccurrenceClockFreeze();
        if (!isTutorialActive()) return;

        if (justCompleted && !getTutorialProgress().aposPrimeiroAtendimento) {
            this.runSection('aposPrimeiroAtendimento');
            return;
        }
        this.checkMapSections();
    }

    // A introducao e a ocorrencia inicial so acontecem na Cidade 1 (a do Seu Joaquim).
    checkMapSections() {
        if (!isTutorialActive() || !this.caption || this.caption.isOpen) return;
        if ((this.scene.currentCityIndex ?? 0) !== 0) return;

        const progress = getTutorialProgress();
        if (!progress.intro) {
            this.runSection('intro', {
                startIndex: progress.introStep,
                onStepDone: (stepIndex) => updateTutorialProgress({ introStep: stepIndex + 1 }),
                onDone: () => this.startInitialOccurrence()
            });
            return;
        }
        this.startInitialOccurrence();
    }

    // Passo A4 / secao B: so o Seu Joaquim recebe o alerta, so se ele ainda nao foi atendido.
    startInitialOccurrence() {
        if (!isTutorialActive() || (this.scene.currentCityIndex ?? 0) !== 0) return;

        const progress = getTutorialProgress();
        if (progress.aposPrimeiroAtendimento) return;

        if (isCharacterAttended(TUTORIAL_CHARACTER_ID)) {
            // Ex.: tutorial reativado depois do atendimento. Nao forca outra ocorrencia,
            // mas reproduz as legendas informativas finais (incluindo o convite do Quiz).
            if (!progress.ocorrenciaInicial) this.markSeen('ocorrenciaInicial');
            if (!progress.aposPrimeiroAtendimento && !this.caption.isOpen) {
                this.runSection('aposPrimeiroAtendimento');
            }
            return;
        }

        // Se o jogo foi fechado antes de concluir, o alerta volta (em silencio) ao reabrir.
        const firstTime = !progress.ocorrenciaInicial;
        this.scene.clickableCharacterManager?.getAlertManager().triggerCharacter(TUTORIAL_CHARACTER_ID, !firstTime);
        refreshOccurrenceClockFreeze();

        if (firstTime && !this.caption.isOpen) {
            this.runSection('ocorrenciaInicial', { dismissOnLastPage: false });
        }
    }

    // Chamado pela navegacao entre cidades.
    onCityChanged() {
        if (!this.caption) return;
        if (this.currentSection === 'ocorrenciaInicial' && (this.scene.currentCityIndex ?? 0) !== 0) {
            // A legenda fala do Seu Joaquim: esconde fora da Cidade 1 (volta ao retornar).
            this.caption.hide();
            this.currentSection = null;
            return;
        }
        this.checkMapSections();
    }

    // ===== Minigame (C) =====

    startMinigame() {
        if (!isTutorialActive()) return;
        // Abrir o minigame cumpre o passo A4.
        if (!getTutorialProgress().ocorrenciaInicial) this.markSeen('ocorrenciaInicial');
        this.startMinigamePhase('minigameFase1');
    }

    // Cada legenda aparece na primeira vez em que a fase abre.
    startMinigamePhase(section) {
        // A legenda da fase anterior sai quando a fase muda.
        this.completeCurrentSection();
        if (!isTutorialSectionPending(section)) return;
        this.runSection(section);
    }

    // Atendimento concluido: a legenda do minigame, se ainda aberta, e encerrada.
    onAttendanceCompleted() {
        this.completeCurrentSection();
        refreshOccurrenceClockFreeze();
    }

    // ===== Selecao de cidade (E) =====

    startCitySelect() {
        if (!isTutorialSectionPending('selecaoCidade')) return;
        this.runSection('selecaoCidade');
    }
}
