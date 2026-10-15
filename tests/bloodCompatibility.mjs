// Teste da logica de compatibilidade sanguinea (sem Phaser): node tests/bloodCompatibility.mjs
import assert from 'node:assert/strict';

const {
    RH_ENABLED,
    canReceive,
    isContaminated,
    incompatibilityReason,
    drawRound
} = await import('../src/scenes/bloodCompatibility.js');

// 1. Constante padrao
assert.equal(RH_ENABLED, false);

// 2. Todas as combinacoes de paciente e bolsa para ABO (com RH_ENABLED false)
const aboMatrix = {
    A:  { A: true,  B: false, AB: false, O: true },
    B:  { A: false, B: true,  AB: false, O: true },
    AB: { A: true,  B: true,  AB: true,  O: true },
    O:  { A: false, B: false, AB: false, O: true }
};

for (const [patient, bags] of Object.entries(aboMatrix)) {
    for (const [bag, expected] of Object.entries(bags)) {
        assert.equal(canReceive(patient, bag), expected, `${patient} recebendo ${bag}`);
        assert.equal(canReceive(`${patient}+`, `${bag}+`), expected, `${patient}+ recebendo ${bag}+`);
        assert.equal(canReceive(patient, `${bag}+`), expected);
        assert.equal(canReceive(`${patient}+`, bag), expected);

        if (!expected) {
            const reason = incompatibilityReason(patient, bag);
            assert.ok(typeof reason === 'string' && reason.length > 0);
        } else {
            assert.equal(incompatibilityReason(patient, bag), '');
        }
    }
}

// Exemplos especificos de explicacao de erro
assert.equal(
    incompatibilityReason('A', 'B'),
    'O paciente tipo A tem anticorpos Anti-B, então a bolsa B causaria aglutinação.'
);
assert.equal(
    incompatibilityReason('A', 'B+'),
    'O paciente tipo A tem anticorpos Anti-B, então a bolsa B causaria aglutinação.'
);
assert.equal(
    incompatibilityReason('B', 'A'),
    'O paciente tipo B tem anticorpos Anti-A, então a bolsa A causaria aglutinação.'
);
assert.equal(
    incompatibilityReason('O', 'B'),
    'O paciente tipo O tem anticorpos Anti-A e Anti-B, então a bolsa B causaria aglutinação.'
);

// 3. Contaminadas nunca sao compativeis
assert.equal(isContaminated('C+'), true);
assert.equal(isContaminated('C-'), true);
assert.equal(isContaminated('A+'), false);
assert.equal(isContaminated('O-'), false);

for (const type of ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) {
    assert.equal(canReceive(type, 'C+'), false);
    assert.equal(canReceive(type, 'C-'), false);
    assert.equal(canReceive(type, 'C+', { rhEnabled: true }), false);
    assert.equal(canReceive(type, 'C-', { rhEnabled: true }), false);
    assert.equal(incompatibilityReason(type, 'C+'), 'Esta bolsa foi reprovada na triagem.');
    assert.equal(incompatibilityReason(type, 'C-'), 'Esta bolsa foi reprovada na triagem.');
}

// 4. Rh ligado
const all8Bags = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// A- so recebe de A- e O-
for (const bag of all8Bags) {
    const expected = bag === 'A-' || bag === 'O-';
    assert.equal(canReceive('A-', bag, { rhEnabled: true }), expected, `A- recebendo ${bag}`);
    if (!expected) {
        const reason = incompatibilityReason('A-', bag, { rhEnabled: true });
        assert.ok(reason.length > 0);
    }
}

// AB+ recebe de todas as 8
for (const bag of all8Bags) {
    assert.equal(canReceive('AB+', bag, { rhEnabled: true }), true, `AB+ recebendo ${bag}`);
    assert.equal(incompatibilityReason('AB+', bag, { rhEnabled: true }), '');
}

// O- so recebe de O-
for (const bag of all8Bags) {
    const expected = bag === 'O-';
    assert.equal(canReceive('O-', bag, { rhEnabled: true }), expected, `O- recebendo ${bag}`);
    if (!expected) {
        const reason = incompatibilityReason('O-', bag, { rhEnabled: true });
        assert.ok(reason.length > 0);
    }
}

// Motivo de erro por fator Rh
assert.equal(
    incompatibilityReason('A-', 'A+', { rhEnabled: true }),
    'O paciente Rh- não pode receber sangue Rh+, pois geraria anticorpos contra o fator Rh.'
);
assert.equal(
    incompatibilityReason('O-', 'O+', { rhEnabled: true }),
    'O paciente Rh- não pode receber sangue Rh+, pois geraria anticorpos contra o fator Rh.'
);

// 5. drawRound rodado 200 vezes para cada tipo de paciente
// Tipos com bolsas compativeis e incompativeis no sistema ABO (A, B, O)
for (const patientType of ['A', 'B', 'O']) {
    for (let i = 0; i < 200; i++) {
        const round = drawRound({ patientType, count: 4, contaminatedCount: 0 });
        assert.equal(round.length, 4);
        assert.equal(new Set(round).size, 4);
        assert.ok(round.some(b => canReceive(patientType, b)));
        assert.ok(round.some(b => !canReceive(patientType, b)));
        assert.equal(round.filter(isContaminated).length, 0);
    }
}

// Paciente AB: como todas as 4 bolsas ABO sao compativeis, todas sao validas
for (let i = 0; i < 200; i++) {
    const round = drawRound({ patientType: 'AB', count: 4, contaminatedCount: 0 });
    assert.equal(round.length, 4);
    assert.equal(new Set(round).size, 4);
    assert.ok(round.every(b => canReceive('AB', b)));
    assert.equal(round.filter(isContaminated).length, 0);
}

// Com bolsa contaminada (contaminatedCount = 1), todos os tipos tem pelo menos 1 certa e 1 errada
for (const patientType of ['A', 'B', 'AB', 'O']) {
    for (let i = 0; i < 200; i++) {
        const round = drawRound({ patientType, count: 4, contaminatedCount: 1 });
        assert.equal(round.length, 4);
        assert.equal(new Set(round).size, 4);
        assert.ok(round.some(b => canReceive(patientType, b)));
        assert.ok(round.some(b => !canReceive(patientType, b)));
        assert.equal(round.filter(isContaminated).length, 1);
    }
}

// Com Rh ligado, tipos negativos tem compativeis e incompativeis mesmo sem contaminadas
for (const patientType of ['A-', 'B-', 'AB-', 'O-']) {
    for (let i = 0; i < 200; i++) {
        const round = drawRound({ patientType, count: 4, contaminatedCount: 0, rhEnabled: true });
        assert.equal(round.length, 4);
        assert.equal(new Set(round).size, 4);
        assert.ok(round.some(b => canReceive(patientType, b, { rhEnabled: true })));
        assert.ok(round.some(b => !canReceive(patientType, b, { rhEnabled: true })));
        assert.equal(round.filter(isContaminated).length, 0);
    }
}

console.log('OK: compatibilidade ABO/Rh, contaminadas, motivos e sorteio de bolsas.');
