import { createHorizontalWalker, stopHorizontalWalkerForInteraction, resumeHorizontalWalkerFromInteraction } from './CharacterMovement.js';
import { registerClickableCharacter } from './ClickableCharacterManager.js';
import { createCharacterIconButtons } from './IconButtons.js';

export const city1Characters = [
    { id: 'marlene', asset: 'DonaMarlene', idle: 'Parada', x: 280, y: 290, minX: 280, maxX: 480, speed: 25, direction: 'left', balloonOffset: { x: -55, y: -15 }, alertInterval: 120000 },
    { id: 'aparecida', asset: 'DonaAparecida', idle: 'PosiçãoParada', x: 300, y: 100, minX: 300, maxX: 480, speed: 20, direction: 'right', balloonOffset: { x: -55, y: -15 }, alertInterval: 240000 }
];

// Coordenadas do centro dos sprites; os pes ficam sobre a rua/calcada.
// Cada percurso horizontal permanece junto ao respectivo estabelecimento.
export const city2Characters = [
    { id: 'bruno', asset: 'Bruno', idle: 'Parado', x: 300, y: 94, minX: 300, maxX: 390, speed: 25, alertInterval: 60000 },
    { id: 'beatriz', asset: 'Beatriz', idle: 'Parada', x: 360, y: 466, minX: 345, maxX: 465, speed: 25, alertInterval: 120000 },
    { id: 'carlos', asset: 'Carlos', idle: 'Parado', x: 390, y: 290, minX: 360, maxX: 460, speed: 20, alertInterval: 240000 }
];

export const city3Characters = [
    // Grama entre a pista e os instrumentos, sem passar sobre o teclado.
    { id: 'caue', asset: 'Caue', idle: 'Parado', x: 370, y: 270, minX: 355, maxX: 410, speed: 20, alertInterval: 60000 },
    // Calcada do muro, mantendo o percurso a esquerda da escada.
    { id: 'yasmin', asset: 'Yasmin', idle: 'Parada', x: 190, y: 150, minX: 150, maxX: 265, speed: 20, alertInterval: 120000 },
    // Interior da pista; o asset do artista usa a grafia Theo.
    { id: 'teo', asset: 'Theo', idle: 'Parado', x: 150, y: 375, minX: 85, maxX: 265, speed: 25, alertInterval: 240000 }
];

// A Cidade 1 mantem sua criacao original; as demais compartilham este cadastro.
export const charactersByCity = [[], city2Characters, city3Characters];

export function preloadCityCharacters(scene) {
    [...city1Characters, ...charactersByCity.flat()].forEach(({ id, asset, idle }) => {
        const load = (key, file) => scene.load.image(key, `assets/Personagens/${asset}/${asset}.${file}.png`);
        load(`${id}-icon`, 'Icone');
        ['Direita', 'Esquerda'].forEach((side, index) => {
            const direction = index === 0 ? 'right' : 'left';
            load(`${id}-idle-${direction}`, `${idle}${side}`);
            [1, 2].forEach((frame) => load(`${id}-${direction}-${frame}`, `Andar${side}${frame}`));
        });
    });
}

export function preloadJoaquim(scene) {
    const id = 'joaquim';
    const asset = 'SeuJoaquim';
    const idle = 'Parado';
    const load = (key, file) => scene.load.image(key, `assets/Personagens/${asset}/${asset}.${file}.png`);
    load(`${id}-icon`, 'Icone');
    ['Direita', 'Esquerda'].forEach((side, index) => {
        const direction = index === 0 ? 'right' : 'left';
        load(`${id}-idle-${direction}`, `${idle}${side}`);
        [1, 2].forEach((frame) => load(`${id}-${direction}-${frame}`, `Andar${side}${frame}`));
    });
}

export function createJoaquimAnimations(scene) {
    if (!scene.anims.exists('walk_Joaquim_down')) {
        scene.anims.create({
            key: 'walk_Joaquim_down',
            frames: [
                { key: 'joaquim-right-1' },
                { key: 'joaquim-right-2' }
            ],
            frameRate: 2,
            repeat: -1
        });
    }

    if (!scene.anims.exists('walk_Joaquim_up')) {
        scene.anims.create({
            key: 'walk_Joaquim_up',
            frames: [
                { key: 'joaquim-left-1' },
                { key: 'joaquim-left-2' }
            ],
            frameRate: 2,
            repeat: -1
        });
    }
}

