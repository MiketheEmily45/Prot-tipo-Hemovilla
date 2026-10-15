// Logica pura de compatibilidade sanguinea (sistema ABO e fator Rh).
export const RH_ENABLED = false;

const ABO_COMPATIBILITY = {
    A: ['A', 'O'],
    B: ['B', 'O'],
    AB: ['A', 'B', 'AB', 'O'],
    O: ['O']
};

const ABO_ANTIBODIES = {
    A: 'Anti-B',
    B: 'Anti-A',
    O: 'Anti-A e Anti-B'
};

function getAbo(typeStr) {
    if (!typeStr || typeof typeStr !== 'string') return '';
    return typeStr.trim().toUpperCase().replace(/[+-]/g, '');
}

function getRh(typeStr) {
    if (!typeStr || typeof typeStr !== 'string') return '+';
    return typeStr.includes('-') ? '-' : '+';
}

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export function isContaminated(bagType) {
    if (!bagType || typeof bagType !== 'string') return false;
    const clean = bagType.trim().toUpperCase();
    return clean === 'C+' || clean === 'C-' || clean === 'C';
}

export function canReceive(patientType, bagType, { rhEnabled = RH_ENABLED } = {}) {
    if (isContaminated(bagType)) {
        return false;
    }

    const patientAbo = getAbo(patientType);
    const bagAbo = getAbo(bagType);

    const allowedAbo = ABO_COMPATIBILITY[patientAbo];
    if (!allowedAbo || !allowedAbo.includes(bagAbo)) {
        return false;
    }

    if (rhEnabled) {
        const patientRh = getRh(patientType);
        const bagRh = getRh(bagType);
        if (patientRh === '-' && bagRh === '+') {
            return false;
        }
    }

    return true;
}

export function incompatibilityReason(patientType, bagType, { rhEnabled = RH_ENABLED } = {}) {
    if (isContaminated(bagType)) {
        return 'Esta bolsa foi reprovada na triagem.';
    }

    if (canReceive(patientType, bagType, { rhEnabled })) {
        return '';
    }

    const patientAbo = getAbo(patientType);
    const bagAbo = getAbo(bagType);
    const allowedAbo = ABO_COMPATIBILITY[patientAbo] || [];
    const aboIncompatible = !allowedAbo.includes(bagAbo);

    const patientRh = getRh(patientType);
    const bagRh = getRh(bagType);
    const rhIncompatible = Boolean(rhEnabled && patientRh === '-' && bagRh === '+');

    if (aboIncompatible && rhIncompatible) {
        const antibody = ABO_ANTIBODIES[patientAbo];
        return `O paciente tipo ${patientAbo} tem anticorpos ${antibody}, então a bolsa ${bagAbo} causaria aglutinação. Além disso, o paciente Rh- não pode receber sangue Rh+.`;
    }

    if (rhIncompatible) {
        return 'O paciente Rh- não pode receber sangue Rh+, pois geraria anticorpos contra o fator Rh.';
    }

    if (aboIncompatible && ABO_ANTIBODIES[patientAbo]) {
        return `O paciente tipo ${patientAbo} tem anticorpos ${ABO_ANTIBODIES[patientAbo]}, então a bolsa ${bagAbo} causaria aglutinação.`;
    }

    return `A bolsa ${bagType} não é compatível com o paciente tipo ${patientType}.`;
}

export function drawRound({
    patientType,
    count = 4,
    contaminatedCount = 0,
    rhEnabled = RH_ENABLED
} = {}) {
    const normalPool = rhEnabled
        ? ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        : ['A+', 'B+', 'AB+', 'O+'];

    const contaminatedPool = rhEnabled
        ? ['C+', 'C-']
        : ['C+'];

    const selectedContaminated = shuffle(contaminatedPool).slice(0, contaminatedCount);
    const normalCountNeeded = Math.max(0, count - selectedContaminated.length);

    const compatiblePool = normalPool.filter((bag) => canReceive(patientType, bag, { rhEnabled }));
    const incompatiblePool = normalPool.filter((bag) => !canReceive(patientType, bag, { rhEnabled }));

    let selectedNormal = [];

    if (compatiblePool.length > 0 && incompatiblePool.length > 0 && normalCountNeeded >= 2) {
        const compBag = shuffle(compatiblePool)[0];
        const incompBag = shuffle(incompatiblePool)[0];
        selectedNormal.push(compBag, incompBag);

        const remainingPool = normalPool.filter((b) => !selectedNormal.includes(b));
        const rest = shuffle(remainingPool).slice(0, normalCountNeeded - 2);
        selectedNormal.push(...rest);
    } else {
        const poolToUse = compatiblePool.length > 0 ? compatiblePool : normalPool;
        selectedNormal = shuffle(poolToUse).slice(0, normalCountNeeded);
    }

    return shuffle([...selectedNormal, ...selectedContaminated]);
}
