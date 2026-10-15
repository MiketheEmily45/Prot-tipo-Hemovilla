// Mapa chave -> caminho das imagens do minigame.
// Se algum arquivo for renomeado, so este arquivo precisa mudar.
export const MINIGAME_ASSETS = {
    'minigame-background': 'assets/Minigame/Cenario/SalaHospital.png',
    'pause-button': 'assets/Telas/Botoes/botao_pausa.png',
    'agulha-vazia': 'assets/Minigame/Agulhas/Vazia.png',
    'agulha-metade': 'assets/Minigame/Agulhas/Metade Completa.png',
    'agulha-cheia': 'assets/Minigame/Agulhas/Cheia.png',
    'frasco-vazio': 'assets/Minigame/Frasco(Sangue)/FrascoVazio.png',
    'frasco-cheio': 'assets/Minigame/Frasco(Sangue)/FrascoCheio.png',
    'frasco-anti-a': 'assets/Minigame/Frasco(Antigenos)/FrascoAntigenoA.png',
    'frasco-anti-b': 'assets/Minigame/Frasco(Antigenos)/FrascoAntigenoB.png',
    'bancada-vazia': 'assets/Minigame/Cenario/SalaAnalise/BancadaLaboratorio.png',
    'bancada-soros': 'assets/Minigame/Cenario/SalaAnalise/pixil-frame-0 (2).png',
    'bancada-sangue-poco1': 'assets/Minigame/Cenario/SalaAnalise/pixil-frame-0 (3).png',
    'bancada-sangue': 'assets/Minigame/Cenario/SalaAnalise/pixil-frame-0 (4).png',
    'bancada-resultado-5': 'assets/Minigame/Cenario/SalaAnalise/pixil-frame-0 (5).png',
    'bancada-resultado-6': 'assets/Minigame/Cenario/SalaAnalise/pixil-frame-0 (6).png',
    'bancada-resultado-8': 'assets/Minigame/Cenario/SalaAnalise/pixil-frame-0 (8).png',
    'bancada-resultado-9': 'assets/Minigame/Cenario/SalaAnalise/pixil-frame-0 (9).png'
};

// Tipo ABO -> chave da imagem de resultado da bancada.
// mapeamento provisório, confirmar com o Carlos
export const BENCH_RESULT_FRAMES = {
    A: 'bancada-resultado-5',
    B: 'bancada-resultado-6',
    AB: 'bancada-resultado-8',
    O: 'bancada-resultado-9'
};
