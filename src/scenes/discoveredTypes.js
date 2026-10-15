// Tipos sanguineos descobertos pelo jogador, guardados em localStorage.
const STORAGE_KEY = 'hemovilla-discovered-types';

function readAll() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        return {};
    }
}

export function getDiscoveredType(characterId) {
    const types = readAll();
    return types[characterId] || null;
}

export function setDiscoveredType(characterId, type) {
    try {
        const types = readAll();
        types[characterId] = type;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
    } catch (error) {
        // localStorage indisponivel: o tipo so vale ate fechar o jogo.
    }
}
