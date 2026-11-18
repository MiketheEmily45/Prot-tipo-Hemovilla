// Regras do tutorial que dependem do estado do jogo (sem desenhar nada).
import { getSettings } from './settingsStore.js';
import { isCharacterAttended } from './atpStore.js';
import { setOccurrenceClocksFrozen } from './occurrenceState.js';

export const TUTORIAL_CHARACTER_ID = 'joaquim';

let attendanceJustCompleted = false;

export function isTutorialActive() {
    return getSettings().tutorialHintsEnabled === true;
}

export function isTutorialSectionPending(section) {
    const settings = getSettings();
    return settings.tutorialHintsEnabled === true && settings.tutorialProgress[section] !== true;
}

// Os relogios de ocorrencia ficam parados enquanto o tutorial nao termina:
// tutorial ligado, minigame do tutorial ainda nao concluido e Seu Joaquim ainda nao atendido.
// (Se ele ja foi atendido, nada e forcado e os relogios correm normalmente.)
export function shouldFreezeOccurrenceClocks() {
    const settings = getSettings();
    return settings.tutorialHintsEnabled === true
        && settings.tutorialProgress.minigameFase3 !== true
        && !isCharacterAttended(TUTORIAL_CHARACTER_ID);
}

// Aplica a regra acima no occurrenceState (o mesmo congelamento que vale no minigame, por cidade).
// Chamado quando o mapa abre e quando uma secao do tutorial termina ou e pulada.
export function refreshOccurrenceClockFreeze() {
    const frozen = shouldFreezeOccurrenceClocks();
    setOccurrenceClocksFrozen(frozen);
    return frozen;
}

// Marcado pela Fase 3 quando um atendimento termina; o mapa le e limpa ao abrir (secao D).
export function markAttendanceJustCompleted() {
    attendanceJustCompleted = true;
}

export function consumeAttendanceJustCompleted() {
    const value = attendanceJustCompleted;
    attendanceJustCompleted = false;
    return value;
}
