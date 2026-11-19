// Teste da logica pura do atendimento (sem Phaser): node tests/attendance-state.mjs
import assert from 'node:assert/strict';

const {
    AttendanceState,
    round5,
    resolveBaseAtp,
    calculateAttendanceATP
} = await import('../src/scenes/AttendanceState.js');

// Conclui um atendimento em transfusao, com personagem, erros e tempo em segundos.
const finish = ({ characterId = 'joaquim', typeKnown = false, errors = 0, seconds = 10, city, characterIntervalMinutes } = {}) => {
    const state = new AttendanceState({ characterId, typeKnown, city, characterIntervalMinutes });
    state.advance();
    if (!typeKnown) state.advance();
    for (let i = 0; i < errors; i++) {
        state.registerError();
        if (state.isFailed) state.retry();
    }
    state.update(seconds * 1000);
    return state.complete();
};

// 1. Fluxo com tipagem (Seu Joaquim: Cidade 1, 1 min -> 120 ATP em atendimento rapido sem erros).
const typed = new AttendanceState({ characterId: 'joaquim', typeKnown: false });
assert.equal(typed.phase, 'COLETA');
typed.advance();
assert.equal(typed.phase, 'TIPAGEM');
typed.advance();
assert.equal(typed.phase, 'TRANSFUSAO');
assert.throws(() => new AttendanceState({ characterId: 'x', typeKnown: false }).complete());
const typedResult = typed.complete();
assert.equal(typed.phase, 'RESULTADO');
assert.deepEqual(typedResult, { atp: 120, errors: 0, withinTime: true });

// 2. Fluxo sem tipagem pula TIPAGEM.
const known = new AttendanceState({ characterId: 'beatriz', typeKnown: true });
assert.equal(known.phase, 'COLETA');
known.advance();
assert.equal(known.phase, 'TRANSFUSAO');
known.advance();
assert.equal(known.phase, 'RESULTADO');

// 3. ATP do Seu Joaquim (Cidade 1, 1 min) com 0, 1 e 2 erros, com e sem bonus de tempo.
assert.deepEqual(finish({ characterId: 'joaquim', errors: 0, seconds: 120 }), { atp: 120, errors: 0, withinTime: true });
assert.deepEqual(finish({ characterId: 'joaquim', errors: 0, seconds: 120.1 }), { atp: 100, errors: 0, withinTime: false });
assert.deepEqual(finish({ characterId: 'joaquim', errors: 1, seconds: 10 }), { atp: 95, errors: 1, withinTime: true });
assert.deepEqual(finish({ characterId: 'joaquim', errors: 1, seconds: 200 }), { atp: 75, errors: 1, withinTime: false });
assert.deepEqual(finish({ characterId: 'joaquim', errors: 2, seconds: 10 }), { atp: 70, errors: 2, withinTime: true });
assert.deepEqual(finish({ characterId: 'joaquim', errors: 2, seconds: 200 }), { atp: 50, errors: 2, withinTime: false });

// Sem tipagem o tempo esperado cai para 60 s.
assert.equal(finish({ characterId: 'joaquim', typeKnown: true, seconds: 60 }).withinTime, true);
assert.equal(finish({ characterId: 'joaquim', typeKnown: true, seconds: 61 }).withinTime, false);
assert.equal(finish({ characterId: 'joaquim', typeKnown: false, seconds: 61 }).withinTime, true);

// 4. Formula por intervalo (1, 2 e 4 min), cidade (1, 2 e 3) e arredondamento round5.
// Cidade 1 (x1.0): Marlene (2 min, base 125) e Aparecida (4 min, base 175).
assert.equal(finish({ characterId: 'marlene', errors: 0, seconds: 10 }).atp, 145);     // round5(125) + 20
assert.equal(finish({ characterId: 'marlene', errors: 1, seconds: 200 }).atp, 95);     // round5(93.75) = 95
assert.equal(finish({ characterId: 'marlene', errors: 2, seconds: 200 }).atp, 65);     // round5(62.5) = 65
assert.equal(finish({ characterId: 'aparecida', errors: 0, seconds: 10 }).atp, 195);   // round5(175) + 20
assert.equal(finish({ characterId: 'aparecida', errors: 1, seconds: 200 }).atp, 130);  // round5(131.25) = 130
assert.equal(finish({ characterId: 'aparecida', errors: 2, seconds: 200 }).atp, 90);   // round5(87.5) = 90

