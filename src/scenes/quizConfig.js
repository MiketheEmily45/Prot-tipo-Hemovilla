// Configuracao do Quiz de compatibilidade sanguinea.
// Ajuste os valores aqui para calibrar a economia e o ritmo das rodadas.

export const QUIZ_QUESTIONS_PER_ROUND = 7;
export const QUIZ_ATP_PER_CORRECT = 10;
export const QUIZ_PERFECT_BONUS_ATP = 20;
export let QUIZ_COOLDOWN_MS = 60000;

export function setQuizCooldownMs(ms) {
    if (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0) {
        QUIZ_COOLDOWN_MS = ms;
    }
}