export function createHorizontalCityCharacter(scene, config) {
    const {
        id,
        direction = 'right',
        balloonOffset = { x: 0, y: -55 },
        animFrameRate = 4
    } = config;

    ['left', 'right'].forEach((dir) => {
        const key = `walk_${id}_${dir}`;
        if (!scene.anims.exists(key)) {
            scene.anims.create({
                key,
                frames: [1, 2].map((frame) => ({ key: `${id}-${dir}-${frame}` })),
                frameRate: animFrameRate,
                repeat: -1
            });
        }
    });

    const walker = createHorizontalWalker(scene, {
        ...config,
        sprite: scene.physics.add.sprite(config.x, config.y, `${id}-idle-${direction}`),
        direction,
        walkLeftAnim: `walk_${id}_left`,
        walkRightAnim: `walk_${id}_right`,
        idleLeft: `${id}-idle-left`,
        idleRight: `${id}-idle-right`
    });

    if (!scene.horizontalNPCs) scene.horizontalNPCs = [];
    scene.horizontalNPCs.push(walker);

    if (!scene.clickableCharacters) scene.clickableCharacters = [];
    registerClickableCharacter(scene, {
        sprite: walker.sprite,
        iconButtonKey: id,
        alertInterval: config.alertInterval,
        balloonOffset,
        stop: () => stopHorizontalWalkerForInteraction(walker),
        resume: () => resumeHorizontalWalkerFromInteraction(scene, walker)
    });

    return walker;
}

function createCityCharacters(scene, characters) {
    scene.clickableCharacters = [];
    scene.horizontalNPCs = [];
    scene.alertedIconKeys = new Set();
    createCharacterIconButtons(scene, characters.map(({ id }) => id));
    characters.forEach((config) => {
        createHorizontalCityCharacter(scene, config);
    });
}

// Cada cidade guarda suas listas e seus alertas, sem recriar personagens ao voltar.
export class CityCharacterGroupManager {
    constructor(scene) {
        this.scene = scene;
    }

    remember(index) {
        this.scene.cityCharacterGroups[index] = {
            characters: this.scene.clickableCharacters,
            walkers: this.scene.horizontalNPCs,
            icons: this.scene.characterIconButtons,
            alerts: this.scene.alertedIconKeys,
            suspendedAt: this.scene.time.now
        };
    }

    setGroupVisible(group, visible) {
        group.characters.forEach(({ sprite, balloon, alertIcon, miniGameButton, descriptionButton }) => {
            sprite.setVisible(visible);
            sprite.body.enable = visible;
            sprite.input.enabled = visible;
            if (visible) sprite.anims.resume();
            else sprite.anims.pause();
            balloon?.setVisible(visible);
            if (descriptionButton) {
                descriptionButton.setVisible(visible);
                descriptionButton.input.enabled = visible;
            }
            if (miniGameButton) {
                miniGameButton.setVisible(visible);
                miniGameButton.input.enabled = visible && !!alertIcon;
            }
            alertIcon?.setVisible(visible);
        });
        Object.values(group.icons).forEach((icon) => {
            icon.setVisible(visible);
            icon.input.enabled = visible;
        });
    }

    switchTo(index) {
        const scene = this.scene;
        const previous = scene.cityCharacterGroups[scene.currentCityIndex];
        previous.suspendedAt = scene.time.now;
        this.setGroupVisible(previous, false);
        let group = scene.cityCharacterGroups[index];
        if (!group) {
            // O registro comum mostra o balao com o botao do minigame no clique do sprite.
            // Os icones continuam abrindo as descricoes, sem consumir alertas.
            createCityCharacters(scene, charactersByCity[index] ?? []);
            this.remember(index);
            group = scene.cityCharacterGroups[index];
        }
        const elapsed = scene.time.now - group.suspendedAt;
        group.characters.forEach((character) => {
            if (character.nextAlertTime !== null) character.nextAlertTime += elapsed;
        });
        if (index === 0) scene.nextDirectionChange += elapsed;
        scene.clickableCharacters = group.characters;
        scene.horizontalNPCs = group.walkers;
        scene.characterIconButtons = group.icons;
        scene.alertedIconKeys = group.alerts;
        this.setGroupVisible(group, true);
        const hasCharacters = group.characters.length > 0;
        scene.alertButton.setVisible(hasCharacters);
        scene.alertButton.input.enabled = hasCharacters;
    }
}

export function rememberCityCharacters(scene, index) {
    new CityCharacterGroupManager(scene).remember(index);
}

export function switchCityCharacters(scene, index) {
    new CityCharacterGroupManager(scene).switchTo(index);
}
