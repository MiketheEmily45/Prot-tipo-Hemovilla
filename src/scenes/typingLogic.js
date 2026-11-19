// Logica pura da Fase 2 (Etapa 1 ABO e Etapa 2 fator Rh / Anti-D).

export const RH_DIAGNOSIS_OPTIONS = Object.freeze([
    { label: 'Rh+', value: '+' },
    { label: 'Rh−', value: '-' }
]);

export const RH_NEUTRAL_ERROR_HINT = 'Não é esse fator Rh. Observe o poço com Anti-D: houve formação de grumos?';

export function aboAgglutinates(patientAbo, wellIndex) {
    const clean = String(patientAbo || '').trim().toUpperCase().replace(/[+-]/g, '');
    const antigen = wellIndex === 0 ? 'A' : 'B';
    return clean.includes(antigen);
}

export function rhAgglutinates(patientRh) {
    return patientRh === '+';
}

export function getRhFailureExplanation(patientRh) {
    if (rhAgglutinates(patientRh)) {
        return 'O poço com Anti-D aglutinou (formou grumos), indicando presença do antígeno D: fator Rh+.';
    }
    return 'O poço com Anti-D não aglutinou (ficou liso), indicando ausência do antígeno D: fator Rh−.';
}

export function formatConfirmedBloodType(abo, rh, rhEnabled) {
    const cleanAbo = String(abo || 'A').trim().toUpperCase().replace(/[+-]/g, '');
    if (!rhEnabled) {
        return cleanAbo;
    }
    const cleanRh = rh === '-' ? '-' : '+';
    return `${cleanAbo}${cleanRh}`;
}
