# Hemovilla: Missão ABO

Jogo educativo sobre tipagem sanguínea (sistema ABO e fator Rh), desenvolvido em **Phaser 3** para apoio a aulas de Biologia no **CEFET-MG — Campus Varginha**. O jogador assume o papel de responsável pelos atendimentos em Hemovilla, coletando amostras, identificando o tipo sanguíneo dos moradores e realizando transfusões seguras.

**Jogue online:** [LINK DO ITCH.IO]

<!-- Espaço reservado para screenshots ou GIFs do jogo (menu inicial, mapa da cidade e fases do minigame). -->

---

## Como jogar

O jogo se passa em **3 cidades**, cada uma com **3 personagens** (9 moradores no total). Conforme o tempo passa no mapa, surgem alertas de ocorrência sobre os personagens; ao clicar no personagem com alerta, inicia-se o atendimento em um minigame de **3 fases**, com **3 corações** compartilhados:

1. **Coleta de sangue:** arraste a seringa até o paciente na poltrona para coletar a amostra e deposite-a no tubo de coleta.
2. **Tipagem na bancada (primeiro atendimento de cada personagem):** pingue os soros reagentes na amostra para identificar o tipo sanguíneo — **Anti-A** e **Anti-B** (sistema ABO) e, a partir da Cidade 2, **Anti-D** (fator Rh). Depois de descoberto, o tipo fica registrado e os próximos atendimentos daquele personagem pulam direto para a transfusão.
3. **Transfusão:** escolha na prateleira uma bolsa de sangue compatível com o paciente. Na Cidade 3, é preciso também identificar e evitar **bolsas contaminadas** (marcadas com selo amarelo de perigo).

Cada atendimento concluído rende **ATP** (a moeda do jogo), calculado com base no personagem, na cidade, na quantidade de erros e em um bônus de rapidez.

- **Cidade 1 — Centro:** liberada desde o início (tipagem ABO).
- **Cidade 2 — Distrito Profissional:** liberada automaticamente após atender os 3 personagens da Cidade 1 (introduz fator Rh e pacientes Rh-).
- **Cidade 3 — Periferia/lazer:** pode ser comprada por **1000 ATP** após liberar a Cidade 2, tanto pela tela de seleção de cidades quanto pela loja (inclui fator Rh e bolsas contaminadas).

---

## Principais recursos

- **Guia de Atendimento integrado:** acessível durante o minigame (pausa o relógio do atendimento), com abas de *Tipos*, *Compatibilidade* (ABO e Rh) e *Contaminadas* (triagem de HIV, Hepatites B e C, Sífilis e Doença de Chagas).
- **Tutorial guiado:** legendas passo a passo no mapa, nas fases do minigame e na seleção de cidade, com opção de pular ou reativar a qualquer momento.
- **Loja:** permite comprar a **Cidade 3** (1000 ATP) e **3 personagens extras** — **Douglas / Professor Doug** (600 ATP), **Cristina** (600 ATP) e **Enfermeira** (500 ATP) — que podem substituir visualmente moradores originais de cidades já liberadas.
- **Menu de pause (`ESC` ou botão de pausa):** disponível no mapa e no minigame; congela temporizadores, animações e física, permitindo continuar, acessar configurações, voltar para a cidade ou ir ao menu inicial.
- **Tela de configurações:** sliders e mudo independentes para música e efeitos sonoros (SFX), alternância de tela cheia, restauração dos volumes padrão, reativação das dicas do tutorial e opção de zerar todo o progresso (com confirmação).
- **Salvamento automático:** o progresso (ATP, personagens atendidos, tipos descobertos, cidades compradas, itens da loja e configurações) é salvo automaticamente no navegador via `localStorage`.

---

## Tecnologias usadas

- **HTML5** e **JavaScript (ES Modules)** — sem etapa de build nem dependências npm.
- **Phaser 3.90.0** — incluído localmente em `phaser.js`.
- **Web Storage API (`localStorage`)** — persistência de progresso e configurações no navegador.
- **Node.js (`node:assert/strict`)** — execução dos testes automatizados em `tests/`.

