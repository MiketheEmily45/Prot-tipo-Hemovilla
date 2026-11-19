import { BASE_TEMPO, MULT_CIDADE, BONUS_RAPIDO } from './atpConfig.js';
import { getOccurrence } from './occurrenceState.js';

// Valores ajustaveis do atendimento (constantes de ATP ficam juntas em atpConfig.js).
export const ATTENDANCE_CONFIG = {
    MAX_HEARTS: 3,
    BASE_TEMPO,
    MULT_CIDADE,
    BONUS_RAPIDO,
    // Indice = numero de erros; 2 ou mais erros usam o ultimo valor.
    ERROR_MULTIPLIERS: [1.0, 0.75, 0.5],
    // Tempo esperado em segundos.
    EXPECTED_SECONDS_WITH_TYPING: 120,
    EXPECTED_SECONDS_WITHOUT_TYPING: 60
};

export function round5(value) {
    return Math.round(value / 5) * 5;
}

export function resolveBaseAtp(intervalMinutes) {
    if (typeof intervalMinutes === 'number' && Number.isFinite(intervalMinutes) && intervalMinutes in BASE_TEMPO) {
        return BASE_TEMPO[intervalMinutes];
    }

    const keys = Object.keys(BASE_TEMPO)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

    if (keys.length === 0) {
        return 0;
    }

    if (typeof intervalMinutes !== 'number' || !Number.isFinite(intervalMinutes)) {
        return BASE_TEMPO[keys[0]];
    }

    let closestKey = keys[0];
    let minDiff = Math.abs(intervalMinutes - closestKey);
    for (let i = 1; i < keys.length; i++) {
        const diff = Math.abs(intervalMinutes - keys[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closestKey = keys[i];
        }
    }

    return BASE_TEMPO[closestKey];
}

export function resolveCityMultiplier(city) {
    if (typeof city === 'number' && Number.isFinite(city) && city in MULT_CIDADE) {
        return MULT_CIDADE[city];
    }

    return MULT_CIDADE[1] ?? 1.0;
}

export function calculateAttendanceATP({ characterIntervalMinutes, errors = 0, city = 1, withinTime = false }) {
    const base = resolveBaseAtp(characterIntervalMinutes);
    const multipliers = ATTENDANCE_CONFIG.ERROR_MULTIPLIERS;
    const performance = multipliers[Math.min(Math.max(0, errors), multipliers.length - 1)];
    const cityMult = resolveCityMultiplier(city);
    const bonus = withinTime ? BONUS_RAPIDO : 0;

    return round5(base * performance * cityMult) + bonus;
}

export class AttendanceState {
    constructor({ characterId, typeKnown, cityIndex, city, characterIntervalMinutes } = {}) {
        const occurrence = getOccurrence(characterId);

        this.characterId = characterId;
        this.typeKnown = Boolean(typeKnown);
        this.city = typeof city === 'number'
            ? city
            : (typeof cityIndex === 'number'
                ? cityIndex + 1
                : (occurrence && typeof occurrence.cityIndex === 'number' ? occurrence.cityIndex + 1 : 1));
        this.characterIntervalMinutes = typeof characterIntervalMinutes === 'number'
            ? characterIntervalMinutes
            : (occurrence && typeof occurrence.intervalMs === 'number' ? occurrence.intervalMs / 60000 : 1);
        this.phase = 'COLETA';
        this.hasTyping = !this.typeKnown;
        this.exposedHearts = ATTENDANCE_CONFIG.MAX_HEARTS;
        this.totalErrors = 0;
        this.elapsedMs = 0;
        this.isClockRunning = true;
    }

    get hearts() {
        return this.exposedHearts;
    }

    get errors() {
        return this.totalErrors;
    }

    get isFailed() {
        return this.exposedHearts <= 0;
    }

    get elapsedSeconds() {
        return this.elapsedMs / 1000;
    }

    advance() {
        if (this.phase === 'COLETA') {
            this.phase = this.typeKnown ? 'TRANSFUSAO' : 'TIPAGEM';
        } else if (this.phase === 'TIPAGEM') {
            this.phase = 'TRANSFUSAO';
        } else if (this.phase === 'TRANSFUSAO') {
            this.phase = 'RESULTADO';
        }

        return this.phase;
    }

    registerError() {
        this.exposedHearts = Math.max(0, this.exposedHearts - 1);
        this.totalErrors += 1;

        return { hearts: this.exposedHearts, failed: this.isFailed };
    }

    retry() {
        // Restaura os coracoes, mas mantem erros e fase atual.
        this.exposedHearts = ATTENDANCE_CONFIG.MAX_HEARTS;
    }

    update(deltaMs) {
        if (!this.isClockRunning) {
            return;
        }

        this.elapsedMs += deltaMs;
    }

    pause() {
        this.isClockRunning = false;
    }

    resume() {
        this.isClockRunning = true;
    }

    complete() {
        if (this.phase !== 'TRANSFUSAO') {
            throw new Error('complete() so pode ser chamado na fase TRANSFUSAO.');
        }

        if (this.isFailed) {
            throw new Error('Atendimento falhou: use retry() antes de concluir.');
        }

        const expectedSeconds = this.hasTyping
            ? ATTENDANCE_CONFIG.EXPECTED_SECONDS_WITH_TYPING
            : ATTENDANCE_CONFIG.EXPECTED_SECONDS_WITHOUT_TYPING;
        const withinTime = this.elapsedSeconds <= expectedSeconds;
        const atp = calculateAttendanceATP({
            characterIntervalMinutes: this.characterIntervalMinutes,
            errors: this.totalErrors,
            city: this.city,
            withinTime
        });

        this.phase = 'RESULTADO';

        return { atp, errors: this.totalErrors, withinTime };
    }
}
