// Teste unitario dos tipos de ocorrencia por cidade (Rh, bolsas contaminadas, erro e ATP):
//   node tests/city-occurrences.mjs
import assert from 'node:assert/strict';

const {
    CITY_CHARACTER_IDS,
    RH_NEGATIVE_COUNT_BY_CITY,
    RH_ENABLED_BY_CITY,
    CONTAMINATED_BAGS_BY_CITY,
    NORMAL_BAGS_PER_ROUND,
    getCityOccurrenceRules,
    getCharacterOccurrenceRules,
    resolveBloodTypeWithRh
} = await import('../src/scenes/cityOccurrenceConfig.js');
const { characterData } = await import('../src/scenes/characterData.js');
const { MINIGAME_ASSETS } = await import('../src/scenes/minigameAssets.js');
const { canReceive, isContaminated, incompatibilityReason, drawRound } = await import('../src/scenes/bloodCompatibility.js');
const { AttendanceState } = await import('../src/scenes/AttendanceState.js');

// 1. Constantes de configuracao por cidade.
assert.deepEqual(CITY_CHARACTER_IDS[1], ['joaquim', 'marlene', 'aparecida']);
assert.deepEqual(CITY_CHARACTER_IDS[2], ['bruno', 'beatriz', 'carlos']);
assert.deepEqual(CITY_CHARACTER_IDS[3], ['caue', 'yasmin', 'teo']);
assert.deepEqual(RH_NEGATIVE_COUNT_BY_CITY, { 1: 0, 2: 2, 3: 3 });
assert.deepEqual(RH_ENABLED_BY_CITY, { 1: false, 2: true, 3: true });
assert.deepEqual(CONTAMINATED_BAGS_BY_CITY, { 1: 0, 2: 0, 3: 1 });
assert.equal(NORMAL_BAGS_PER_ROUND, 4);

// 2. Regras por cidade (0-based cityIndex).
const c1 = getCityOccurrenceRules(0);
assert.equal(c1.city, 1);
assert.equal(c1.rhEnabled, false);
assert.equal(c1.rhNegativeCount, 0);
assert.deepEqual(c1.rhNegativeCharacters, []);
assert.equal(c1.contaminatedBags, 0);
assert.equal(c1.totalBags, 4);

const c2 = getCityOccurrenceRules(1);
assert.equal(c2.city, 2);
assert.equal(c2.rhEnabled, true);
assert.equal(c2.rhNegativeCount, 2);
assert.deepEqual(c2.rhNegativeCharacters, ['bruno', 'carlos']);
assert.equal(c2.contaminatedBags, 0);
assert.equal(c2.totalBags, 4);

const c3 = getCityOccurrenceRules(2);
assert.equal(c3.city, 3);
assert.equal(c3.rhEnabled, true);
assert.equal(c3.rhNegativeCount, 3);
assert.deepEqual(c3.rhNegativeCharacters, ['caue', 'yasmin', 'teo']);
assert.equal(c3.contaminatedBags, 1);
assert.equal(c3.totalBags, 5);

// 3. Tipos sanguineos completos dos 9 personagens.
const expectedTypes = {
    joaquim: 'O+',
    marlene: 'A+',
    aparecida: 'B+',
    bruno: 'O-',
    beatriz: 'AB+',
    carlos: 'A-',
    caue: 'B-',
    yasmin: 'O-',
    teo: 'AB-'
};

for (const [id, expected] of Object.entries(expectedTypes)) {
    const resolved = resolveBloodTypeWithRh(id, characterData[id].tipoSanguineo);
    assert.equal(resolved, expected, `${id} deve ser ${expected}`);
    assert.equal(characterData[id].tipoSanguineo, expected, `characterData.${id} deve ser ${expected}`);
}

// 4. Todas as 10 bolsas estao mapeadas para assets/Minigame/BolsasDeSangue/*.png (incluindo CPos e CNeg).
const expectedAssets = {
    'bolsa-A+': 'assets/Minigame/BolsasDeSangue/APos.png',
    'bolsa-A-': 'assets/Minigame/BolsasDeSangue/ANeg.png',
    'bolsa-B+': 'assets/Minigame/BolsasDeSangue/BPos.png',
    'bolsa-B-': 'assets/Minigame/BolsasDeSangue/BNeg.png',
    'bolsa-AB+': 'assets/Minigame/BolsasDeSangue/ABPos.png',
    'bolsa-AB-': 'assets/Minigame/BolsasDeSangue/ABNeg.png',
    'bolsa-O+': 'assets/Minigame/BolsasDeSangue/OPos.png',
    'bolsa-O-': 'assets/Minigame/BolsasDeSangue/ONeg.png',
    'bolsa-C+': 'assets/Minigame/BolsasDeSangue/CPos.png',
    'bolsa-C-': 'assets/Minigame/BolsasDeSangue/CNeg.png'
};
for (const [key, path] of Object.entries(expectedAssets)) {
    assert.equal(MINIGAME_ASSETS[key], path);
}

