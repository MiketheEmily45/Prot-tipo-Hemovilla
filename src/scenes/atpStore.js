// Armazenamento simples de ATP e de atendimentos no localStorage.
const ATP_STORAGE_KEY = 'hemovilla-atp';
const ATTENDED_STORAGE_KEY = 'hemovilla-attended-characters';

export function getATP() {
    try {
        const raw = window.localStorage.getItem(ATP_STORAGE_KEY);
        return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (error) {
        return 0;
    }
}

export function addATP(amount) {
    try {
        const current = getATP();
        const updated = current + amount;
        window.localStorage.setItem(ATP_STORAGE_KEY, String(updated));
        return updated;
    } catch (error) {
        return amount;
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
    if (!characterId) return;
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
