// Teste unitario do Quiz de compatibilidade sanguinea (geracao por cidade,
// unicidade, correcao biologica, recompensa de ATP e cooldown):
//   node tests/quiz.mjs
import assert from 'node:assert/strict';

const {
    QUIZ_QUESTIONS_PER_ROUND,
    QUIZ_ATP_PER_CORRECT,
    QUIZ_PERFECT_BONUS_ATP,
    QUIZ_COOLDOWN_MS,
    setQuizCooldownMs
} = await import('../src/scenes/quizConfig.js');
const {
    generateQuizRound,
    calculateQuizReward,
    startQuizCooldown,
    getQuizCooldownRemainingMs,
    getQuizCooldownRemainingSeconds,
    isQuizOnCooldown,
    resetQuizCooldown,
    startOrResumeQuizSession,
    getActiveQuizSession,
    recordQuizAnswer,
    advanceActiveQuizQuestion,
    completeActiveQuizSession,
    getQuizProgressDisplay,
    resetQuizState
} = await import('../src/scenes/quizLogic.js');
const { canReceive } = await import('../src/scenes/bloodCompatibility.js');

// 1. Constantes padrao de configuracao.
assert.equal(QUIZ_QUESTIONS_PER_ROUND, 7);
assert.equal(QUIZ_ATP_PER_CORRECT, 10);
assert.equal(QUIZ_PERFECT_BONUS_ATP, 20);
assert.equal(QUIZ_COOLDOWN_MS, 60000);

