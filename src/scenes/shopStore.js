import { isProgressSavingDisabled } from './debugState.js';
import { CITY_CHARACTER_IDS } from './cityOccurrenceConfig.js';
import { isCityUnlocked } from './cityUnlocks.js';
import { SHOP_CHARACTER_PRESENTATIONS } from './shopCharacterPresentation.js';

export const SHOP_PURCHASES_STORAGE_KEY = 'hemovilla-shop-purchases';
export const EQUIPPED_SHOP_CHARACTER_STORAGE_KEY = 'hemovilla-equipped-shop-character';
export const CHARACTER_REPLACEMENTS_STORAGE_KEY = 'hemovilla-character-replacements';

const SHOP_CHARACTER_IDS = new Set(Object.keys(SHOP_CHARACTER_PRESENTATIONS));
const REPLACEABLE_CHARACTER_IDS = new Set(Object.values(CITY_CHARACTER_IDS).flat());

let inMemoryPurchases = null;
let hasNoSavePurchases = false;
let hasPurchaseStorageFallback = false;
let inMemoryEquippedCharacter = null;
let hasNoSaveEquippedCharacter = false;
let hasEquippedStorageFallback = false;
let inMemoryReplacements = null;
let hasNoSaveReplacements = false;
let hasReplacementStorageFallback = false;

export function getShopPurchases() {
    if (inMemoryPurchases !== null
        && ((isProgressSavingDisabled() && hasNoSavePurchases) || hasPurchaseStorageFallback)) {
        return [...inMemoryPurchases];
    }

    try {
        const raw = window.localStorage.getItem(SHOP_PURCHASES_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((id) => SHOP_CHARACTER_IDS.has(id))
            : [];
    } catch (error) {
        return inMemoryPurchases ? [...inMemoryPurchases] : [];
    }
}

export function isShopCharacterPurchased(characterId) {
    return getShopPurchases().includes(characterId);
}

export function purchaseShopCharacter(characterId) {
    if (!SHOP_CHARACTER_IDS.has(characterId)) {
        return false;
    }

    const purchases = getShopPurchases();
    if (purchases.includes(characterId)) {
        return false;
    }

    purchases.push(characterId);
    if (isProgressSavingDisabled()) {
        inMemoryPurchases = purchases;
        hasNoSavePurchases = true;
        return true;
    }

    try {
        window.localStorage.setItem(SHOP_PURCHASES_STORAGE_KEY, JSON.stringify(purchases));
    } catch (error) {
        inMemoryPurchases = purchases;
        hasPurchaseStorageFallback = true;
    }
    return true;
}

export function getEquippedShopCharacter() {
    if ((isProgressSavingDisabled() && hasNoSaveEquippedCharacter) || hasEquippedStorageFallback) {
        return inMemoryEquippedCharacter;
    }

    try {
        const characterId = window.localStorage.getItem(EQUIPPED_SHOP_CHARACTER_STORAGE_KEY);
        return SHOP_CHARACTER_IDS.has(characterId) && isShopCharacterPurchased(characterId)
            ? characterId
            : null;
    } catch (error) {
        return inMemoryEquippedCharacter;
    }
}

export function equipShopCharacter(characterId) {
    if (!SHOP_CHARACTER_IDS.has(characterId) || !isShopCharacterPurchased(characterId)) {
        return false;
    }

    if (isProgressSavingDisabled()) {
        inMemoryEquippedCharacter = characterId;
        hasNoSaveEquippedCharacter = true;
        return true;
    }

    try {
        window.localStorage.setItem(EQUIPPED_SHOP_CHARACTER_STORAGE_KEY, characterId);
    } catch (error) {
        inMemoryEquippedCharacter = characterId;
        hasEquippedStorageFallback = true;
    }
    return true;
}

function getCityIndexForCharacter(characterId) {
    for (const [cityNumber, characterIds] of Object.entries(CITY_CHARACTER_IDS)) {
        if (characterIds.includes(characterId)) {
            return Number(cityNumber) - 1;
        }
    }
    return null;
}

export function isReplacementTargetAccessible(characterId) {
    const cityIndex = getCityIndexForCharacter(characterId);
    return cityIndex !== null && isCityUnlocked(cityIndex);
}

function normalizeReplacements(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    const replacements = {};
    Object.entries(value).forEach(([targetId, extraId]) => {
        if (REPLACEABLE_CHARACTER_IDS.has(targetId)
            && SHOP_CHARACTER_IDS.has(extraId)
            && isShopCharacterPurchased(extraId)
            && !Object.values(replacements).includes(extraId)) {
            replacements[targetId] = extraId;
        }
    });
    return replacements;
}

export function getCharacterReplacements() {
    if (inMemoryReplacements !== null
        && ((isProgressSavingDisabled() && hasNoSaveReplacements) || hasReplacementStorageFallback)) {
        return { ...inMemoryReplacements };
    }

    try {
        const raw = window.localStorage.getItem(CHARACTER_REPLACEMENTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return normalizeReplacements(parsed);
    } catch (error) {
        return inMemoryReplacements ? { ...inMemoryReplacements } : {};
    }
}

export function getCharacterReplacement(characterId) {
    return getCharacterReplacements()[characterId] ?? null;
}

export function getCharacterReplacementTarget(extraId) {
    return Object.entries(getCharacterReplacements())
        .find(([, characterId]) => characterId === extraId)?.[0] ?? null;
}

export function assignShopCharacterReplacement(extraId, targetId) {
    if (!SHOP_CHARACTER_IDS.has(extraId)
        || !isShopCharacterPurchased(extraId)
        || !REPLACEABLE_CHARACTER_IDS.has(targetId)
        || !isReplacementTargetAccessible(targetId)) {
        return false;
    }

    const replacements = getCharacterReplacements();
    Object.entries(replacements).forEach(([currentTarget, currentExtra]) => {
        if (currentExtra === extraId || currentTarget === targetId) {
            delete replacements[currentTarget];
        }
    });
    replacements[targetId] = extraId;

    if (isProgressSavingDisabled()) {
        inMemoryReplacements = replacements;
        hasNoSaveReplacements = true;
        return true;
    }

    try {
        window.localStorage.setItem(CHARACTER_REPLACEMENTS_STORAGE_KEY, JSON.stringify(replacements));
    } catch (error) {
        inMemoryReplacements = replacements;
        hasReplacementStorageFallback = true;
    }
    return true;
}

export function resetShopMemory() {
    inMemoryPurchases = null;
    hasNoSavePurchases = false;
    hasPurchaseStorageFallback = false;
    inMemoryEquippedCharacter = null;
    hasNoSaveEquippedCharacter = false;
    hasEquippedStorageFallback = false;
    inMemoryReplacements = null;
    hasNoSaveReplacements = false;
    hasReplacementStorageFallback = false;
}
