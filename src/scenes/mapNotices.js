// Persistencia dos avisos unicos do mapa (liberacao da Cidade 2 e novos tipos no Quiz por cidade).
import { isCharacterAttended } from './atpStore.js';
import { CITY_1_REQUIRED_CHARACTERS } from './cityUnlocks.js';
import { isProgressSavingDisabled } from './debugState.js';

export const MAP_NOTICES_STORAGE_KEY = 'hemovilla-map-notices';

export const CITY_2_UNLOCKED_NOTICE_TEXT = 'Cidade 2 liberada! Você atendeu os 3 moradores da Cidade 1. Abra a seleção de cidades (botão com os prédios) para visitá-la.';
export const QUIZ_NEW_TYPES_NOTICE_TEXT = 'O quiz agora tem novos tipos de perguntas, confira!';

const DEFAULT_NOTICES = {
    city2UnlockedSeen: false,
    quizCitySeen: { 1: false, 2: false }
};

let inMemoryNotices = null;

function cloneDefaults() {
    return {
        city2UnlockedSeen: false,
        quizCitySeen: { ...DEFAULT_NOTICES.quizCitySeen }
    };
}

function normalizeNotices(raw) {
    if (!raw || typeof raw !== 'object') {
        return cloneDefaults();
    }
    const quizRaw = raw.quizCitySeen && typeof raw.quizCitySeen === 'object' ? raw.quizCitySeen : {};
    return {
        city2UnlockedSeen: Boolean(raw.city2UnlockedSeen),
        quizCitySeen: {
            1: Boolean(quizRaw[1] ?? quizRaw['1']),
            2: Boolean(quizRaw[2] ?? quizRaw['2'])
        }
    };
}

export function resetMapNoticesMemory() {
    inMemoryNotices = null;
}

export function getMapNotices() {
    if (inMemoryNotices !== null) {
        return normalizeNotices(inMemoryNotices);
    }
    try {
        const raw = window.localStorage.getItem(MAP_NOTICES_STORAGE_KEY);
        return normalizeNotices(raw ? JSON.parse(raw) : null);
    } catch (error) {
        return cloneDefaults();
    }
}

function saveMapNotices(next) {
    const normalized = normalizeNotices(next);
    if (isProgressSavingDisabled()) {
        inMemoryNotices = normalized;
        return normalized;
    }
    try {
        window.localStorage.setItem(MAP_NOTICES_STORAGE_KEY, JSON.stringify(normalized));
        inMemoryNotices = null;
    } catch (error) {
        inMemoryNotices = normalized;
    }
    return normalized;
}

export function hasSeenCity2UnlockedNotice() {
    return getMapNotices().city2UnlockedSeen;
}

export function markCity2UnlockedNoticeSeen() {
    const current = getMapNotices();
    return saveMapNotices({ ...current, city2UnlockedSeen: true });
}

export function hasSeenQuizCityNotice(cityIndex) {
    if (cityIndex !== 1 && cityIndex !== 2) {
        return true;
    }
    return Boolean(getMapNotices().quizCitySeen[cityIndex]);
}

export function markQuizCityNoticeSeen(cityIndex) {
    if (cityIndex !== 1 && cityIndex !== 2) {
        return getMapNotices();
    }
    const current = getMapNotices();
    return saveMapNotices({
        ...current,
        quizCitySeen: {
            ...current.quizCitySeen,
            [cityIndex]: true
        }
    });
}

export function shouldShowCity2UnlockedNotice() {
    if (isProgressSavingDisabled()) {
        // Com F8 (sem salvar), ainda avalia pelo estado atual dos atendimentos + memoria da sessao.
    }
    const city2Unlocked = CITY_1_REQUIRED_CHARACTERS.every((id) => isCharacterAttended(id));
    return city2Unlocked && !hasSeenCity2UnlockedNotice();
}

export function shouldShowQuizCityNotice(cityIndex) {
    if (cityIndex !== 1 && cityIndex !== 2) {
        return false;
    }
    return !hasSeenQuizCityNotice(cityIndex);
}
