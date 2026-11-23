// Logica pura do Quiz de compatibilidade sanguinea (geracao de perguntas por cidade,
// validacao, calculo de ATP e controle de cooldown em memoria).
import {
    ABO_TYPES,
    ABO_COMPATIBILITY,
    ABO_ANTIBODIES,
    canReceive,
    isContaminated
} from './bloodCompatibility.js';
import { getCityOccurrenceRules } from './cityOccurrenceConfig.js';
import {
    QUIZ_QUESTIONS_PER_ROUND,
    QUIZ_ATP_PER_CORRECT,
    QUIZ_PERFECT_BONUS_ATP,
    QUIZ_COOLDOWN_MS
} from './quizConfig.js';

const RH_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

let quizCooldownUntil = 0;

export function startQuizCooldown(now = Date.now()) {
    quizCooldownUntil = now + QUIZ_COOLDOWN_MS;
    return quizCooldownUntil;
}

export function getQuizCooldownRemainingMs(now = Date.now()) {
    return Math.max(0, quizCooldownUntil - now);
}

export function getQuizCooldownRemainingSeconds(now = Date.now()) {
    const rem = getQuizCooldownRemainingMs(now);
    return rem > 0 ? Math.ceil(rem / 1000) : 0;
}

export function isQuizOnCooldown(now = Date.now()) {
    return getQuizCooldownRemainingMs(now) > 0;
}

export function resetQuizCooldown() {
    quizCooldownUntil = 0;
}

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getAbo(typeStr) {
    return String(typeStr || '').trim().toUpperCase().replace(/[+-]/g, '');
}

function getRh(typeStr) {
    return String(typeStr || '').includes('-') ? '-' : '+';
}

function formatTypeList(types) {
    if (types.length === 1) return `Apenas ${types[0]}`;
    if (types.length === 2) return `${types[0]} e ${types[1]}`;
    return `${types.slice(0, -1).join(', ')} e ${types[types.length - 1]}`;
}

function buildYesNoExplanation(patient, donor, allowed, rhEnabled) {
    if (isContaminated(donor)) {
        return 'Bolsas com selo de perigo foram reprovadas na triagem e nunca podem ser usadas.';
    }

    const pAbo = getAbo(patient);
    const dAbo = getAbo(donor);
    const pRh = getRh(patient);
    const dRh = getRh(donor);

    if (allowed) {
        if (!rhEnabled) {
            if (pAbo === 'AB') {
                return 'Tipo AB não tem anticorpos Anti-A nem Anti-B, então recebe de todos no ABO.';
            }
            if (dAbo === 'O') {
                return 'Tipo O não tem antígenos A nem B nas hemácias, podendo doar no ABO.';
            }
            return `Paciente ${patient} não tem anticorpos contra o sangue ${donor}.`;
        }
        if (pRh === '+' && dRh === '-') {
            return `Compatível no ABO e no Rh: paciente Rh+ pode receber sangue Rh−.`;
        }
        return `Paciente ${patient} não rejeita ${donor} no sistema ABO nem no fator Rh.`;
    }

    const aboIncompatible = !(ABO_COMPATIBILITY[pAbo] || []).includes(dAbo);
    const rhIncompatible = Boolean(rhEnabled && pRh === '-' && dRh === '+');

    if (aboIncompatible && rhIncompatible) {
        return `Tipo ${pAbo} tem ${ABO_ANTIBODIES[pAbo]} e paciente Rh− não pode receber sangue Rh+.`;
    }
    if (rhIncompatible) {
        return 'Paciente Rh− não pode receber sangue Rh+, pois pode produzir anticorpos Anti-D.';
    }
    if (aboIncompatible && ABO_ANTIBODIES[pAbo]) {
        return `Tipo ${pAbo} tem ${ABO_ANTIBODIES[pAbo]} no plasma e rejeita sangue ${dAbo}.`;
    }
    return `O sangue ${donor} é incompatível com o paciente ${patient}.`;
}

// ===== Geradores por tipo de pergunta =====

function buildAboDonatePool() {
    // Na Cidade 1 (4 tipos ABO), usa conjuntos exatos de doadores para garantir 4 alternativas distintas.
    const wrongByPatient = {
        A: ['A e B', 'Apenas A', 'B e AB'],
        B: ['A e B', 'Apenas B', 'A e AB'],
        AB: ['Apenas AB', 'A e B', 'Apenas O'],
        O: ['A e O', 'B e O', 'A, B, AB e O']
    };

    return ABO_TYPES.map((patient) => {
        const donors = ABO_TYPES.filter((d) => canReceive(patient, d, { rhEnabled: false }));
        const correct = formatTypeList(donors);
        const options = shuffle([correct, ...wrongByPatient[patient]]);
        const explanation = patient === 'AB'
            ? 'AB é receptor universal no ABO: recebe de A, B, AB e O.'
            : patient === 'O'
                ? 'Tipo O tem Anti-A e Anti-B no plasma, por isso só recebe de O.'
                : `Tipo ${patient} tem ${ABO_ANTIBODIES[patient]} no plasma, então recebe apenas de ${formatTypeList(donors)}.`;

        return {
            key: `donate:abo:${patient}`,
            kind: 'whoCanDonateTo',
            format: 'choice4',
            prompt: `Quem pode doar sangue para o paciente tipo ${patient}?`,
            options,
            correctAnswer: correct,
            explanation
        };
    });
}

