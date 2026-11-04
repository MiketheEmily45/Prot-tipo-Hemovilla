// Gerencia os estados de ocorrencia e temporizadores dos 9 personagens no mapa.
// Nao persiste em localStorage: recarregar a pagina reinicia os relogios.

// Alternar para true faz o tempo no minigame descontar dos relogios dos outros
// personagens da mesma cidade (quem passar de zero volta com alerta).
export let TIMERS_RUN_DURING_MINIGAME = false;

export function setTimersRunDuringMinigame(value) {
    TIMERS_RUN_DURING_MINIGAME = Boolean(value);
}

export const OCCURRENCE_DEFINITIONS = [
    { id: 'joaquim', name: 'Seu Joaquim', cityIndex: 0, cityName: 'Cidade 1', intervalMs: 60000 },
    { id: 'marlene', name: 'Dona Marlene', cityIndex: 0, cityName: 'Cidade 1', intervalMs: 120000 },
    { id: 'aparecida', name: 'Dona Aparecida', cityIndex: 0, cityName: 'Cidade 1', intervalMs: 240000 },

    { id: 'bruno', name: 'Bruno', cityIndex: 1, cityName: 'Cidade 2', intervalMs: 60000 },
    { id: 'beatriz', name: 'Beatriz', cityIndex: 1, cityName: 'Cidade 2', intervalMs: 120000 },
    { id: 'carlos', name: 'Carlos', cityIndex: 1, cityName: 'Cidade 2', intervalMs: 240000 },

    { id: 'caue', name: 'Cauê', cityIndex: 2, cityName: 'Cidade 3', intervalMs: 60000 },
    { id: 'yasmin', name: 'Yasmin', cityIndex: 2, cityName: 'Cidade 3', intervalMs: 120000 },
    { id: 'teo', name: 'Teo', cityIndex: 2, cityName: 'Cidade 3', intervalMs: 240000 }
];

const occurrenceStateMap = new Map();
let activeMinigameSession = null;

function initOccurrenceState() {
    occurrenceStateMap.clear();
    OCCURRENCE_DEFINITIONS.forEach((def) => {
        occurrenceStateMap.set(def.id, {
            id: def.id,
            name: def.name,
            cityIndex: def.cityIndex,
            cityName: def.cityName,
            intervalMs: def.intervalMs,
            remainingMs: def.intervalMs,
            hasAlert: false
        });
    });
}

initOccurrenceState();

export function getOccurrence(characterId) {
    return occurrenceStateMap.get(characterId) || null;
}

export function getAllOccurrences() {
    return Array.from(occurrenceStateMap.values());
}

export function updateActiveCityTimers(cityIndex, deltaMs) {
    if (typeof deltaMs !== 'number' || deltaMs <= 0) {
        return [];
    }

    const newlyAlerted = [];

    occurrenceStateMap.forEach((entry) => {
        if (entry.cityIndex === cityIndex && !entry.hasAlert) {
            entry.remainingMs = Math.max(0, entry.remainingMs - deltaMs);
            if (entry.remainingMs === 0) {
                entry.hasAlert = true;
                newlyAlerted.push(entry);
            }
        }
    });

    return newlyAlerted;
}

export function advanceActiveCityTimers(cityIndex, ms = 30000) {
    const newlyAlerted = [];

    occurrenceStateMap.forEach((entry) => {
        if (entry.cityIndex === cityIndex && !entry.hasAlert) {
            entry.remainingMs = Math.max(0, entry.remainingMs - ms);
            if (entry.remainingMs === 0) {
                entry.hasAlert = true;
                newlyAlerted.push(entry);
            }
        }
    });

    return newlyAlerted;
}

export function triggerAllInCity(cityIndex) {
    const newlyAlerted = [];

    occurrenceStateMap.forEach((entry) => {
        if (entry.cityIndex === cityIndex) {
            if (!entry.hasAlert) {
                entry.hasAlert = true;
                entry.remainingMs = 0;
                newlyAlerted.push(entry);
            }
        }
    });

    return newlyAlerted;
}

export function startMinigameSession(characterId, cityIndex) {
    activeMinigameSession = {
        characterId,
        cityIndex,
        startedAt: Date.now()
    };
}

export function onAttendanceSuccess(characterId) {
    const entry = occurrenceStateMap.get(characterId);
    if (entry) {
        entry.hasAlert = false;
        entry.remainingMs = entry.intervalMs;
    }
}

export function endMinigameSession() {
    if (!activeMinigameSession) {
        return;
    }

    if (TIMERS_RUN_DURING_MINIGAME) {
        const elapsed = Date.now() - activeMinigameSession.startedAt;
        const targetCityIndex = activeMinigameSession.cityIndex;
        const targetCharId = activeMinigameSession.characterId;

        occurrenceStateMap.forEach((entry) => {
            if (entry.cityIndex === targetCityIndex && entry.id !== targetCharId && !entry.hasAlert) {
                entry.remainingMs = Math.max(0, entry.remainingMs - elapsed);
                if (entry.remainingMs === 0) {
                    entry.hasAlert = true;
                }
            }
        });
    }

    activeMinigameSession = null;
}

export function resetOccurrenceState() {
    activeMinigameSession = null;
    initOccurrenceState();
}

export function logOccurrencesTable() {
    const tableData = getAllOccurrences().map((entry) => ({
        'Nome': entry.name,
        'Cidade': entry.cityName,
        'Tempo Restante': entry.hasAlert ? '0.0s (Alerta)' : `${(entry.remainingMs / 1000).toFixed(1)}s`,
        'Tem Alerta': entry.hasAlert ? 'Sim' : 'Não'
    }));
    console.table(tableData);
}
