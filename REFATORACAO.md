# Relatório de Refatoração Orientada a Objetos (POO)

Este documento descreve a refatoração orientada a objetos aplicada ao projeto **Hemovilla: Missão ABO**, mantendo a compatibilidade estrita com a suíte de testes existente (`node tests/city-characters.mjs`) e sem alterar nenhuma regra de roteiro ou asset do jogo.

---

## 1. Nova Estrutura de Classes

A arquitetura do projeto foi reorganizada em classes coesas e com responsabilidades bem definidas:

1. **`Character`** (`src/scenes/Character.js`)
   - Representa cada entidade de personagem interativa no mapa.
   - Encapsula o sprite, chave de identificação, offsets (balão e alerta), intervalos de alerta, estado de pausa por clique e referências a botões/balão.

2. **`CharacterMovement`** (`src/scenes/CharacterMovement.js`)
   - Classe única e configurável de movimentação autônoma para todos os personagens.
   - Suporta movimentação horizontal (eixo X com limites `minX` e `maxX`) e vertical (eixo Y com distância limite ou colisão `blocked`).
   - Suporta pausas autônomas periódicas opcionais (`hasPause`, `pauseTime`, `nextDirectionChange`), utilizadas pelo Seu Joaquim, além de paradas e retomadas por interação com o jogador para todos os NPCs.
   - Mantém classes derivadas/fachadas `HorizontalMovement` e `JoaquimMovement` para compatibilidade com eventuais chamadores legados.

3. **`MapControls`** (`src/scenes/MapControls.js`)
   - Responsável pelos botões fixos de controle no mapa: botão de pausa (retorno à tela inicial) e botão de alerta global.

4. **`AlertManager`** (`src/scenes/AlertManager.js`)
   - Centraliza o gerenciamento de alertas dos personagens.
   - Controla verificação de prazos (`nextAlertTime`), instanciação do ícone de alerta, reprodução do som de alerta (`alert-sound`), destaque dos ícones da barra inferior (`tint`) e atualização de estado dos botões do minigame.

5. **`CharacterDescriptionPanel`** (`src/scenes/CharacterDescriptionPanel.js`)
   - Gerencia a abertura e fechamento do painel/moldura de descrição dos personagens.
   - Controla overlay escurecido, dimensionamento de texto responsivo a partir da referência do Seu Joaquim, máscara de rolagem e evento de scroll pelo mouse (`wheel`).

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
  - Removido `JoaquimController`.
  - Seu Joaquim é instanciado pela mesma fábrica `createCityCharacter` que os demais NPCs, passando apenas sua configuração (`joaquimCharacter`).
  - O loop de atualização unificado percorre `this.npcMovements.forEach(m => m.update(time))`.
- **`src/scenes/CharacterMovement.js`**:
  - Implementada a classe unificada `CharacterMovement` configurável por eixo (`horizontal`/`vertical`), limites, velocidade e pausas opcionais.
  - As classes `HorizontalMovement` e `JoaquimMovement` e as funções de movimentação foram preservadas como fachadas compatíveis.
- **`src/scenes/CityCharacters.js`**:
  - Definida a configuração `joaquimCharacter`.
  - Criada a função de fábrica unificada `createCityCharacter(scene, config)` que instancia sprites, animações, movimento e personagem clicável para qualquer NPC.
  - Atualizado `CityCharacterGroupManager` para registrar `movements` na suspensão/restauração de cidades.
- **`src/scenes/JoaquimController.js`**:
  - Arquivo excluído, pois seu propósito foi absorvido pelo pipeline unificado de personagens e pelo `CharacterMovement`.
- **`src/scenes/MapControls.js`**:
  - Centraliza a criação e interação dos botões de pausa e alerta.
- **`src/scenes/Character.js`**:
  - Representa os dados e estado dos personagens interativos no mapa.
- **`src/scenes/AlertManager.js`**:
  - Centraliza sons, temporizadores, ícones e visual dos alertas.
- **`src/scenes/CharacterDescriptionPanel.js`**:
  - Encapsulado na classe `CharacterDescriptionPanel`.
- **`src/scenes/ClickableCharacterManager.js`**:
  - Encapsulado na classe `ClickableCharacterManager`, instanciando `Character` e integrando com `AlertManager`.
- **`src/scenes/CityNavigation.js`**:
  - Incrementado com métodos OO e getters.
- **`src/scenes/IconButtons.js`**:
  - Classes `CityNavigationButtons` e `CharacterIconButtonBar`.
- **`src/scenes/Minigame.js`, `Start.js`, `ConfigMenu.js`**:
  - Métodos modulares e limpos para cada etapa de setup.

---

## 3. O Que Não Foi Possível Manter Igual

- O tratamento exclusivo que o Seu Joaquim possuía no loop principal do `GameMap` foi substituído pelo loop padronizado de movimentação de NPCs.
- Foram mantidas fachadas funcionais exportadas para manter 100% de compatibilidade com imports de testes (`closeCharacterDescription`, `triggerAllCharactersAlert`, etc.) e propriedades no objeto `scene` (`scene.clickableCharacters`, `scene.characterIconButtons`, `scene.alertButton`, `scene.horizontalNPCs`, `scene.joaquim`, `scene.nextDirectionChange`, etc.).
- Nenhuma chave de asset, física ou regra de jogabilidade foi alterada.

---

## 4. O Que Ficou Pendente

- **Nada ficou pendente**. Todas as regras, criação unificada do Seu Joaquim e dos demais NPCs, remoção do `JoaquimController.js` e a suíte de testes (`OK: assets, grupos, alertas isolados, painel, retomada, bounds e contadores`) foram validadas com sucesso.