function buildAboReceivePool() {
    const wrongByDonor = {
        A: ['A e O', 'Apenas A', 'B e AB'],
        B: ['B e O', 'Apenas B', 'A e AB'],
        AB: ['A e AB', 'B e AB', 'A, B, AB e O'],
        O: ['Apenas O', 'A e B', 'O e AB']
    };

    return ABO_TYPES.map((donor) => {
        const recipients = ABO_TYPES.filter((p) => canReceive(p, donor, { rhEnabled: false }));
        const correct = formatTypeList(recipients);
        const options = shuffle([correct, ...wrongByDonor[donor]]);
        const explanation = donor === 'O'
            ? 'Tipo O é doador universal no ABO: não tem antígenos A nem B.'
            : donor === 'AB'
                ? 'Tipo AB tem antígenos A e B, então só pode doar para AB.'
                : `Sangue tipo ${donor} possui antígeno ${donor}, podendo doar apenas para ${formatTypeList(recipients)}.`;

        return {
            key: `receive:abo:${donor}`,
            kind: 'whoCanReceiveFrom',
            format: 'choice4',
            prompt: `Quem pode receber sangue do doador tipo ${donor}?`,
            options,
            correctAnswer: correct,
            explanation
        };
    });
}

function buildRhDonatePool() {
    const questions = [];
    RH_BLOOD_TYPES.forEach((patient) => {
        const compatible = RH_BLOOD_TYPES.filter((d) => canReceive(patient, d, { rhEnabled: true }));
        const incompatible = RH_BLOOD_TYPES.filter((d) => !canReceive(patient, d, { rhEnabled: true }));
        if (compatible.length === 0 || incompatible.length < 3) {
            return;
        }
        const correct = shuffle(compatible)[0];
        const wrongs = shuffle(incompatible).slice(0, 3);
        const options = shuffle([correct, ...wrongs]);
        const pRh = getRh(patient);
        const explanation = pRh === '-'
            ? `${patient} só recebe Rh− compatível no ABO; entre as opções, apenas ${correct} serve.`
            : `${patient} pode receber ${correct} (compatível no ABO e no fator Rh).`;

        questions.push({
            key: `donate:rh:${patient}`,
            kind: 'whoCanDonateTo',
            format: 'choice4',
            prompt: `Qual destes tipos pode doar sangue para o paciente ${patient}?`,
            options,
            correctAnswer: correct,
            explanation
        });
    });
    return questions;
}

function buildRhReceivePool() {
    const questions = [];
    RH_BLOOD_TYPES.forEach((donor) => {
        const compatible = RH_BLOOD_TYPES.filter((p) => canReceive(p, donor, { rhEnabled: true }));
        const incompatible = RH_BLOOD_TYPES.filter((p) => !canReceive(p, donor, { rhEnabled: true }));
        if (compatible.length === 0 || incompatible.length < 3) {
            return;
        }
        const correct = shuffle(compatible)[0];
        const wrongs = shuffle(incompatible).slice(0, 3);
        const options = shuffle([correct, ...wrongs]);
        const dRh = getRh(donor);
        const explanation = dRh === '+'
            ? `Sangue ${donor} (Rh+) só pode ser recebido por pacientes Rh+ compatíveis no ABO, como ${correct}.`
            : `Sangue ${donor} pode ser recebido por ${correct} sem incompatibilidade ABO/Rh.`;

        questions.push({
            key: `receive:rh:${donor}`,
            kind: 'whoCanReceiveFrom',
            format: 'choice4',
            prompt: `Qual destes pacientes pode receber sangue do tipo ${donor}?`,
            options,
            correctAnswer: correct,
            explanation
        });
    });
    return questions;
}

function buildYesNoPool(rhEnabled) {
    const pool = rhEnabled ? RH_BLOOD_TYPES : ABO_TYPES;
    const questions = [];

    pool.forEach((patient) => {
        pool.forEach((donor) => {
            const allowed = canReceive(patient, donor, { rhEnabled });
            questions.push({
                key: `yn:${rhEnabled ? 'rh' : 'abo'}:${patient}:${donor}`,
                kind: 'canReceiveYesNo',
                format: 'yesno',
                prompt: `O paciente ${patient} pode receber sangue ${donor}?`,
                options: ['Sim', 'Não'],
                correctAnswer: allowed ? 'Sim' : 'Não',
                explanation: buildYesNoExplanation(patient, donor, allowed, rhEnabled)
            });
        });
    });

    return questions;
}