// 2. Geracao de rodadas por cidade (30 rodadas por cidade para cobrir variacao aleatoria).
for (const cityIndex of [0, 1, 2]) {
    let sawDonate = false;
    let sawReceive = false;
    let sawYesNo = false;
    let sawContaminated = false;

    for (let r = 0; r < 30; r++) {
        const round = generateQuizRound({ cityIndex });
        assert.equal(round.length, 7, `Cidade ${cityIndex + 1}: rodada deve ter 7 perguntas`);

        // Sem repeticao na mesma rodada
        const keys = new Set(round.map((q) => q.key));
        assert.equal(keys.size, 7, `Cidade ${cityIndex + 1}: nao pode repetir pergunta na rodada`);
        const prompts = new Set(round.map((q) => q.prompt));
        assert.equal(prompts.size, 7, `Cidade ${cityIndex + 1}: enunciados devem ser unicos`);

        for (const q of round) {
            assert.ok(q.prompt && q.prompt.length > 10, 'enunciado valido');
            assert.ok(q.explanation && q.explanation.length > 10, 'explicacao curta valida');
            assert.ok(q.options.includes(q.correctAnswer), 'resposta correta deve estar nas opcoes');
            assert.equal(new Set(q.options).size, q.options.length, 'opcoes sem duplicatas');

            if (q.format === 'yesno') {
                assert.deepEqual(q.options, ['Sim', 'Não']);
            } else {
                assert.equal(q.format, 'choice4');
                assert.equal(q.options.length, 4);
            }

            if (q.kind === 'whoCanDonateTo') sawDonate = true;
            if (q.kind === 'whoCanReceiveFrom') sawReceive = true;
            if (q.kind === 'canReceiveYesNo') sawYesNo = true;
            if (q.kind === 'contaminated') sawContaminated = true;

            // Regras especificas por cidade:
            if (cityIndex === 0) {
                assert.notEqual(q.kind, 'contaminated', 'Cidade 1 nao tem perguntas de bolsa contaminada');
                assert.ok(!/[+-]/.test(q.prompt), `Cidade 1 e so ABO (sem Rh): "${q.prompt}"`);
                assert.ok(q.options.every((opt) => !/[+-]/.test(opt)), `Cidade 1 opcoes sem Rh: ${q.options}`);
            }

            if (cityIndex === 1) {
                assert.notEqual(q.kind, 'contaminated', 'Cidade 2 nao tem perguntas de bolsa contaminada');
                // Todas as perguntas da Cidade 2 envolvem tipos com Rh (+ ou -)
                assert.ok(/[+-]/.test(q.prompt), `Cidade 2 inclui Rh no enunciado: "${q.prompt}"`);
            }

            // Validacao biologica das perguntas Sim/Nao de compatibilidade:
            if (q.kind === 'canReceiveYesNo') {
                const match = q.prompt.match(/paciente ([ABO]+[+-]?) pode receber sangue ([ABO]+[+-]?)\?/);
                assert.ok(match, `Formato esperado no enunciado: "${q.prompt}"`);
                const [, patient, donor] = match;
                const expected = canReceive(patient, donor, { rhEnabled: cityIndex > 0 }) ? 'Sim' : 'Não';
                assert.equal(q.correctAnswer, expected, `Biologia correta para ${patient} <- ${donor}`);
            }

            // Validacao biologica das perguntas de 4 opcoes com Rh (Cidades 2 e 3):
            if (cityIndex > 0 && q.kind === 'whoCanDonateTo') {
                const match = q.prompt.match(/paciente ([ABO]+[+-])\?/);
                assert.ok(match, `Enunciado Rh donate: "${q.prompt}"`);
                const patient = match[1];
                assert.equal(canReceive(patient, q.correctAnswer, { rhEnabled: true }), true);
                const wrongs = q.options.filter((opt) => opt !== q.correctAnswer);
                assert.ok(wrongs.every((w) => !canReceive(patient, w, { rhEnabled: true })), '3 alternativas erradas devem ser incompativeis');
            }

            if (cityIndex > 0 && q.kind === 'whoCanReceiveFrom') {
                const match = q.prompt.match(/tipo ([ABO]+[+-])\?/);
                assert.ok(match, `Enunciado Rh receive: "${q.prompt}"`);
                const donor = match[1];
                assert.equal(canReceive(q.correctAnswer, donor, { rhEnabled: true }), true);
                const wrongs = q.options.filter((opt) => opt !== q.correctAnswer);
                assert.ok(wrongs.every((w) => !canReceive(w, donor, { rhEnabled: true })), '3 alternativas erradas devem ser incompativeis');
            }

            // Validacao das perguntas de bolsa contaminada (Cidade 3):
            if (q.kind === 'contaminated' && q.format === 'yesno') {
                assert.equal(q.correctAnswer, 'Não', 'Bolsa contaminada nunca pode ser usada');
            }
        }

        if (cityIndex === 2) {
            assert.ok(round.some((q) => q.kind === 'contaminated'), 'Cidade 3 deve incluir ao menos 1 pergunta de bolsa contaminada por rodada');
        }
    }

    assert.ok(sawDonate, `Cidade ${cityIndex + 1}: gera perguntas de doacao`);
    assert.ok(sawReceive, `Cidade ${cityIndex + 1}: gera perguntas de recepcao`);
    assert.ok(sawYesNo, `Cidade ${cityIndex + 1}: gera perguntas Sim/Nao`);
    assert.equal(sawContaminated, cityIndex === 2, `Cidade ${cityIndex + 1}: contaminadas apenas na Cidade 3`);
}

// 3. Recompensa de ATP (10 por acerto + 20 de bonus se acertar as 7).
assert.deepEqual(calculateQuizReward(0, 7), { correctCount: 0, totalQuestions: 7, baseAtp: 0, perfectBonus: 0, totalAtp: 0 });
assert.deepEqual(calculateQuizReward(5, 7), { correctCount: 5, totalQuestions: 7, baseAtp: 50, perfectBonus: 0, totalAtp: 50 });
assert.deepEqual(calculateQuizReward(6, 7), { correctCount: 6, totalQuestions: 7, baseAtp: 60, perfectBonus: 0, totalAtp: 60 });
assert.deepEqual(calculateQuizReward(7, 7), { correctCount: 7, totalQuestions: 7, baseAtp: 70, perfectBonus: 20, totalAtp: 90 });

// 4. Cooldown configuravel.
resetQuizCooldown();
assert.equal(isQuizOnCooldown(1000), false);
assert.equal(getQuizCooldownRemainingSeconds(1000), 0);

