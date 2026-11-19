// Configuracao centralizada de tipos de ocorrencia por cidade (Rh e bolsas contaminadas).
// Todos os parametros ficam juntos aqui para ajuste facil apos confirmacao do grupo.

// Quais personagens pertencem a cada cidade (1 = Centro, 2 = Distrito Profissional, 3 = Periferia/lazer).
export const CITY_CHARACTER_IDS = {
    1: ['joaquim', 'marlene', 'aparecida'],
    2: ['bruno', 'beatriz', 'carlos'],
    3: ['caue', 'yasmin', 'teo']
};

// Quantidade de pacientes Rh- por cidade.
export const RH_NEGATIVE_COUNT_BY_CITY = {
    1: 0,
    2: 2,
    3: 3
};

// Ordem de prioridade dos personagens que recebem Rh- em cada cidade
// (Cidade 2: Bruno O- e Carlos A-, Beatriz fica AB+; Cidade 3: Caue B-, Yasmin O-, Teo AB-).
export const RH_NEGATIVE_CANDIDATES_BY_CITY = {
    1: [],
    2: ['bruno', 'carlos', 'beatriz'],
    3: ['caue', 'yasmin', 'teo']
};

// Se a compatibilidade de fator Rh esta ativa na cidade.
export const RH_ENABLED_BY_CITY = {
    1: false,
    2: true,
    3: true
};

// Quantidade de bolsas contaminadas extras na prateleira da Fase 3 por cidade.
export const CONTAMINATED_BAGS_BY_CITY = {
    1: 0,
    2: 0,
    3: 1
};

// Quantidade padrao de bolsas normais sorteadas na Fase 3 (as contaminadas entram como extras).
export const NORMAL_BAGS_PER_ROUND = 4;

// Tempo esperado (em segundos) para o bonus rapido quando o atendimento inclui a Fase 2 (tipagem).
// Cidade 1: 1 etapa (ABO) = 120 s. Cidades 2 e 3: 2 etapas (ABO + Anti-D) = 150 s.
export const EXPECTED_TYPING_SECONDS_BY_CITY = {
    1: 120,
    2: 150,
    3: 150
};

export function getCityNumberForCharacter(characterId) {
    if (!characterId) return 1;
    for (const [cityKey, ids] of Object.entries(CITY_CHARACTER_IDS)) {
        if (Array.isArray(ids) && ids.includes(characterId)) {
            return Number(cityKey);
        }
    }
    return 1;
}

export function getRhNegativeCharactersForCity(cityNumber) {
    const city = Number(cityNumber) || 1;
    const cityChars = CITY_CHARACTER_IDS[city] || [];
    const targetCount = Math.max(0, Math.min(cityChars.length, RH_NEGATIVE_COUNT_BY_CITY[city] ?? 0));

    if (targetCount === 0) {
        return [];
    }

    const preferred = (RH_NEGATIVE_CANDIDATES_BY_CITY[city] || []).filter((id) => cityChars.includes(id));
    const remaining = cityChars.filter((id) => !preferred.includes(id));
    return [...preferred, ...remaining].slice(0, targetCount);
}

export function getCharacterRh(characterId, cityNumber = null) {
    const city = typeof cityNumber === 'number' ? cityNumber : getCityNumberForCharacter(characterId);
    const rhNegativeChars = getRhNegativeCharactersForCity(city);
    return rhNegativeChars.includes(characterId) ? '-' : '+';
}

export function isRhEnabledForCity(cityNumber) {
    const city = Number(cityNumber) || 1;
    if (city in RH_ENABLED_BY_CITY) {
        return Boolean(RH_ENABLED_BY_CITY[city]);
    }
    return (RH_NEGATIVE_COUNT_BY_CITY[city] ?? 0) > 0;
}

export function getContaminatedBagCountForCity(cityNumber) {
    const city = Number(cityNumber) || 1;
    const count = CONTAMINATED_BAGS_BY_CITY[city] ?? 0;
    return Math.max(0, Number.isFinite(count) ? count : 0);
}

export function getExpectedTypingSecondsForCity(cityNumber) {
    const city = Number(cityNumber) || 1;
    const seconds = EXPECTED_TYPING_SECONDS_BY_CITY[city];
    return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : 120;
}

export function getCityOccurrenceRules(cityIndex = 0) {
    const city = typeof cityIndex === 'number' && Number.isFinite(cityIndex) ? cityIndex + 1 : 1;
    const characters = CITY_CHARACTER_IDS[city] || [];
    const rhNegativeCharacters = getRhNegativeCharactersForCity(city);
    const rhEnabled = isRhEnabledForCity(city);
    const contaminatedBags = getContaminatedBagCountForCity(city);
    const normalBags = NORMAL_BAGS_PER_ROUND;
    const totalBags = normalBags + contaminatedBags;
    const expectedTypingSeconds = getExpectedTypingSecondsForCity(city);

    return {
        city,
        characters,
        rhEnabled,
        rhNegativeCount: rhNegativeCharacters.length,
        rhNegativeCharacters,
        contaminatedBags,
        normalBags,
        totalBags,
        expectedTypingSeconds
    };
}

export function getCharacterOccurrenceRules(characterId, cityIndex = null) {
    const city = typeof cityIndex === 'number' && Number.isFinite(cityIndex)
        ? cityIndex + 1
        : getCityNumberForCharacter(characterId);
    const rules = getCityOccurrenceRules(city - 1);
    const rh = getCharacterRh(characterId, city);

    return {
        ...rules,
        characterId,
        rh
    };
}

export function resolveBloodTypeWithRh(characterId, aboType, cityNumber = null) {
    const cleanAbo = String(aboType || 'A').trim().toUpperCase().replace(/[+-]/g, '');
    const rh = getCharacterRh(characterId, cityNumber);
    return `${cleanAbo}${rh}`;
}