function buildContaminatedPool() {
    const samplePatient = shuffle(RH_BLOOD_TYPES)[0];
    const normalChoices = shuffle(RH_BLOOD_TYPES).slice(0, 3);
    const contaminatedCanBeUsed = canReceive(samplePatient, 'C+', { rhEnabled: true });

    return [
        {
            key: 'contam:yn:general',
            kind: 'contaminated',
            format: 'yesno',
            prompt: 'Uma bolsa com selo de perigo pode ser usada na transfusão?',
            options: ['Sim', 'Não'],
            correctAnswer: contaminatedCanBeUsed ? 'Sim' : 'Não',
            explanation: 'Bolsas com selo de perigo foram reprovadas na triagem e nunca podem ser usadas.'
        },
        {
            key: `contam:yn:patient:${samplePatient}`,
            kind: 'contaminated',
            format: 'yesno',
            prompt: `O paciente ${samplePatient} pode receber uma bolsa com selo de perigo?`,
            options: ['Sim', 'Não'],
            correctAnswer: canReceive(samplePatient, 'C-', { rhEnabled: true }) ? 'Sim' : 'Não',
            explanation: 'Nenhum paciente pode receber bolsa contaminada, mesmo que o tipo sanguíneo combine.'
        },
        {
            key: 'contam:choice:meaning',
            kind: 'contaminated',
            format: 'choice4',
            prompt: 'O que indica o selo de perigo em uma bolsa de sangue?',
            options: shuffle([
                'Bolsa contaminada',
                'Doador universal',
                'Apenas para Rh+',
                'Pronta para uso'
            ]),
            correctAnswer: 'Bolsa contaminada',
            explanation: 'O selo de perigo indica bolsa reprovada na triagem (infecção) que deve ser descartada.'
        },
        {
            key: 'contam:choice:discard',
            kind: 'contaminated',
            format: 'choice4',
            prompt: 'Qual destas bolsas deve ser descartada na triagem e nunca transfundida?',
            options: shuffle(['Selo de perigo', ...normalChoices]),
            correctAnswer: 'Selo de perigo',
            explanation: 'Apenas bolsas aprovadas na triagem podem ser usadas; bolsas com selo de perigo são descartadas.'
        }
    ];
}

/**
 * Gera uma rodada de perguntas unicas de acordo com a cidade atual (cityIndex 0, 1 ou 2).
 */
export function generateQuizRound({ cityIndex = 0, count = QUIZ_QUESTIONS_PER_ROUND } = {}) {
    const rules = getCityOccurrenceRules(cityIndex);
    const rhEnabled = rules.rhEnabled;
    const includeContaminated = rules.contaminatedBags > 0;

    const donatePool = shuffle(rhEnabled ? buildRhDonatePool() : buildAboDonatePool());
    const receivePool = shuffle(rhEnabled ? buildRhReceivePool() : buildAboReceivePool());
    const yesNoAll = buildYesNoPool(rhEnabled);
    const yesNoSim = shuffle(yesNoAll.filter((q) => q.correctAnswer === 'Sim'));
    const yesNoNao = shuffle(yesNoAll.filter((q) => q.correctAnswer === 'Não'));
    const contaminatedPool = includeContaminated ? shuffle(buildContaminatedPool()) : [];

    const selected = [];
    const usedKeys = new Set();

    const pickFrom = (pool, amount) => {
        let picked = 0;
        for (const q of pool) {
            if (picked >= amount || selected.length >= count) break;
            if (!usedKeys.has(q.key)) {
                usedKeys.add(q.key);
                selected.push(q);
                picked++;
            }
        }
    };

    if (includeContaminated) {
        pickFrom(contaminatedPool, Math.min(2, count));
    }
    pickFrom(donatePool, 2);
    pickFrom(receivePool, 2);
    pickFrom(yesNoSim, 1);
    pickFrom(yesNoNao, 1);

    // Completa o restante da rodada sem repetir perguntas.
    const fallbackPool = shuffle([
        ...yesNoSim,
        ...yesNoNao,
        ...donatePool,
        ...receivePool,
        ...contaminatedPool
    ]);
    pickFrom(fallbackPool, count - selected.length);

    return shuffle(selected).slice(0, count);
}

export function calculateQuizReward(correctCount, totalQuestions = QUIZ_QUESTIONS_PER_ROUND) {
    const safeCorrect = Math.max(0, Math.min(totalQuestions, Math.floor(correctCount || 0)));
    const baseAtp = safeCorrect * QUIZ_ATP_PER_CORRECT;
    const perfectBonus = (totalQuestions > 0 && safeCorrect === totalQuestions) ? QUIZ_PERFECT_BONUS_ATP : 0;
    return {
        correctCount: safeCorrect,
        totalQuestions,
        baseAtp,
        perfectBonus,
        totalAtp: baseAtp + perfectBonus
    };
}
