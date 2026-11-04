// Armazenamento simples de ATP e de atendimentos no localStorage.
import { isProgressSavingDisabled } from './debugState.js';
const ATP_STORAGE_KEY = 'hemovilla-atp';
const ATTENDED_STORAGE_KEY = 'hemovilla-attended-characters';

let inMemoryATP = null;

export function resetInMemoryATP() {
    inMemoryATP = null;
}

export function getATP() {
    if (inMemoryATP !== null && isProgressSavingDisabled()) {
        return inMemoryATP;
    }
    try {
        const raw = window.localStorage.getItem(ATP_STORAGE_KEY);
        return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (error) {
        return 0;
    }
}

export function addATP(amount) {
    if (typeof amount !== 'number' || amount <= 0) return getATP();
    const current = getATP();
    const updated = current + amount;
    if (isProgressSavingDisabled()) {
        inMemoryATP = updated;
        return updated;
    }
    try {
        window.localStorage.setItem(ATP_STORAGE_KEY, String(updated));
        return updated;
    } catch (error) {
        return current;
    }
}

export function spendATP(amount) {
    if (typeof amount !== 'number' || amount <= 0) return false;
    const current = getATP();
    if (current < amount) {
        return false;
    }
    const updated = current - amount;
    if (isProgressSavingDisabled()) {
        inMemoryATP = updated;
        return true;
    }
    try {
        window.localStorage.setItem(ATP_STORAGE_KEY, String(updated));
        return true;
    } catch (error) {
        return false;
    }
}

export function isCharacterAttended(characterId) {
    try {
        const raw = window.localStorage.getItem(ATTENDED_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return list.includes(characterId);
    } catch (error) {
        return false;
    }
}

export function markCharacterAttended(characterId) {
    if (!characterId || isProgressSavingDisabled()) return;
    try {
        const raw = window.localStorage.getItem(ATTENDED_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (!list.includes(characterId)) {
            list.push(characterId);
            window.localStorage.setItem(ATTENDED_STORAGE_KEY, JSON.stringify(list));
        }
    } catch (error) {
        // localStorage indisponivel: persiste apenas na memoria desta sessao.
    }
}
