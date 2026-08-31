// Dados da mini-tela. Novos personagens podem ser adicionados aqui sem alterar
// a logica do painel, desde que tambem sejam registrados nos botoes do mapa.
const characterData = {
    joaquim: {
        nome: 'Seu Joaquim',
        descricao: 'Seu Joaquim é o único carteiro de Hemovilla, sempre visto cruzando as ruas com seu boné amarelo e uma pesada bolsa azul. Como tem muito trabalho, ele detesta esperar. Um dos moradores locais costuma dizer: "Eu queria que o Joaquim tivesse um pouco mais de paciência. Ele enfia as cartas na caixa e some antes mesmo de eu conseguir oferecer um copo d\'água!" Você dificilmente o encontrará parado em um só lugar, pois ele passa o dia inteiro perambulando apressado pela cidadezinha para garantir que todas as correspondências sejam entregues.',
        tipoSanguineo: null,
        condicao: null
    },
    marlene: {
        nome: 'Dona Marlene',
        descricao: 'Dona Marlene vive na floricultura da cidade. É fácil reconhecê-la pelo cabelo curto grisalho e os aventais floridos. Ela costuma discutir com seu filho, que não entende a dedicação extrema dela ao trabalho. Ele costuma dizer: "Eu queria que a mãe descansasse mais e parasse de tratar as mudas como pessoas. Ela tem um talento incrível para a culinária, mas prefere passar o dia inteiro conversando com samambaias!" Você quase sempre encontrará Dona Marlene no balcão da floricultura, atendendo com alegria e apresentando suas "amigas" floridas para os clientes.',
        tipoSanguineo: null,
        condicao: null
    },
    aparecida: {
        nome: 'Dona Aparecida',
        descricao: 'Dona Aparecida comanda o salão de beleza de Hemovilla. É impossível não notá-la. Durante o dia, você a encontrará no salão cortando cabelos e conversando, mas à noite a energia dela é outra: é muito fácil achá-la esbanjando alegria enquanto dança forró com o Seu Joaquim.',
        tipoSanguineo: null,
        condicao: null
    }
};

export class GameMap extends Phaser.Scene {

    constructor() {
        super('GameMap');
    }

