import { createHorizontalWalker, stopHorizontalWalkerForInteraction, resumeHorizontalWalkerFromInteraction } from './CharacterMovement.js';
import { registerClickableCharacter } from './ClickableCharacterManager.js';
import { createCharacterIconButtons } from './IconButtons.js';

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

// A Cidade1 mantem sua criacao original; as demais compartilham este cadastro.
export const charactersByCity = [[], city2Characters, city3Characters];

export function preloadCityCharacters(scene) {
    charactersByCity.flat().forEach(({ id, asset, idle }) => {
        const load = (key, file) => scene.load.image(key, `assets/Personagens/${asset}/${asset}.${file}.png`);
        load(`${id}-icon`, 'Icone');
        ['Direita', 'Esquerda'].forEach((side, index) => {
            const direction = index === 0 ? 'right' : 'left';
            load(`${id}-idle-${direction}`, `${idle}${side}`);
            [1, 2].forEach((frame) => load(`${id}-${direction}-${frame}`, `Andar${side}${frame}`));
        });
    });
}

function createCityCharacters(scene, characters) {
    scene.clickableCharacters = [];
    scene.horizontalNPCs = [];
    scene.alertedIconKeys = new Set();
    createCharacterIconButtons(scene, characters.map(({ id }) => id));
    characters.forEach((config) => {
        const { id } = config;
        ['left', 'right'].forEach((direction) => {
            const key = `walk_${id}_${direction}`;
            if (!scene.anims.exists(key)) scene.anims.create({
                key, frames: [1, 2].map((frame) => ({ key: `${id}-${direction}-${frame}` })),
                frameRate: 4, repeat: -1
            });
        });
        const walker = createHorizontalWalker(scene, {
            ...config, sprite: scene.physics.add.sprite(config.x, config.y, `${id}-idle-right`),
            direction: 'right', walkLeftAnim: `walk_${id}_left`, walkRightAnim: `walk_${id}_right`,
            idleLeft: `${id}-idle-left`, idleRight: `${id}-idle-right`
        });
        scene.horizontalNPCs.push(walker);
        registerClickableCharacter(scene, {
            sprite: walker.sprite, iconButtonKey: id,
            alertInterval: config.alertInterval, balloonOffset: { x: 0, y: -55 },
            stop: () => stopHorizontalWalkerForInteraction(walker),
            resume: () => resumeHorizontalWalkerFromInteraction(scene, walker)
        });
    });
}

// Cada cidade guarda suas listas e seus alertas, sem recriar personagens ao voltar.
export function rememberCityCharacters(scene, index) {
    scene.cityCharacterGroups[index] = {
        characters: scene.clickableCharacters, walkers: scene.horizontalNPCs,
        icons: scene.characterIconButtons, alerts: scene.alertedIconKeys,
        suspendedAt: scene.time.now
    };
}

function setGroupVisible(group, visible) {
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

export function switchCityCharacters(scene, index) {
    const previous = scene.cityCharacterGroups[scene.currentCityIndex];
    previous.suspendedAt = scene.time.now;
    setGroupVisible(previous, false);
    let group = scene.cityCharacterGroups[index];
    if (!group) {
        // O registro comum mostra o balao com o botao do minigame no clique do sprite.
        // Os icones continuam abrindo as descricoes, sem consumir alertas.
        createCityCharacters(scene, charactersByCity[index] ?? []);
        rememberCityCharacters(scene, index);
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
    setGroupVisible(group, true);
    const hasCharacters = group.characters.length > 0;
    scene.alertButton.setVisible(hasCharacters);
    scene.alertButton.input.enabled = hasCharacters;
}
