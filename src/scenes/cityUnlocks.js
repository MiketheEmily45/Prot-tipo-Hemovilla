// Logica de desbloqueio de cidades no mapa.
import { isCharacterAttended } from './atpStore.js';
import { isAllCitiesUnlocked } from './debugTools.js';

export const CITY_1_REQUIRED_CHARACTERS = ['joaquim', 'marlene', 'aparecida'];

/**
 * Verifica se a cidade no indice especificado esta desbloqueada.
 * Cidade 0 (Cidade 1): sempre liberada.
 * Cidade 1 (Cidade 2): liberada quando Joaquim, Marlene e Aparecida foram atendidos, ou com F7 ativo.
 * Cidade 2 (Cidade 3): liberada apenas com F7 ativo no modo ?debug (futuramente comprada na loja).
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

    return false;
}

/**
 * Mensagem exibida ao jogador quando tenta navegar para uma cidade bloqueada.
 */
export function getCityLockMessage(cityIndex) {
    if (cityIndex === 1) {
        return 'Atenda os 3 personagens da Cidade 1 para liberar';
    }
    if (cityIndex === 2) {
        return 'Cidade 3 indisponível';
    }
    return '';
}
