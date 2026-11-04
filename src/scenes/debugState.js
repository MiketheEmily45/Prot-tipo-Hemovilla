// Estado compartilhado de depuracao (evita dependencias circulares entre debugTools, atpStore e cityUnlocks).

let noSaveModeActive = false;
let allCitiesUnlockedActive = false;

export function isDebugEnabled() {
    if (typeof window === 'undefined') return false;
    try {
        return new URLSearchParams(window.location.search).has('debug');
    } catch (e) {
        return false;
    }
}

export function isProgressSavingDisabled() {
    return isDebugEnabled() && noSaveModeActive;
}

export function setNoSaveMode(val) {
    noSaveModeActive = !!val;
    return noSaveModeActive;
}

export function isAllCitiesUnlocked() {
    return isDebugEnabled() && allCitiesUnlockedActive;
}

export function setAllCitiesUnlocked(val) {
    allCitiesUnlockedActive = !!val;
    return allCitiesUnlockedActive;
}
