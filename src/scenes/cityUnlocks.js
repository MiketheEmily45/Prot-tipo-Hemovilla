// Logica de desbloqueio de cidades no mapa.
import { isCharacterAttended } from './atpStore.js';
import { isAllCitiesUnlocked, isProgressSavingDisabled } from './debugState.js';

export const CITY_1_REQUIRED_CHARACTERS = ['joaquim', 'marlene', 'aparecida'];
export const CITY_3_PRICE = 1000;
export const PURCHASED_CITIES_STORAGE_KEY = 'hemovilla-purchased-cities';

let inMemoryPurchasedCities = null;

export function resetPurchasedCitiesMemory() {
    inMemoryPurchasedCities = null;
}

export function getPurchasedCities() {
    if (inMemoryPurchasedCities !== null && isProgressSavingDisabled()) {
        return [...inMemoryPurchasedCities];
    }
    try {
        const raw = window.localStorage.getItem(PURCHASED_CITIES_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

export function isCityPurchased(cityIndex) {
    const list = getPurchasedCities();
    return list.includes(cityIndex);
}

export function purchaseCity(cityIndex) {
    const list = getPurchasedCities();
    if (!list.includes(cityIndex)) {
        list.push(cityIndex);
    }
    if (isProgressSavingDisabled()) {
        inMemoryPurchasedCities = list;
        return;
    }
    try {
        window.localStorage.setItem(PURCHASED_CITIES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
        inMemoryPurchasedCities = list;
    }
}

export function canPurchaseCity(cityIndex) {
    if (cityIndex === 2) {
        return isCityUnlocked(1) && !isCityPurchased(2);
    }
    return false;
}

/**
 * Verifica se a cidade no indice especificado esta desbloqueada.
 * Cidade 0 (Cidade 1): sempre liberada.
 * Cidade 1 (Cidade 2): liberada quando Joaquim, Marlene e Aparecida foram atendidos, ou com F7 ativo.
 * Cidade 2 (Cidade 3): liberada quando comprada com ATP, ou com F7 ativo.
 */
export function isCityUnlocked(cityIndex) {
    if (isAllCitiesUnlocked()) {
        return true;
    }

    if (cityIndex === 0) {
        return true;
    }

    if (cityIndex === 1) {
        return CITY_1_REQUIRED_CHARACTERS.every((id) => isCharacterAttended(id));
    }

    if (cityIndex === 2) {
        return isCityPurchased(2);
    }

    return false;
}

/**
 * Mensagem exibida ao jogador quando uma cidade esta bloqueada ou precisa ser comprada.
 */
export function getCityLockMessage(cityIndex) {
    if (cityIndex === 1) {
        return 'Atenda os 3 personagens da Cidade 1 para liberar';
    }
    if (cityIndex === 2) {
        if (!isCityUnlocked(1)) {
            return 'Libere a Cidade 2 para poder comprar';
        }
        if (!isCityPurchased(2)) {
            return 'Preço: 1000 ATP';
        }
    }
    return '';
}