// 5. Sorteio de bolsas por cidade (100 rodadas por personagem).
for (const [id, patientType] of Object.entries(expectedTypes)) {
    const rules = getCharacterOccurrenceRules(id);
    for (let i = 0; i < 100; i++) {
        const bags = drawRound({
            patientType,
            count: rules.totalBags,
            contaminatedCount: rules.contaminatedBags,
            rhEnabled: rules.rhEnabled
        });

        assert.equal(bags.length, rules.totalBags, `${id}: total de bolsas`);
        assert.equal(new Set(bags).size, rules.totalBags, `${id}: bolsas unicas`);
        assert.equal(bags.filter(isContaminated).length, rules.contaminatedBags, `${id}: contaminadas`);
        assert.ok(bags.every((b) => Boolean(MINIGAME_ASSETS[`bolsa-${b}`])), `${id}: textura existente`);
        assert.ok(bags.some((b) => canReceive(patientType, b, { rhEnabled: rules.rhEnabled })), `${id}: >=1 compativel`);

        if (rules.city === 1) {
            assert.ok(bags.every((b) => b.endsWith('+')), 'Cidade 1 so sorteia bolsas Rh+');
        }
        if (rules.city === 2) {
            assert.equal(bags.filter(isContaminated).length, 0, 'Cidade 2 sem contaminadas');
        }
        if (rules.city === 3) {
            assert.equal(bags.filter(isContaminated).length, 1, 'Cidade 3 tem 1 contaminada extra');
            assert.equal(bags.length, 5, 'Cidade 3 tem 5 bolsas na prateleira (4 normais + 1 contaminada)');
        }
    }
}

// 6. Escolher bolsa contaminada conta como erro e afeta desempenho (100%/75%/50%) e ATP.
const simulateWithContaminatedErrors = (characterId, contaminatedPicks) => {
    const rules = getCharacterOccurrenceRules(characterId);
    const patientType = resolveBloodTypeWithRh(characterId, characterData[characterId].tipoSanguineo, rules.city);
    const state = new AttendanceState({ characterId, city: rules.city, typeKnown: false });
    state.advance(); // TIPAGEM
    state.advance(); // TRANSFUSAO

    for (let i = 0; i < contaminatedPicks; i++) {
        assert.equal(canReceive(patientType, 'C+', { rhEnabled: rules.rhEnabled }), false);
        assert.equal(incompatibilityReason(patientType, 'C+', { rhEnabled: rules.rhEnabled }), 'Esta bolsa foi reprovada na triagem.');
        state.registerError();
        if (state.isFailed) state.retry();
    }
    state.update(10000); // rapido (10s <= 120s)
    return state.complete();
};

// Caue (Cidade 3 x2.0, 1 min base 100):
// 0 erros: round5(100 * 1.0 * 2.0) + 20 = 220
// 1 erro (contaminada): round5(100 * 0.75 * 2.0) + 20 = 170
// 2 erros (contaminada): round5(100 * 0.5 * 2.0) + 20 = 120
assert.deepEqual(simulateWithContaminatedErrors('caue', 0), { atp: 220, errors: 0, withinTime: true });
assert.deepEqual(simulateWithContaminatedErrors('caue', 1), { atp: 170, errors: 1, withinTime: true });
assert.deepEqual(simulateWithContaminatedErrors('caue', 2), { atp: 120, errors: 2, withinTime: true });

// Teo (Cidade 3 x2.0, 4 min base 175):
// 0 erros: round5(175 * 1.0 * 2.0) + 20 = 370
// 1 erro: round5(175 * 0.75 * 2.0) + 20 = round5(262.5) + 20 = 285
assert.deepEqual(simulateWithContaminatedErrors('teo', 0), { atp: 370, errors: 0, withinTime: true });
assert.deepEqual(simulateWithContaminatedErrors('teo', 1), { atp: 285, errors: 1, withinTime: true });

// Seu Joaquim (Cidade 1 x1.0, 1 min base 100): continua 120 ATP sem erros.
assert.deepEqual(simulateWithContaminatedErrors('joaquim', 0), { atp: 120, errors: 0, withinTime: true });

console.log('OK: tipos de ocorrencia por cidade (Rh+/Rh-, contaminadas so na Cidade 3, erro e ATP).');
