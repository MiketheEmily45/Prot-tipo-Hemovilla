# Relatório de Refatoração Orientada a Objetos (POO)

Este documento descreve a refatoração orientada a objetos aplicada ao projeto **Hemovilla: Missão ABO**, mantendo a compatibilidade estrita com a suíte de testes existente (`node tests/city-characters.mjs`) e sem alterar nenhuma regra de roteiro ou asset do jogo.

---

## 1. Nova Estrutura de Classes

A arquitetura do projeto foi reorganizada em classes coesas e com responsabilidades bem definidas:

1. **`Character`** (`src/scenes/Character.js`)
   - Representa cada entidade de personagem interativa no mapa.
   - Encapsula o sprite, chave de identificação, offsets (balão e alerta), intervalos de alerta, gênero, estado de pausa por clique e referências a botões/balão.

2. **`CharacterMovement`** (`src/scenes/CharacterMovement.js`)
   - Classe única e configurável de movimentação autônoma para todos os personagens (sem fachadas ou nomes específicos de personagens).
   - Suporta movimentação horizontal (eixo X com limites `minX` e `maxX`) e vertical (eixo Y com distância limite ou colisão `blocked`).
   - Suporta pausas autônomas periódicas opcionais (`hasPause`, `pauseTime`, `nextDirectionChange`), utilizadas por personagens com patrulha pausada como o Seu Joaquim, além de paradas e retomadas por interação com o jogador para todos os NPCs.

3. **`MapControls`** (`src/scenes/MapControls.js`)
   - Responsável pelos botões fixos de controle no mapa: botão de pausa (retorno à tela inicial) e botão de alerta global.

4. **`AlertManager`** (`src/scenes/AlertManager.js`)
   - Centraliza o gerenciamento de alertas dos personagens.
   - Controla verificação de prazos (`nextAlertTime`), instanciação do ícone de alerta, reprodução do som de alerta (`alert-sound`), destaque dos ícones da barra inferior (`tint`) e atualização de estado dos botões do minigame.

5. **`CharacterDescriptionPanel`** (`src/scenes/CharacterDescriptionPanel.js`)
   - Gerencia a abertura e fechamento do painel/moldura de descrição dos personagens.
   - Utiliza configuração de dimensões e tipografia independente (`DESCRIPTION_PANEL_CONFIG`), desacoplada de dados de personagens específicos, garantindo texto uniforme (título 22px, corpo 18px).
   - Controla overlay escurecido, máscara de rolagem e evento de scroll pelo mouse (`wheel`).

6. **`CityNavigation`** (`src/scenes/CityNavigation.js`)
   - Gerencia a navegação entre cidades, camadas de background em tileSprites e visibilidade dos botões anterior/próximo.

7. **`CityNavigationButtons`** e **`CharacterIconButtonBar`** (`src/scenes/IconButtons.js`)
   - `CityNavigationButtons`: gerencia as setas direcionais da navegação.
   - `CharacterIconButtonBar`: gerencia os botões de ícone dos personagens na parte inferior do mapa.

8. **`ClickableCharacterManager`** (`src/scenes/ClickableCharacterManager.js`)
   - Gerencia a detecção de cliques nos personagens, reprodução dos sons por gênero (`MasculineHuh` e `FeminineHuh`), criação do balão temporário e botões de minigame e descrição.

9. **`CityCharacterGroupManager`** (`src/scenes/CityCharacters.js`)
   - Gerencia a retenção de estado (personagens, posições, alertas e temporizadores) ao alternar entre as cidades do mapa, sem recriar personagens desnecessariamente.

10. **Cenas Phaser (`Start`, `GameMap`, `Minigame`, `ConfigMenu`)**
    - Todas as cenas foram estruturadas em métodos de inicialização dedicados (`setupViewport`, `setupBackground`, `setupControls`, etc.).

---

## 2. O Que Mudou em Cada Arquivo

- **`src/scenes/GameMap.js`**:
  - Removido `JoaquimController` e chamada exclusiva de preload/instanciação do Joaquim.
  - Seu Joaquim é instanciado pela mesma fábrica `createCityCharacter` que os demais NPCs a partir da lista unificada `allCity1Characters`.
  - O loop de atualização percorre `this.npcs.forEach(m => m.update(time))`.