startQuizCooldown(10000);
assert.equal(isQuizOnCooldown(10000), true);
assert.equal(getQuizCooldownRemainingMs(10000), 60000);
assert.equal(getQuizCooldownRemainingSeconds(10000), 60);
assert.equal(getQuizCooldownRemainingSeconds(10000 + 59100), 1);
assert.equal(isQuizOnCooldown(10000 + 60000), false);
assert.equal(getQuizCooldownRemainingSeconds(10000 + 60000), 0);

// Reducao temporaria da constante (para testes)
setQuizCooldownMs(3000);
startQuizCooldown(50000);
assert.equal(getQuizCooldownRemainingSeconds(50000), 3);
assert.equal(isQuizOnCooldown(53000), false);
setQuizCooldownMs(60000);
resetQuizState();

// 5. Retomada de rodada em andamento: fechar e reabrir no meio, mesma rodada ao trocar de cidade,
//    cooldown so ao terminar, bonus so no 7/7 e descarte ao ZERAR (resetQuizState).
const session1 = startOrResumeQuizSession({ cityIndex: 0 });
const originalKeys = session1.questions.map((q) => q.key);
assert.equal(originalKeys.length, 7);
assert.deepEqual(getQuizProgressDisplay(), { current: 1, total: 7 });

// Responde Q1 certo e avanca para Q2
const r1 = recordQuizAnswer(session1.questions[0].correctAnswer);
assert.equal(r1.isCorrect, true);
assert.equal(r1.atpEarned, 10);
advanceActiveQuizQuestion();

// Responde Q2 certo e "fecha" com a explicacao ainda na tela (sem clicar Proxima)
const r2 = recordQuizAnswer(session1.questions[1].correctAnswer);
assert.equal(r2.isCorrect, true);
assert.equal(r2.atpEarned, 10);
assert.equal(isQuizOnCooldown(), false, 'fechar no meio nao inicia intervalo de 60 s');
assert.deepEqual(getQuizProgressDisplay(), { current: 3, total: 7 }, 'botao mostra Quiz 3/7');

// Reabre (mesmo em outra cidade): mantem as mesmas 7 perguntas e ja abre na Q3 (indice 2)
const resumed = startOrResumeQuizSession({ cityIndex: 2 });
assert.deepEqual(resumed.questions.map((q) => q.key), originalKeys, 'nao sorteia perguntas de novo');
assert.equal(resumed.cityIndex, 0, 'mantem a rodada original mesmo trocando de cidade');
assert.equal(resumed.currentIndex, 2, 'retoma na 3a pergunta (indice 2)');
assert.equal(resumed.correctCount, 2);
assert.equal(resumed.paidAtp, 20);
assert.equal(resumed.answeredCurrent, false);

// Responde Q3..Q7 todas certas (7/7) e conclui: bonus de 20 ATP + inicia intervalo de 60 s
for (let i = 2; i < 7; i++) {
    const res = recordQuizAnswer(resumed.questions[i].correctAnswer);
    assert.equal(res.isCorrect, true);
    if (i < 6) advanceActiveQuizQuestion();
}
const finalReward = completeActiveQuizSession(100000);
assert.deepEqual(finalReward, { correctCount: 7, totalQuestions: 7, baseAtp: 70, perfectBonus: 20, totalAtp: 90 });
assert.equal(getActiveQuizSession(), null, 'rodada encerrada');
assert.equal(isQuizOnCooldown(100000), true, 'intervalo de 60 s inicia ao terminar a rodada');
assert.equal(getQuizCooldownRemainingSeconds(100000), 60);

// Descarte ao ZERAR (resetQuizState)
resetQuizState();
assert.equal(isQuizOnCooldown(100000), false);
const sessionToDiscard = startOrResumeQuizSession({ cityIndex: 1 });
recordQuizAnswer(sessionToDiscard.questions[0].correctAnswer);
assert.ok(getActiveQuizSession() !== null);
resetQuizState();
assert.equal(getActiveQuizSession(), null, 'rodada em andamento descartada no ZERAR');
assert.equal(getQuizProgressDisplay(), null);

console.log('OK: quiz de compatibilidade (Cidades 1-3, unicidade, biologia, retomada de rodada, ATP com bonus 7/7, cooldown e ZERAR).');
