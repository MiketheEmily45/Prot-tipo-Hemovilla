// Configuração do cálculo de ATP por atendimento.
// Fórmula: ATP = round5(BASE_TEMPO[tempoDoPersonagem] * DESEMPENHO * MULT_CIDADE[cidade]) + BONUS_RAPIDO

// Valor base de ATP de acordo com o intervalo fixo do personagem (em minutos).
export const BASE_TEMPO = {
    1: 100,
    2: 125,
    4: 175
};

// Multiplicador de ATP por cidade (1 = Cidade 1, 2 = Cidade 2, 3 = Cidade 3).
export const MULT_CIDADE = {
    1: 1.0,
    2: 1.5,
    3: 2.0
};

// Bônus fixo por concluir dentro do tempo esperado (somado depois dos multiplicadores).
export const BONUS_RAPIDO = 20;