---

## Como rodar localmente

Por usar módulos JavaScript (`<script type="module">`), o jogo precisa ser aberto por um servidor HTTP local (não funciona abrindo o `index.html` diretamente pelo sistema de arquivos).

### Usando o VS Code + Live Server (recomendado)

1. Clone o repositório e abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server** (`ritwickdey.LiveServer`), caso ainda não tenha.
3. Clique em **Go Live** na barra inferior do VS Code (a porta `5501` já está configurada em `.vscode/settings.json`).
4. Acesse no navegador: `http://127.0.0.1:5501/index.html`

### Alternativa sem VS Code

Na raiz do repositório, inicie qualquer servidor estático, por exemplo:

```bash
# Com Python 3
python -m http.server 5501

# Ou com Node.js
npx serve -l 5501 .
```

Em seguida, abra `http://127.0.0.1:5501/index.html` no navegador.

---

## Modo debug

Adicione `?debug` ao final da URL (por exemplo, `http://127.0.0.1:5501/index.html?debug`) para habilitar os atalhos de depuração:

| Atalho | Onde funciona | O que faz |
| --- | --- | --- |
| `F7` | Qualquer tela | Alterna a liberação de todas as cidades apenas em memória (não salva no `localStorage`). |
| `F8` | Qualquer tela | Alterna o modo "não salvar progresso" (impede gravação de ATP, atendidos, tipos descobertos, cidades e loja, e força a Fase 2 de tipagem). |
| `F9` | Qualquer tela | Zera todo o progresso salvo no `localStorage`, reinicia os relógios de ocorrência e recarrega a cena atual. |
| `Y` | Qualquer tela | Adiciona **500 ATP** ao saldo (respeitando o modo sem salvar do `F8`). |
| `T` | Mapa (`GameMap`) | Adianta **30 segundos** nos relógios de ocorrência da cidade ativa. |
| `L` | Mapa (`GameMap`) | Exibe no console do navegador uma tabela com o estado e o tempo restante dos 9 personagens. |

---

## Testes

Os testes ficam em `tests/*.mjs` e rodam diretamente com **Node.js** (sem necessidade de instalar pacotes).

Para executar um teste específico:

```bash
node tests/attendance-state.mjs
```

Para executar todos os arquivos de teste em sequência:

```powershell
# PowerShell (Windows)
Get-ChildItem tests/*.mjs | ForEach-Object { Write-Host "==> $($_.Name)"; node $_.FullName }
```

```bash
# Bash (Linux/macOS)
for f in tests/*.mjs; do echo "==> $f"; node "$f"; done
```

> **Problema conhecido:** o teste `tests/city-characters.mjs` falha atualmente (`TypeError: scene.sound.add is not a function`) devido a um mock antigo de `scene.sound` que não acompanha a versão atual do gerenciador de áudio. Os demais 9 testes passam normalmente.

---

## Estrutura de pastas

```text
.
├── index.html          # Ponto de entrada HTML que carrega o Phaser e src/main.js
├── phaser.js           # Biblioteca Phaser 3.90.0 embutida no projeto
├── .vscode/            # Configurações do workspace (porta 5501 do Live Server)
├── src/                # Código-fonte do jogo (main.js e cenas/módulos em src/scenes/)
├── assets/             # Recursos de arte e áudio (Mapas, Minigame, Personagens, Telas, Musica, SFX)
└── tests/              # Testes automatizados em Node.js (*.mjs)
```

---

## Equipe

- **Mateus** — Programação
- **Miguel** — Programação
- **Kauan** — Gestão do projeto
- **Carlos Daniel** — Arte
- **Guilherme** — Áudio

---

## Contexto acadêmico

Projeto desenvolvido na disciplina **Laboratório de Projeto Aplicado (LPA)** do curso **Técnico em Informática** no **CEFET-MG — Campus Varginha**, com o objetivo de servir como recurso didático interativo para o ensino de tipagem sanguínea e compatibilidade transfusional em aulas de Biologia.
