# Relatório de Refatoração Orientada a Objetos (POO)

Este documento descreve a refatoração orientada a objetos aplicada ao projeto **Hemovilla: Missão ABO**, mantendo a compatibilidade estrita com a suíte de testes existente (`node tests/city-characters.mjs`) e sem alterar nenhuma regra de roteiro ou asset do jogo.

---

## 1. Nova Estrutura de Classes

A arquitetura do projeto foi reorganizada em classes coesas e com responsabilidades bem definidas:

1. **`Character`** (`src/scenes/Character.js`)
   - Representa cada entidade de personagem interativa no mapa.
   - Encapsula o sprite, chave de identificação, offsets (balão e alerta), intervalos de alerta, estado de pausa por clique e referências a botões/balão.

2. **`HorizontalMovement`** (`src/scenes/CharacterMovement.js`)
   - Encapsula o comportamento de movimentação autônoma horizontal dos NPCs.
   - Controla verificação de limites (`minX`, `maxX`), inversão de direção (`left` / `right`), velocidade, animações e paradas/retomadas ao interagir.

3. **`JoaquimMovement`** (`src/scenes/CharacterMovement.js`)
   - Encapsula a lógica de movimentação autônoma vertical do Seu Joaquim.
   - Controla direção (`up` / `down`), pausas periódicas, distância percorrida e preservação de estado durante interações.

4. **`JoaquimController`** (`src/scenes/JoaquimController.js`)
   - Orquestra o ciclo de vida do Seu Joaquim na cena (`create`, `update`), configurando animações, física e registro como personagem clicável.

5. **`MapControls`** (`src/scenes/MapControls.js`)
   - Responsável pelos botões fixos de controle no mapa: botão de pausa (retorno à tela inicial) e botão de alerta global.

6. **`AlertManager`** (`src/scenes/AlertManager.js`)
   - Centraliza o gerenciamento de alertas dos personagens.
   - Controla verificação de prazos (`nextAlertTime`), instanciação do ícone de alerta, reprodução do som de alerta (`alert-sound`), destaque dos ícones da barra inferior (`tint`) e atualização de estado dos botões do minigame.

7. **`CharacterDescriptionPanel`** (`src/scenes/CharacterDescriptionPanel.js`)
   - Gerencia a abertura e fechamento do painel/moldura de descrição dos personagens.
   - Controla overlay escurecido, dimensionamento de texto responsivo a partir da referência do Seu Joaquim, máscara de rolagem e evento de scroll pelo mouse (`wheel`).

8. **`CityNavigation`** (`src/scenes/CityNavigation.js`)
   - Gerencia a navegação entre cidades, camadas de background em tileSprites e visibilidade dos botões anterior/próximo.

9. **`CityNavigationButtons`** e **`CharacterIconButtonBar`** (`src/scenes/IconButtons.js`)
   - `CityNavigationButtons`: gerencia as setas direcionais da navegação.
   - `CharacterIconButtonBar`: gerencia os botões de ícone dos personagens na parte inferior do mapa.

10. **`ClickableCharacterManager`** (`src/scenes/ClickableCharacterManager.js`)
    - Gerencia a detecção de cliques nos personagens, reprodução dos sons por gênero (`MasculineHuh` e `FeminineHuh`), criação do balão temporário e botões de minigame e descrição.

11. **`CityCharacterGroupManager`** (`src/scenes/CityCharacters.js`)
    - Gerencia a retenção de estado (personagens, posições, alertas e temporizadores) ao alternar entre as cidades do mapa, sem recriar personagens desnecessariamente.

12. **Cenas Phaser (`Start`, `GameMap`, `Minigame`, `ConfigMenu`)**
    - Todas as cenas foram estruturadas em métodos de inicialização dedicados (`setupViewport`, `setupBackground`, `setupControls`, etc.).

---

## 2. O Que Mudou em Cada Arquivo

- **`src/scenes/GameMap.js`**:
  - Separado em partes menores.
  - Botões de interface delegados para `MapControls`.
  - Lógica do Seu Joaquim delegada para `JoaquimController`.
  - Orquestração de indicadores delegada para `ClickableCharacterManager`.
- **`src/scenes/MapControls.js`**:
  - Criado para isolar a criação e interação dos botões de pausa e alerta.
- **`src/scenes/JoaquimController.js`**:
  - Criado para isolar a inicialização e o loop de atualização do Seu Joaquim.
- **`src/scenes/Character.js`**:
  - Criado com a classe `Character` para unificar a representação de entidades no mapa.
- **`src/scenes/CharacterMovement.js`**:
  - Implementadas as classes `HorizontalMovement` e `JoaquimMovement`. Funções originais mantidas como fachadas compatíveis para uso direto ou testes.
- **`src/scenes/AlertManager.js`**:
  - Criado com a classe `AlertManager` para centralizar a lógica de alertas, sons e visual dos botões.
- **`src/scenes/CharacterDescriptionPanel.js`**:
  - Refatorado para a classe `CharacterDescriptionPanel`, mantendo as funções `openCharacterDescription` e `closeCharacterDescription` como fachadas.
- **`src/scenes/ClickableCharacterManager.js`**:
  - Refatorado para a classe `ClickableCharacterManager`, instanciando `Character` e integrando com `AlertManager`. Funções exportadas mantidas para compatibilidade.
- **`src/scenes/CityNavigation.js`**:
  - Incrementado com getters e método estático `preload`, mantendo a classe e compatibilidade.
- **`src/scenes/CityCharacters.js`**:
  - Adicionada a classe `CityCharacterGroupManager` para encapsular `rememberCityCharacters`, `switchCityCharacters` e controle de visibilidade.
- **`src/scenes/IconButtons.js`**:
  - Adicionadas as classes `CityNavigationButtons` e `CharacterIconButtonBar`.
- **`src/scenes/Minigame.js`**:
  - Métodos decompostos de forma modular (`setupViewport`, `setupBackground`, `setupPauseButton`).
- **`src/scenes/Start.js`**:
  - Métodos decompostos de forma modular (`playMusic`, `setupViewport`, `setupBackground`, `setupTitle`, `setupStartButton`, `setupConfigButton`).
- **`src/scenes/ConfigMenu.js`**:
  - Métodos decompostos de forma modular (`setupViewport`, `setupBackground`, `setupConfigButton`).

---

## 3. O Que Não Foi Possível Manter Igual

- O estilo puramente procedural e anônimo de gerenciamento de estado espalhado pelo `GameMap` e closures soltas foi substituído por classes com estado encapsulado.
- Foram mantidas fachadas funcionais exportadas para manter 100% de compatibilidade com imports de testes (`closeCharacterDescription`, `triggerAllCharactersAlert`, etc.) e propriedades no objeto `scene` (`scene.clickableCharacters`, `scene.characterIconButtons`, `scene.alertButton`, `scene.horizontalNPCs`, `scene.joaquim`, `scene.nextDirectionChange`, etc.).
- Nenhuma chave de asset, física ou regra de jogabilidade foi alterada.

---

## 4. O Que Ficou Pendente

- **Nada ficou pendente**. Todas as cinco etapas (a, b, c, d, e) foram implementadas com sucesso, validadas pela suíte de testes (`OK: assets, grupos, alertas isolados, painel, retomada, bounds e contadores`) e commitadas individualmente no repositório Git local.