- **`src/scenes/CharacterMovement.js`**:
  - Classe unificada `CharacterMovement` configurável por eixo (`horizontal`/`vertical`), limites, velocidade, física (`immovable`) e pausas opcionais.
  - Removidas todas as classes e fachadas legadas (`HorizontalMovement`, `JoaquimMovement`, `createHorizontalWalker`, etc.).
- **`src/scenes/CityCharacters.js`**:
  - Definida a configuração declarativa `joaquimCharacter` contendo todos os seus parâmetros específicos (física, eixos, frames, texturas idle, gênero e `sceneProperty: 'joaquim'`).
  - Removidos tratamentos condicionais `if (id === 'joaquim')` e funções de preload separadas.
  - A fábrica unificada `createCityCharacter(scene, config)` instancia qualquer personagem de forma totalmente genérica.
  - Renomeada a coleção de controle de movimentação para `scene.npcs`.
- **`src/scenes/ClickableCharacterManager.js`**:
  - Obtenção de gênero prioriza a propriedade `character.gender` declarada na configuração do personagem, com fallback para o conjunto estático de IDs.
- **`src/scenes/CharacterDescriptionPanel.js`**:
  - Removida a dependência do texto do Seu Joaquim para dimensionamento de fonte.
  - Adicionada a constante `DESCRIPTION_PANEL_CONFIG` com valores fixos de tipografia (18px corpo, 22px título, entrelinha 2px) e dimensões de painel equivalentes.
- **`src/scenes/IconButtons.js`**:
  - Inicialização padrão dos IDs da barra de ícones baseada em `allCity1Characters`.
- **`src/scenes/JoaquimController.js`**:
  - Arquivo excluído, pois seu propósito foi absorvido pelo pipeline unificado de personagens e pelo `CharacterMovement`.
- **`src/scenes/MapControls.js`**:
  - Centraliza a criação e interação dos botões de pausa e alerta.
- **`src/scenes/Character.js`**:
  - Representa os dados e estado dos personagens interativos no mapa.
- **`src/scenes/AlertManager.js`**:
  - Centraliza sons, temporizadores, ícones e visual dos alertas.
- **`src/scenes/CityNavigation.js`**:
  - Incrementado com métodos OO e getters.
- **`src/scenes/Minigame.js`, `Start.js`, `ConfigMenu.js`**:
  - Métodos modulares e limpos para cada etapa de setup.
- **`tests/city-characters.mjs`**:
  - Atualizado para testar `CharacterMovement` diretamente e referenciar a lista unificada `scene.npcs`.

---

## 3. Limpeza Final Realizada

Nesta rodada final de limpeza:
1. **Eliminação de Fachadas Legadas**: As fachadas `HorizontalMovement`, `JoaquimMovement` e funções auxiliares legadas foram completamente removidas. A classe de movimentação agora é puramente `CharacterMovement`.
2. **Unificação da Lista de NPCs**: A propriedade `scene.horizontalNPCs` foi renomeada para `scene.npcs`, refletindo que todos os NPCs da cidade atual (verticais ou horizontais) são gerenciados no mesmo array.
3. **Desacoplamento do Painel de Descrição**: O cálculo de fonte do painel de descrição deixou de ler a string de descrição do Seu Joaquim, adotando `DESCRIPTION_PANEL_CONFIG` calibrada exatamente para o mesmo resultado visual.
4. **Generalização Total da Configuração do Joaquim**: Todas as regras que antes eram tratadas por condicionais `if (id === 'joaquim')` (gênero, registro de `scene.joaquim`, parâmetros de animação e colisão física) foram movidas para a estrutura declarativa de configuração (`joaquimCharacter`).

---

## 4. O Que Não Foi Possível Manter Igual

- As fachadas `HorizontalMovement` e `JoaquimMovement` foram removidas em favor do uso direto de `CharacterMovement`.
- A propriedade `scene.horizontalNPCs` foi substituída por `scene.npcs`.
- Nenhuma chave de asset, física, aparência ou regra de jogabilidade foi alterada.

---

## 5. O Que Ficou Pendente

- **Nada ficou pendente**. Todas as regras, criação unificada de todos os NPCs, limpeza das fachadas, desacoplamento do painel e a suíte de testes (`node tests/city-characters.mjs`) foram validadas com 100% de sucesso.