    preload() {
        //Fundo do Mapa
        this.load.image('map1', 'assets/Mapas/Cidade1/BaseCidade1.png');
        this.load.image('map2', 'assets/Mapas/Cidade1/ComplementosCidade1.png');
        this.load.image('mapcolision1', 'assets/Mapas/Cidade1/ConstrucoesPrincipaisCidade1.png');
        this.load.image('mapcolision2', 'assets/Mapas/Cidade1/ConstrucoesSecundariasCidade1.png');
        this.load.image('pause-button', 'assets/Telas/Botoes/botao_pausa.png');
        this.load.image('joaquim-icon', 'assets/Personagens/SeuJoaquim/SeuJoaquim.Icone.png');
        this.load.image('marlene-icon', 'assets/Personagens/DonaMarlene/DonaMarlene.Icone.png');
        this.load.image('aparecida-icon', 'assets/Personagens/DonaAparecida/DonaAparecida.Icone.png');
        // Moldura usada como painel da descricao dos personagens.
        this.load.image('character-frame', 'assets/Personagens/moldura_personagens.png');
        // Seu Joaquim
        this.load.image('SJPD', 'assets/Personagens/SeuJoaquim/SeuJoaquim.ParadoDireita.png');
        this.load.image('SJPE', 'assets/Personagens/SeuJoaquim/SeuJoaquim.ParadoEsquerda.png');
        this.load.image('SJAD1', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarDireita1.png');
        this.load.image('SJAE1', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarEsquerda1.png');
        this.load.image('SJAD2', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarDireita2.png');
        this.load.image('SJAE2', 'assets/Personagens/SeuJoaquim/SeuJoaquim.AndarEsquerda2.png');
        //Dona Marlene
        this.load.image('DMPD', 'assets/Personagens/DonaMarlene/DonaMarlene.ParadaDireita.png');
        this.load.image('DMPE', 'assets/Personagens/DonaMarlene/DonaMarlene.ParadaEsquerda.png');
        this.load.image('DMAD1', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarDireita1.png');
        this.load.image('DMAE1', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarEsquerda1.png');
        this.load.image('DMAD2', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarDireita2.png');
        this.load.image('DMAE2', 'assets/Personagens/DonaMarlene/DonaMarlene.AndarEsquerda2.png');
        //Dona Aparecida
        this.load.image('DAPD', 'assets/Personagens/DonaAparecida/DonaAparecida.PosiçãoParadaDireita.png');
        this.load.image('DAPE', 'assets/Personagens/DonaAparecida/DonaAparecida.PosiçãoParadaEsquerda.png');
        this.load.image('DAAD1', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarDireita1.png');
        this.load.image('DAAE1', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarEsquerda1.png');
        this.load.image('DAAD2', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarDireita2.png');
        this.load.image('DAAE2', 'assets/Personagens/DonaAparecida/DonaAparecida.AndarEsquerda2.png');
        // Balao temporario exibido quando um personagem clicavel esta parado.
        this.load.image('balao_temporario', 'assets/Personagens/balao_temporario.png');
        this.load.image('icone_alerta', 'assets/Personagens/icone_alerta.png');
        // Botao de alerta localizado no canto inferior esquerdo da tela.
        this.load.image('alert-button', 'assets/Telas/Botoes/botao_alerta.png');
    }

    create() {
        this.scale.resize(512, 608);
        this.cameras.main.setViewport(0, 0, 512, 608);
        this.physics.world.setBounds(0, 0, 512, 512);

        this.background1 = this.add.tileSprite(256, 256, 512, 512, 'map1');
        this.background2 = this.add.tileSprite(256, 256, 512, 512, 'map2');
        this.background3 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision1');
        this.background4 = this.add.tileSprite(256, 256, 512, 512, 'mapcolision2');

        this.alertedIconKeys = new Set();
        this.createCharacterIconButtons();

        // Botao fixo no canto superior esquerdo para voltar ao menu inicial.
        const pauseButton = this.add.image(8, 8, 'pause-button');
        pauseButton.setOrigin(0);
        pauseButton.setDepth(100);
        pauseButton.setInteractive({ useHandCursor: true });
        pauseButton.on('pointerdown', () => {
            // Usa o mesmo escurecimento do botao Iniciar enquanto o clique esta pressionado.
            pauseButton.setTint(0x8B2E40);
        });
        pauseButton.on('pointerup', () => {
            pauseButton.clearTint();
            this.scene.start('Start');
        });

        // Botao de alerta localizado no canto inferior esquerdo da tela.
        // Este botao ativa o alerta de todos os personagens quando pressionado.
        const alertButton = this.add.image(8, 600, 'alert-button');
        alertButton.setOrigin(0, 1);
        alertButton.setDepth(100);
        alertButton.setInteractive({ useHandCursor: true });
        alertButton.on('pointerdown', () => {
            // Aplica escurecimento visual enquanto o botao esta sendo pressionado.
            alertButton.setTint(0x8B2E40);
        });
        alertButton.on('pointerup', () => {
            alertButton.clearTint();
            // Chama o metodo que ativa o alerta de todos os personagens do mapa.
            this.triggerAllCharactersAlert();
        });

        this.cursors = this.input.keyboard.createCursorKeys();

        this.joaquim = this.physics.add.sprite(120, 480, 'SJPD');
        this.joaquim.setCollideWorldBounds(true);

        this.anims.create({
            key: 'walk_Joaquim_down',
            frames: [
                { key: 'SJAD1' },
                { key: 'SJAD2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Joaquim_up',
            frames: [
                { key: 'SJAE1' },
                { key: 'SJAE2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Joaquim_left',
            frames: [
                { key: 'SJAE1' },
                { key: 'SJAE2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Joaquim_right',
            frames: [
                { key: 'SJAD1' },
                { key: 'SJAD2' }
            ],
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_marlene_left',
            frames: [
                { key: 'DMAE1' },
                { key: 'DMAE2' }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_marlene_right',
            frames: [
                { key: 'DMAD1' },
                { key: 'DMAD2' }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_aparecida_left',
            frames: [
                { key: 'DAAE1' },
                { key: 'DAAE2' }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_aparecida_right',
            frames: [
                { key: 'DAAD1' },
                { key: 'DAAD2' }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.isMoving = false;
        this.lastDirection = 'down';
        this.idleTextures = {
            up: 'SJPE',
            down: 'SJPD',
            left: 'SJPE',
            right: 'SJPD'
        };

        this.playerSpeed = 30;
        this.verticalDistance = 120;
        this.pauseTime = 700;
        this.isPaused = false;
        this.currentDirection = 'up';
        this.moveStartY = this.joaquim.y;
        this.nextDirectionChange = this.time.now + this.pauseTime;
        this.remainingPauseTime = this.pauseTime;

        this.startMove();

        this.clickableCharacters = [];
        this.registerClickableCharacter({
            sprite: this.joaquim,
            // O Seu Joaquim recebe o balao acima da cabeca.
            balloonOffset: { x: 0, y: -55 },
            alertInterval: 60000,
            iconButtonKey: 'joaquim',
            stop: () => this.stopJoaquimForInteraction(),
            resume: () => this.resumeJoaquimFromInteraction()
        });

        this.horizontalNPCs = [
            this.createHorizontalWalker({
                sprite: this.physics.add.sprite(280, 290, 'DMPE'),
                name: 'marlene',
                minX: 280,
                maxX: 480,
                speed: 25,
                direction: 'left',
                walkLeftAnim: 'walk_marlene_left',
                walkRightAnim: 'walk_marlene_right',
                idleLeft: 'DMPE',
                idleRight: 'DMPD'
            }),
            this.createHorizontalWalker({
                sprite: this.physics.add.sprite(300, 100, 'DAPE'),
                name: 'aparecida',
                minX: 300,
                maxX: 480,
                speed: 20,
                direction: 'right',
                walkLeftAnim: 'walk_aparecida_left',
                walkRightAnim: 'walk_aparecida_right',
                idleLeft: 'DAPE',
                idleRight: 'DAPD'
            })
        ];

        this.registerClickableCharacter({
            sprite: this.horizontalNPCs[0].sprite,
            // A Dona Marlene recebe o balao a esquerda.
            balloonOffset: { x: -55, y: -15 },
            alertInterval: 120000,
            iconButtonKey: 'marlene',
            stop: () => this.stopHorizontalWalkerForInteraction(this.horizontalNPCs[0]),
            resume: () => this.resumeHorizontalWalkerFromInteraction(this.horizontalNPCs[0])
        });

        this.registerClickableCharacter({
            sprite: this.horizontalNPCs[1].sprite,
            // A Dona Aparecida recebe o balao a esquerda.
            balloonOffset: { x: -55, y: -15 },
            alertInterval: 240000,
            iconButtonKey: 'aparecida',
            stop: () => this.stopHorizontalWalkerForInteraction(this.horizontalNPCs[1]),
            resume: () => this.resumeHorizontalWalkerFromInteraction(this.horizontalNPCs[1])
        });
    }

    createCharacterIconButtons() {
        const iconY = 560;
        const iconSpacing = 80;
        const centerX = 256;
        const icons = [
            { id: 'joaquim', key: 'joaquim-icon', x: centerX - iconSpacing },
            { id: 'marlene', key: 'marlene-icon', x: centerX },
            { id: 'aparecida', key: 'aparecida-icon', x: centerX + iconSpacing }
        ];

        this.characterIconButtons = {};

        icons.forEach(({ id, key, x }) => {
            const iconButton = this.add.image(x, iconY, key);
            iconButton.setOrigin(0.5);
            iconButton.setDepth(100);
            iconButton.setInteractive({ useHandCursor: true });
            this.characterIconButtons[id] = iconButton;

            iconButton.on('pointerdown', () => {
                iconButton.setTint(0x8B2E40);
            });

            iconButton.on('pointerup', () => {
                this.updateIconButtonTint(id);
                // O mesmo icone alterna a descricao; outro icone troca o personagem.
                this.openCharacterDescription(id);
            });

            iconButton.on('pointerout', () => {
                this.updateIconButtonTint(id);
            });
        });
    }

    openCharacterDescription(characterId) {
        const data = characterData[characterId];

        if (!data) {
            return;
        }

        if (this.characterOverlay) {
            // Clicar no personagem atual fecha o painel. Clicar em outro
            // remove o painel anterior antes de criar o novo conteudo.
            if (this.characterOverlay.characterId === characterId) {
                this.closeCharacterDescription();
                return;
            }

            this.closeCharacterDescription();
        }

        // Escurece somente o mapa para manter a faixa de icones clicavel.
        const overlay = this.add.rectangle(256, 256, 512, 512, 0x000000, 0.68);
        overlay.setDepth(200);
        overlay.setInteractive({ useHandCursor: true });
        overlay.on('pointerdown', () => this.closeCharacterDescription());

        const panelWidth = 448;
        const panelHeight = 448;
        const panelX = 256;
        const contentWidth = 390;
        const fontSizes = [18, 16, 14];
        let description;
        let title;

        // Tenta fontes maiores primeiro; a menor opcao continua legivel e o
        // restante do texto pode ser acessado com a rolagem.
        for (const fontSize of fontSizes) {
            const lineHeight = Math.round(fontSize * 1.25);
            const candidate = this.add.text(panelX, 0, data.descricao, {
                fontFamily: 'monospace',
                fontSize: `${fontSize}px`,
                color: '#3b2a20',
                lineSpacing: 2,
                wordWrap: { width: contentWidth, useAdvancedWrap: true }
            }).setOrigin(0.5, 0);
            const candidateTitle = this.add.text(panelX, 0, data.nome, {
                fontFamily: 'monospace',
                fontSize: `${fontSize + 4}px`,
                fontStyle: 'bold',
                color: '#3b2a20'
            }).setOrigin(0.5, 0);
            const requiredHeight = 32 + lineHeight + candidateTitle.height + candidate.height;

            if (requiredHeight <= panelHeight - 24 || fontSize === fontSizes[fontSizes.length - 1]) {
                description = candidate;
                title = candidateTitle;
                break;
            }

            candidate.destroy();
            candidateTitle.destroy();
        }

        // O painel fica 20 pixels acima do centro vertical da tela.
        const panelTop = 284 - panelHeight / 2;
        const panelY = panelTop + panelHeight / 2;
        const frame = this.add.image(panelX, panelY, 'character-frame');
        frame.setDisplaySize(panelWidth, panelHeight);
        frame.setDepth(201);

        const panelBlocker = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xffffff, 0);
        panelBlocker.setDepth(202);
        panelBlocker.setInteractive();
        panelBlocker.on('pointerdown', (_pointer, _localX, _localY, event) => event.stopPropagation());

        title.setPosition(panelX, panelTop + 34);
        title.setDepth(203);
        const descriptionTop = panelTop + 70 + title.height;
        const descriptionBottom = panelTop + panelHeight - 20;
        const descriptionViewportHeight = descriptionBottom - descriptionTop;
        // A mascara impede que o texto ultrapasse a area interna da moldura.
        const descriptionMask = this.make.graphics({ add: false });
        descriptionMask.fillStyle(0xffffff);
        descriptionMask.fillRect(
            panelX - contentWidth / 2,
            descriptionTop,
            contentWidth,
            descriptionViewportHeight
        );
        description.setPosition(panelX, descriptionTop);
        description.setMask(descriptionMask.createGeometryMask());
        description.setDepth(203);

        let descriptionScrollY = 0;
        const maxDescriptionScroll = Math.max(0, description.height - descriptionViewportHeight);

        // Move apenas a descricao quando o cursor estiver sobre sua area.
        const onDescriptionWheel = (pointer, _gameObjects, _deltaX, deltaY) => {
            const isOverDescription = pointer.x >= panelX - contentWidth / 2
                && pointer.x <= panelX + contentWidth / 2
                && pointer.y >= descriptionTop
                && pointer.y <= descriptionBottom;

            if (!isOverDescription || maxDescriptionScroll === 0) {
                return;
            }

            descriptionScrollY = Phaser.Math.Clamp(
                descriptionScrollY + deltaY,
                0,
                maxDescriptionScroll
            );
            description.y = descriptionTop - descriptionScrollY;
        };
        this.input.on('wheel', onDescriptionWheel);

        const closeButton = this.add.text(panelX + panelWidth / 2 - 28, panelTop + 14, 'X', {
            fontFamily: 'monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#afadab'
        }).setOrigin(0.5);
        closeButton.setDepth(204);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event.stopPropagation();
            this.closeCharacterDescription();
        });

        this.characterOverlay = {
            characterId,
            overlay,
            frame,
            panelBlocker,
            title,
            description,
            descriptionMask,
            closeButton,
            onDescriptionWheel
        };
    }

    closeCharacterDescription() {
        if (!this.characterOverlay) {
            return;
        }

        // Remove o evento de rolagem junto com os objetos para evitar listeners
        // ativos depois que a mini-tela foi fechada.
        this.input.off('wheel', this.characterOverlay.onDescriptionWheel);
        Object.entries(this.characterOverlay).forEach(([key, element]) => {
            if (key !== 'onDescriptionWheel' && key !== 'characterId') {
                element.destroy();
            }
        });
        this.characterOverlay = null;
    }

    updateIconButtonTint(iconButtonKey) {
        const iconButton = this.characterIconButtons && this.characterIconButtons[iconButtonKey];

        if (!iconButton) {
            return;
        }

        if (this.alertedIconKeys.has(iconButtonKey)) {
            iconButton.setTint(0xff5555);
            return;
        }

        iconButton.clearTint();
    }

    registerClickableCharacter(config) {
        const character = {
            ...config,
            isStoppedByClick: false,
            balloon: null,
            // Cada personagem controla seu proprio alerta e quando ele deve aparecer.
            alertIcon: null,
            alertOffset: config.alertOffset || { x: -13, y: -35 },
            nextAlertTime: config.alertInterval ? this.time.now + config.alertInterval : null
        };

        character.sprite.setInteractive({ useHandCursor: true });
        character.sprite.on('pointerdown', () => this.toggleCharacterInteraction(character));
        this.clickableCharacters.push(character);
    }

    toggleCharacterInteraction(character) {
        if (character.alertIcon) {
            this.resetCharacterAlert(character);
        }

        if (character.isStoppedByClick) {
            character.isStoppedByClick = false;
            character.balloon.destroy();
            character.balloon = null;
            character.resume();
            return;
        }

        character.isStoppedByClick = true;
        character.stop();
        character.balloon = this.add.image(0, 0, 'balao_temporario');
        this.updateCharacterBalloonPosition(character);
    }

    resetCharacterAlert(character) {
        // Ao interagir com um personagem alertado, remove o icone e reinicia a contagem.
        character.alertIcon.destroy();
        character.alertIcon = null;
        character.nextAlertTime = this.time.now + character.alertInterval;

        if (character.iconButtonKey) {
            this.alertedIconKeys.delete(character.iconButtonKey);
            this.updateIconButtonTint(character.iconButtonKey);
        }
    }

    updateCharacterBalloonPosition(character) {
        if (!character.balloon) {
            return;
        }

        character.balloon.setPosition(
            character.sprite.x + character.balloonOffset.x,
            character.sprite.y + character.balloonOffset.y
        );
    }

    updateCharacterAlert(character, time) {
        if (!character.alertInterval) {
            return;
        }

        // Quando o tempo configurado termina, cria o icone uma unica vez.
        if (!character.alertIcon && time >= character.nextAlertTime) {
            character.alertIcon = this.add.image(0, 0, 'icone_alerta');
            character.alertIcon.setDepth(character.sprite.depth + 1);

            if (character.iconButtonKey) {
                this.alertedIconKeys.add(character.iconButtonKey);
                this.updateIconButtonTint(character.iconButtonKey);
            }
        }

        // Mantem o alerta acompanhando o personagem enquanto ele se movimenta.
        if (character.alertIcon) {
            character.alertIcon.setPosition(
                character.sprite.x + character.alertOffset.x,
                character.sprite.y + character.alertOffset.y
            );
        }
    }

    updateCharacterIndicators(time) {
        if (!this.clickableCharacters) {
            return;
        }

        this.clickableCharacters.forEach((character) => {
            this.updateCharacterBalloonPosition(character);
            this.updateCharacterAlert(character, time);
        });
    }

    stopJoaquimForInteraction() {
        if (this.isPaused) {
            this.remainingPauseTime = Math.max(0, this.nextDirectionChange - this.time.now);
        }

        this.joaquim.setVelocity(0, 0);
        this.joaquim.anims.stop();
        this.joaquim.setTexture(this.idleTextures[this.lastDirection] || 'SJPD');
    }

    resumeJoaquimFromInteraction() {
        if (this.isPaused) {
            this.nextDirectionChange = this.time.now + this.remainingPauseTime;
            this.joaquim.setVelocity(0, 0);
            this.joaquim.setTexture(this.idleTextures[this.lastDirection] || 'SJPD');
            return;
        }

        this.startMove(false);
    }

    stopHorizontalWalkerForInteraction(walker) {
        walker.isStoppedByClick = true;
        walker.sprite.setVelocityX(0);
        walker.sprite.anims.stop();
        walker.sprite.setTexture(walker.direction === 'left' ? walker.idleLeft : walker.idleRight);
    }

    resumeHorizontalWalkerFromInteraction(walker) {
        walker.isStoppedByClick = false;
        this.updateHorizontalWalker(walker);
    }

    createHorizontalWalker(config) {
        const walker = {
            ...config,
            sprite: config.sprite,
            direction: config.direction || 'left'
        };

        walker.sprite.setCollideWorldBounds(true);
        walker.sprite.setImmovable(true);
        walker.sprite.setVelocityX(walker.direction === 'left' ? -walker.speed : walker.speed);
        walker.sprite.play(walker.direction === 'left' ? walker.walkLeftAnim : walker.walkRightAnim, true);

        return walker;
    }

    updateHorizontalWalker(walker) {
        if (walker.isStoppedByClick) {
            walker.sprite.setVelocityX(0);
            return;
        }

        const { sprite, minX, maxX, speed, walkLeftAnim, walkRightAnim } = walker;

        if (walker.direction === 'left' && sprite.x <= minX) {
            walker.direction = 'right';
        } else if (walker.direction === 'right' && sprite.x >= maxX) {
            walker.direction = 'left';
        }

        const velocityX = walker.direction === 'left' ? -speed : speed;
        sprite.setVelocityX(velocityX);
        sprite.play(walker.direction === 'left' ? walkLeftAnim : walkRightAnim, true);
    }

    startPause() {
        this.isPaused = true;
        this.joaquim.setVelocity(0, 0);
        this.joaquim.anims.stop();
        this.joaquim.setTexture(this.idleTextures[this.lastDirection] || 'SJPD');
        this.nextDirectionChange = this.time.now + this.pauseTime;
        this.remainingPauseTime = this.pauseTime;
    }

    startMove(resetMoveStart = true) {
        this.isPaused = false;

        if (resetMoveStart) {
            this.moveStartY = this.joaquim.y;
        }

        if (this.currentDirection === 'up') {
            this.joaquim.setVelocity(0, -this.playerSpeed);
            this.joaquim.play('walk_Joaquim_up', true);
            this.lastDirection = 'up';
        } else {
            this.joaquim.setVelocity(0, this.playerSpeed);
            this.joaquim.play('walk_Joaquim_down', true);
            this.lastDirection = 'down';
        }
    }

    // Metodo que ativa o alerta de todos os personagens do mapa simultaneamente.
    // Ao chamar este metodo, todos os personagens receberao seu icone de alerta,
    // e os botoes dos personagens serao destacados em vermelho.
    triggerAllCharactersAlert() {
        // Itera sobre cada personagem registrado na lista de personagens clicaveis.
        if (!this.clickableCharacters) {
            return;
        }

        this.clickableCharacters.forEach((character) => {
            // Define o tempo do proximo alerta como o momento atual,
            // forçando o alerta a ser criado imediatamente na proxima atualizacao.
            character.nextAlertTime = this.time.now;
            
            // Se o personagem ainda nao possui um icone de alerta, o metodo
            // updateCharacterAlert criara um quando este metodo for chamado.
            // Se ja possui, o metodo mantera o alerta visivel.
        });
    }

    update(time) {
        const joaquimInteraction = this.clickableCharacters && this.clickableCharacters[0];
        this.updateCharacterIndicators(time);

        if (joaquimInteraction && joaquimInteraction.isStoppedByClick) {
            this.joaquim.setVelocity(0, 0);

            if (this.horizontalNPCs) {
                this.horizontalNPCs.forEach((walker) => this.updateHorizontalWalker(walker));
            }

            return;
        }

        if (this.isPaused && time >= this.nextDirectionChange) {
            this.currentDirection = this.currentDirection === 'up' ? 'down' : 'up';
            this.startMove();
        }

        const body = this.joaquim.body;
        if (!this.isPaused && body && (body.blocked.up || body.blocked.down)) {
            this.startPause();
            return;
        }

        if (!this.isPaused && Math.abs(this.joaquim.y - this.moveStartY) >= this.verticalDistance) {
            this.startPause();
            return;
        }

        this.isMoving = !this.isPaused;

        if (this.horizontalNPCs) {
            this.horizontalNPCs.forEach((walker) => this.updateHorizontalWalker(walker));
        }
    }

}
