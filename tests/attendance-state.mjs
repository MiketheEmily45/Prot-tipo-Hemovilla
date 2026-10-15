// Teste da logica pura do atendimento (sem Phaser): node tests/attendance-state.mjs
import assert from 'node:assert/strict';

const { AttendanceState } = await import('../src/scenes/AttendanceState.js');

// Conclui um atendimento com tipagem em transfusao, com n erros e tempo em segundos.
const finish = ({ typeKnown = false, errors = 0, seconds = 10 } = {}) => {
    const state = new AttendanceState({ characterId: 'bruno', typeKnown });
    state.advance();
    if (!typeKnown) state.advance();
    for (let i = 0; i < errors; i++) {
        state.registerError();
        if (state.isFailed) state.retry();
    }
    state.update(seconds * 1000);
    return state.complete();
};

// 1. Fluxo com tipagem.
const typed = new AttendanceState({ characterId: 'bruno', typeKnown: false });
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

// 3. ATP com 0, 1 e 2 erros, com e sem bonus de tempo.
assert.deepEqual(finish({ errors: 0, seconds: 120 }), { atp: 120, errors: 0, withinTime: true });
assert.deepEqual(finish({ errors: 0, seconds: 120.1 }), { atp: 100, errors: 0, withinTime: false });
assert.deepEqual(finish({ errors: 1, seconds: 10 }), { atp: 95, errors: 1, withinTime: true });
assert.deepEqual(finish({ errors: 1, seconds: 200 }), { atp: 75, errors: 1, withinTime: false });
assert.deepEqual(finish({ errors: 2, seconds: 10 }), { atp: 70, errors: 2, withinTime: true });
assert.deepEqual(finish({ errors: 2, seconds: 200 }), { atp: 50, errors: 2, withinTime: false });
// Sem tipagem o tempo esperado cai para 60 s.
assert.equal(finish({ typeKnown: true, seconds: 60 }).withinTime, true);
assert.equal(finish({ typeKnown: true, seconds: 61 }).withinTime, false);
assert.equal(finish({ typeKnown: false, seconds: 61 }).withinTime, true);

// 4. Falha com 3 erros, retry mantem erros e ATP maximo cai para 50%.
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
assert.deepEqual(failing.complete(), { atp: 70, errors: 3, withinTime: true });

// 5. Pausa do relogio.
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