// Cidade 2 (x1.5): Bruno (1 min), Beatriz (2 min), Carlos (4 min).
assert.equal(finish({ characterId: 'bruno', errors: 0, seconds: 10 }).atp, 170);       // round5(150) + 20
assert.equal(finish({ characterId: 'bruno', errors: 1, seconds: 200 }).atp, 115);      // round5(112.5) = 115
assert.equal(finish({ characterId: 'beatriz', errors: 0, seconds: 10 }).atp, 210);     // round5(187.5) + 20 = 190 + 20
assert.equal(finish({ characterId: 'beatriz', errors: 1, seconds: 200 }).atp, 140);    // round5(140.625) = 140
assert.equal(finish({ characterId: 'carlos', errors: 0, seconds: 10 }).atp, 285);      // round5(262.5) + 20 = 265 + 20
assert.equal(finish({ characterId: 'carlos', errors: 1, seconds: 200 }).atp, 195);     // round5(196.875) = 195

// Cidade 3 (x2.0): Caue (1 min), Yasmin (2 min), Teo (4 min).
assert.equal(finish({ characterId: 'caue', errors: 0, seconds: 10 }).atp, 220);        // round5(200) + 20
assert.equal(finish({ characterId: 'yasmin', errors: 0, seconds: 10 }).atp, 270);      // round5(250) + 20
assert.equal(finish({ characterId: 'yasmin', errors: 1, seconds: 200 }).atp, 190);     // round5(187.5) = 190
assert.equal(finish({ characterId: 'teo', errors: 0, seconds: 10 }).atp, 370);         // round5(350) + 20
assert.equal(finish({ characterId: 'teo', errors: 1, seconds: 200 }).atp, 265);        // round5(262.5) = 265
assert.equal(finish({ characterId: 'teo', errors: 2, seconds: 10 }).atp, 195);         // round5(175) + 20

// 5. Fallback para intervalo fora da tabela { 1, 2, 4 } usa o mais proximo.
assert.equal(round5(93.75), 95);
assert.equal(round5(131.25), 130);
assert.equal(resolveBaseAtp(0.5), 100);  // mais proximo de 1
assert.equal(resolveBaseAtp(1.4), 100);  // mais proximo de 1
assert.equal(resolveBaseAtp(1.6), 125);  // mais proximo de 2
assert.equal(resolveBaseAtp(2.5), 125);  // mais proximo de 2
assert.equal(resolveBaseAtp(3), 125);    // empate 2 vs 4 -> menor chave (2)
assert.equal(resolveBaseAtp(3.5), 175);  // mais proximo de 4
assert.equal(resolveBaseAtp(6), 175);    // mais proximo de 4
assert.equal(
    calculateAttendanceATP({ characterIntervalMinutes: 3.5, errors: 0, city: 1, withinTime: true }),
    195
);

// 6. Falha com 3 erros, retry mantem erros e desempenho cai para 50%.
// Carlos: Cidade 2 (x1.5), 4 min (base 175) -> round5(175 * 0.5 * 1.5) + 20 = round5(131.25) + 20 = 150.
const failing = new AttendanceState({ characterId: 'carlos', typeKnown: true });
failing.advance();
assert.deepEqual(failing.registerError(), { hearts: 2, failed: false });
assert.deepEqual(failing.registerError(), { hearts: 1, failed: false });
assert.deepEqual(failing.registerError(), { hearts: 0, failed: true });
assert.equal(failing.isFailed, true);
assert.throws(() => failing.complete());
failing.retry();
assert.equal(failing.hearts, 3);
assert.equal(failing.errors, 3);
assert.equal(failing.isFailed, false);
assert.equal(failing.phase, 'TRANSFUSAO');
failing.update(1000);
assert.deepEqual(failing.complete(), { atp: 150, errors: 3, withinTime: true });

// 7. Pausa do relogio.
const clock = new AttendanceState({ characterId: 'teo', typeKnown: true });
clock.update(1000);
assert.equal(clock.elapsedSeconds, 1);
clock.pause();
clock.update(5000);
assert.equal(clock.elapsedSeconds, 1);
clock.resume();
clock.update(500);
assert.equal(clock.elapsedSeconds, 1.5);

console.log('OK: fases, ATP, falha/retry e relogio do atendimento.');
