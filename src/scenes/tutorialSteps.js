// Textos do tutorial (legendas). Edite aqui: cada secao e uma lista de passos.
// Legendas com mais de 3 linhas sao divididas automaticamente em duas (ou mais) pelo TutorialCaption.
//
// Secoes (os nomes sao os mesmos flags guardados em settingsStore.js):
//   intro                    A1-A3  mapa, Cidade 1, primeira vez
//   ocorrenciaInicial        A4     alerta do Seu Joaquim (legenda fica na tela sem bloquear)
//   minigameFase1/2/3        C1-C7  primeira vez que cada fase abre
//   minigameFase2Rh          C8-C9  primeira vez que a Etapa 2 (Anti-D / Rh) abre na Cidade 2
//   aposPrimeiroAtendimento  D1-D3  de volta ao mapa depois do primeiro atendimento
//   selecaoCidade            E1     primeira vez que a selecao de cidade abre

export const TUTORIAL_STEPS = Object.freeze({
    intro: [
        { id: 'A1', text: 'Bem-vindo ao Hemovilla! Nesta cidade, você ajuda moradores que precisam de uma transfusão de sangue.' },
        { id: 'A2', text: 'Os moradores andam pela cidade. Clique em um deles, ou no ícone de algum deles aqui embaixo, para conhecê-los melhor.' },
        { id: 'A3', text: 'O seu saldo de ATP, a moeda do jogo, fica no canto inferior direito.' }
    ],
    ocorrenciaInicial: [
        { id: 'A4', text: 'Opa! O Seu Joaquim precisa de ajuda. Clique nele e use o botão do minigame para atendê-lo.' }
    ],
    minigameFase1: [
        { id: 'C1', text: 'Fase 1 — Coleta: arraste a seringa até a poltrona, segure o clique para enchê-la com o sangue do paciente e leve-a até o tubo de coleta.' }
    ],
    minigameFase2: [
        { id: 'C2', text: 'Fase 2 — Tipagem: descubra o tipo sanguíneo! Misture o sangue com os soros e observe se ele forma grumos (aglutinação).' },
        { id: 'C3', text: 'Aglutinou com o Anti-A: tem antígeno A. Com o Anti-B: tem B. Com os dois: AB. Sem reação: tipo O.' },
        { id: 'C4', text: 'Agora escolha o tipo sanguíneo certo. Cada erro tira um dos seus 3 corações.' },
        { id: 'C5', text: 'Em dúvida? O botão de guia, no canto superior direito, mostra os tipos e as compatibilidades.' }
    ],
    minigameFase2Rh: [
        { id: 'C8', text: 'Etapa 2 — Fator Rh: pingue o soro Anti-D e o sangue só no Poço 1 e misture (o Poço 2 não é usado aqui).' },
        { id: 'C9', text: 'Aglutinou (formou grumos) é Rh+. Ficou liso é Rh−. Depois escolha o fator Rh certo — o guia mostra as regras.' }
    ],
    minigameFase3: [
        { id: 'C6', text: 'Fase 3 — Transfusão: arraste a bolsa de sangue compatível até o paciente.' },
        { id: 'C7', text: 'Bolsa errada tira um coração. Se os três acabarem, você tenta de novo.' }
    ],
    aposPrimeiroAtendimento: [
        { id: 'D1', text: 'Atendimento concluído! Você ganhou ATP. Os outros moradores também vão pedir ajuda com o tempo.' },
        { id: 'D2', text: 'Atenda os 3 moradores da Cidade 1 para liberar a Cidade 2. O botão com os prédios abre a seleção de cidades.' },
        { id: 'D3', text: 'Enquanto espera novas ocorrências, clique em Quiz para ganhar ATP extra! Você pode fechar e continuar depois.' }
    ],
    selecaoCidade: [
        { id: 'E1', text: 'Aqui você escolhe a cidade. A Cidade 2 abre ao atender a Cidade 1 e, com ela liberada, a Cidade 3 pode ser comprada com ATP.' }
    ]
});

// true = informativa (bloqueia os cliques na cena de tras ate avancar);
// false = pede uma acao do jogador (a legenda fica na tela sem bloquear o jogo).
export const TUTORIAL_SECTION_BLOCKING = Object.freeze({
    intro: true,
    ocorrenciaInicial: false,
    minigameFase1: false,
    minigameFase2: false,
    minigameFase2Rh: false,
    minigameFase3: false,
    aposPrimeiroAtendimento: true,
    selecaoCidade: true
});

// Posicao da borda de baixo da caixa, por secao (px). Sem entrada = rodape da tela (ou do mapa).
// No minigame o rodape tem as bolsas, os botoes de tipo e a seringa; por isso a legenda fica logo acima
// dessa faixa de controles, como no mapa ela fica acima da barra dos icones.
export const TUTORIAL_CAPTION_BOTTOM_Y = Object.freeze({
    minigameFase1: 392,
    minigameFase2: 463,
    minigameFase2Rh: 452,
    minigameFase3: 398
});

export const TUTORIAL_SKIP_LABEL = 'Pular tutorial';
