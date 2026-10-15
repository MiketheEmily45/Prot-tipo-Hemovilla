// Valores ajustaveis do atendimento (alterar aqui para testar o balanceamento).
export const ATTENDANCE_CONFIG = {
    MAX_HEARTS: 3,
    BASE_ATP: 100,
    TIME_BONUS_ATP: 20,
    // Indice = numero de erros; 2 ou mais erros usam o ultimo valor.
    ERROR_MULTIPLIERS: [1.0, 0.75, 0.5],
    // Tempo esperado em segundos.
    EXPECTED_SECONDS_WITH_TYPING: 120,
    EXPECTED_SECONDS_WITHOUT_TYPING: 60
};

export class AttendanceState {
    constructor({ characterId, typeKnown }) {
        this.characterId = characterId;
        this.typeKnown = Boolean(typeKnown);
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

        const multipliers = ATTENDANCE_CONFIG.ERROR_MULTIPLIERS;
        const multiplier = multipliers[Math.min(this.totalErrors, multipliers.length - 1)];
        const expectedSeconds = this.hasTyping
            ? ATTENDANCE_CONFIG.EXPECTED_SECONDS_WITH_TYPING
            : ATTENDANCE_CONFIG.EXPECTED_SECONDS_WITHOUT_TYPING;
        const withinTime = this.elapsedSeconds <= expectedSeconds;
        const atp = Math.round(ATTENDANCE_CONFIG.BASE_ATP * multiplier)
            + (withinTime ? ATTENDANCE_CONFIG.TIME_BONUS_ATP : 0);

        this.phase = 'RESULTADO';

        return { atp, errors: this.totalErrors, withinTime };
    }
}
