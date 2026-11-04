// Ferramentas de depuração ativas apenas quando a URL contém '?debug'.
// F7: alterna a liberação de todas as cidades (apenas em memória, sem salvar no localStorage).
// F8: alterna o modo 'não salvar progresso' (não grava ATP, atendidos nem tipo descoberto, e força Fase 2).
// F9: zera todo o progresso salvo no localStorage e recarrega a cena atual (também reinicia os tempos de ocorrência).
// T: (apenas no mapa) adianta 30 segundos nos relógios de ocorrência da cidade ativa.
// L: (apenas no mapa) exibe no console a tabela com o estado e tempo restante de todos os 9 personagens.

import {
    resetOccurrenceState,
    advanceActiveCityTimers,
    logOccurrencesTable
} from './occurrenceState.js';

export const STORAGE_KEYS = [
    'hemovilla-atp',
    'hemovilla-attended-characters',
    'hemovilla-discovered-types'
];

let currentGame = null;
let noSaveModeActive = false;
let allCitiesUnlockedActive = false;
let toastTimeout = null;

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

export function clearAllProgress() {
    try {
        STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch (e) {
        console.warn('Erro ao limpar localStorage no modo debug:', e);
    }
}

export function showToast(message, duration = 1800) {
    if (typeof document === 'undefined') return;

    let toast = document.getElementById('debug-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'debug-toast';
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        toast.style.color = '#ffffff';
        toast.style.padding = '6px 16px';
        toast.style.borderRadius = '6px';
        toast.style.border = '1px solid #22c55e';
        toast.style.fontFamily = 'monospace';
        toast.style.fontSize = '13px';
        toast.style.fontWeight = 'bold';
        toast.style.zIndex = '999999';
        toast.style.pointerEvents = 'none';
        toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
        toast.style.transition = 'opacity 0.25s ease';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.display = 'block';

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.style.opacity === '0') {
                toast.style.display = 'none';
            }
        }, 250);
    }, duration);
}

function updateIndicator() {
    if (typeof document === 'undefined') return;

    let indicator = document.getElementById('debug-no-save-indicator');
    if (noSaveModeActive) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'debug-no-save-indicator';
            indicator.style.position = 'fixed';
            indicator.style.bottom = '12px';
            indicator.style.right = '12px';
            indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            indicator.style.color = '#fbbf24';
            indicator.style.padding = '4px 8px';
            indicator.style.borderRadius = '4px';
            indicator.style.border = '1px solid #fbbf24';
            indicator.style.fontFamily = 'monospace';
            indicator.style.fontSize = '12px';
            indicator.style.fontWeight = 'bold';
            indicator.style.zIndex = '999999';
            indicator.style.pointerEvents = 'none';
            indicator.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
            document.body.appendChild(indicator);
        }
        indicator.textContent = 'TESTE: sem salvar';
        indicator.style.display = 'block';
    } else if (indicator) {
        indicator.style.display = 'none';
    }
}

function updateCitiesIndicator() {
    if (typeof document === 'undefined') return;

    let indicator = document.getElementById('debug-all-cities-indicator');
    if (allCitiesUnlockedActive) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'debug-all-cities-indicator';
            indicator.style.position = 'fixed';
            indicator.style.bottom = '38px';
            indicator.style.right = '12px';
            indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            indicator.style.color = '#38bdf8';
            indicator.style.padding = '4px 8px';
            indicator.style.borderRadius = '4px';
            indicator.style.border = '1px solid #38bdf8';
            indicator.style.fontFamily = 'monospace';
            indicator.style.fontSize = '12px';
            indicator.style.fontWeight = 'bold';
            indicator.style.zIndex = '999999';
            indicator.style.pointerEvents = 'none';
            indicator.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
            document.body.appendChild(indicator);
        }
        indicator.textContent = 'TESTE: cidades liberadas';
        indicator.style.display = 'block';
    } else if (indicator) {
        indicator.style.display = 'none';
    }
}

export function toggleAllCitiesUnlocked() {
    allCitiesUnlockedActive = !allCitiesUnlockedActive;
    updateCitiesIndicator();
    showToast(allCitiesUnlockedActive ? 'F7: Todas as cidades liberadas (debug)' : 'F7: Bloqueio normal de cidades');
    return allCitiesUnlockedActive;
}

export function isAllCitiesUnlocked() {
    return isDebugEnabled() && allCitiesUnlockedActive;
}

export function toggleNoSaveMode() {
    noSaveModeActive = !noSaveModeActive;
    updateIndicator();

    if (noSaveModeActive && currentGame && currentGame.scene) {
        const minigame = currentGame.scene.getScene('Minigame');
        if (minigame && minigame.scene.isActive() && minigame.attendanceState) {
            minigame.attendanceState.typeKnown = false;
        }
    }
}

export function resetProgressAndReload() {
    clearAllProgress();
    resetOccurrenceState();
    showToast('Progresso e ocorrências zerados');

    if (currentGame && currentGame.scene) {
        const activeScenes = currentGame.scene.getScenes(true);
        activeScenes.forEach((activeScene) => {
            if (activeScene.scene.key === 'Minigame') {
                activeScene.scene.restart({ characterId: activeScene.characterId });
            } else {
                activeScene.scene.restart();
            }
        });
    }
}

export function initDebugTools(game) {
    if (!isDebugEnabled()) {
        return;
    }

    currentGame = game;
    window.__PHASER_GAME__ = game;

    window.addEventListener('keydown', (event) => {
        if (!isDebugEnabled()) return;

        if (event.key === 'F7' || event.code === 'F7') {
            event.preventDefault();
            toggleAllCitiesUnlocked();
        } else if (event.key === 'F8' || event.code === 'F8') {
            event.preventDefault();
            toggleNoSaveMode();
        } else if (event.key === 'F9' || event.code === 'F9') {
            event.preventDefault();
            resetProgressAndReload();
        } else if (event.key === 't' || event.key === 'T') {
            const mapScene = currentGame?.scene?.getScene('GameMap');
            if (mapScene && currentGame.scene.isActive('GameMap')) {
                event.preventDefault();
                const cityIndex = mapScene.currentCityIndex ?? 0;
                const newlyAlerted = advanceActiveCityTimers(cityIndex, 30000);
                if (newlyAlerted && newlyAlerted.length > 0) {
                    newlyAlerted.forEach((occ) => {
                        const char = mapScene.clickableCharacters?.find((c) => c.iconButtonKey === occ.id);
                        if (char) {
                            mapScene.clickableCharacterManager?.getAlertManager().applyAlert(char, false);
                        }
                    });
                }
                showToast(`T: +30s nos relógios da Cidade ${cityIndex + 1}`);
                logOccurrencesTable();
            }
        } else if (event.key === 'l' || event.key === 'L') {
            const mapScene = currentGame?.scene?.getScene('GameMap');
            if (mapScene && currentGame.scene.isActive('GameMap')) {
                event.preventDefault();
                logOccurrencesTable();
                showToast('L: Tabela de ocorrências exibida no console');
            }
        }
    });
}
