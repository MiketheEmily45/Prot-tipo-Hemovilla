// Tipos sanguineos descobertos pelo jogador, guardados em localStorage.
import { isProgressSavingDisabled } from './debugTools.js';
import { getCharacterReplacement } from './shopStore.js';
import { getShopCharacterBloodType } from './shopCharacterPresentation.js';
const STORAGE_KEY = 'hemovilla-discovered-types';

export function resolveDiscoveredCharacterId(characterId) {
    const replacementId = getCharacterReplacement(characterId);
    if (replacementId && getShopCharacterBloodType(replacementId)) {
        return replacementId;
    }
    return characterId;
}

function readAll() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        return {};
    }
}

export function getDiscoveredType(characterId) {
    const key = resolveDiscoveredCharacterId(characterId);
    const types = readAll();
    return types[key] || null;
}

export function setDiscoveredType(characterId, type) {
    if (isProgressSavingDisabled()) return;
    try {
        const key = resolveDiscoveredCharacterId(characterId);
        const types = readAll();
        types[key] = type;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
    } catch (error) {
        // localStorage indisponivel: o tipo so vale ate fechar o jogo.
    }
}
