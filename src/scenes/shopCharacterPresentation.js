function createSpecialMovementFrames(basePath, count) {
    return Array.from({ length: count }, (_, index) => `${basePath}/pixil-frame-${index}.png`);
}

export const SHOP_CHARACTER_PRESENTATIONS = {
    douglas: {
        name: 'Professor Doug',
        gender: 'male',
        description: 'Um programador Python voraz e defensor entusiasmado da soberania do Linux, sempre pronto para compartilhar sua paixão por tecnologia.',
        icon: 'assets/Personagens/Extras/Douglas/Douglas.Icone.png',
        map: {
            idleLeft: 'assets/Personagens/Extras/Douglas/Movimento no Mapa/Douglas.ParadoEsquerda.png',
            idleRight: 'assets/Personagens/Extras/Douglas/Movimento no Mapa/Douglas.ParadoDireita.png',
            left1: 'assets/Personagens/Extras/Douglas/Movimento no Mapa/Douglas.AndarEsquerda1.png',
            left2: 'assets/Personagens/Extras/Douglas/Movimento no Mapa/Douglas.AndarEsquerda2.png',
            right1: 'assets/Personagens/Extras/Douglas/Movimento no Mapa/Douglas.AndarDireita1.png',
            right2: 'assets/Personagens/Extras/Douglas/Movimento no Mapa/Douglas.AndarDireita2.png'
        },
        specialMovement: {
            frameRate: 8,
            frames: createSpecialMovementFrames('assets/Personagens/Extras/Douglas/Movimento Especial', 10)
        }
    },
    cristina: {
        name: 'Cristina',
        gender: 'female',
        bloodType: 'B+',
        description: 'Uma educadora incrível, que espalha conhecimento e alegria com carisma excepcional. Só não mexa nas plantinhas dela!',
        icon: 'assets/Personagens/Extras/Cristina/Cristina.Icone.png',
        map: {
            idleLeft: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.ParadaEsquerda.png',
            idleRight: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.ParadaDireita.png',
            left1: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarEsquerda1.png',
            left2: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarEsquerda2.png',
            right1: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarDireita1.png',
            right2: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarDireita2.png'
        },
        specialMovement: {
            frameRate: 8,
            frames: createSpecialMovementFrames('assets/Personagens/Extras/Cristina/Movimento Especial', 11)
        }
    },
    enfermeira: {
        name: 'Enfermeira',
        gender: 'female',
        description: 'A enfermeira de Hemovilla. Depois de três noites seguidas de plantão, diz que transcendeu a matéria.',
        icon: 'assets/Personagens/Extras/Enfermeira/Enfermeira.Icone.png',
        map: {
            idleLeft: 'assets/Personagens/Extras/Enfermeira/Movimento no mapa/Enfermeira.ParadaEsquerda.png',
            idleRight: 'assets/Personagens/Extras/Enfermeira/Movimento no mapa/Enfermeira.ParadaDireita.png',
            left1: 'assets/Personagens/Extras/Enfermeira/Movimento no mapa/Enfermeira.AndarEsquerda1.png',
            left2: 'assets/Personagens/Extras/Enfermeira/Movimento no mapa/Enfermeira.AndarEsquerda2.png',
            right1: 'assets/Personagens/Extras/Enfermeira/Movimento no mapa/Enfermeira.AndarDireita1.png',
            right2: 'assets/Personagens/Extras/Enfermeira/Movimento no mapa/Enfermeira.AndarDireita2.png'
        },
        specialMovement: {
            frameRate: 8,
            frames: createSpecialMovementFrames('assets/Personagens/Extras/Enfermeira/Movimento Especial/pixilart-frames (2)', 19)
        }
    }
};

export function getShopCharacterPresentation(characterId) {
    return SHOP_CHARACTER_PRESENTATIONS[characterId] ?? null;
}

export function getShopCharacterBloodType(characterId) {
    return SHOP_CHARACTER_PRESENTATIONS[characterId]?.bloodType ?? null;
}

export function getShopCharacterSpecialMovementAnimKey(characterId) {
    return `extra-${characterId}-special-movement`;
}

export function getShopCharacterSpecialMovementFrameKey(characterId, frameIndex) {
    return `extra-${characterId}-special-${frameIndex}`;
}

export function preloadShopCharacterMapAssets(scene) {
    Object.entries(SHOP_CHARACTER_PRESENTATIONS).forEach(([characterId, presentation]) => {
        const prefix = `extra-${characterId}`;
        scene.load.image(`${prefix}-icon`, presentation.icon);
        scene.load.image(`${prefix}-idle-left`, presentation.map.idleLeft);
        scene.load.image(`${prefix}-idle-right`, presentation.map.idleRight);
        scene.load.image(`${prefix}-left-1`, presentation.map.left1);
        scene.load.image(`${prefix}-left-2`, presentation.map.left2);
        scene.load.image(`${prefix}-right-1`, presentation.map.right1);
        scene.load.image(`${prefix}-right-2`, presentation.map.right2);

        const specialMovement = presentation.specialMovement;
        if (specialMovement?.frames?.length) {
            specialMovement.frames.forEach((framePath, frameIndex) => {
                scene.load.image(getShopCharacterSpecialMovementFrameKey(characterId, frameIndex), framePath);
            });
        }
    });
}

export function ensureShopCharacterSpecialMovementAnim(scene, characterId) {
    const presentation = SHOP_CHARACTER_PRESENTATIONS[characterId];
    const specialMovement = presentation?.specialMovement;
    if (!scene || !specialMovement?.frames?.length) {
        return null;
    }

    const animKey = getShopCharacterSpecialMovementAnimKey(characterId);
    if (!scene.anims.exists(animKey)) {
        scene.anims.create({
            key: animKey,
            frames: specialMovement.frames.map((_, frameIndex) => ({
                key: getShopCharacterSpecialMovementFrameKey(characterId, frameIndex)
            })),
            frameRate: specialMovement.frameRate ?? 8,
            repeat: -1
        });
    }

    return animKey;
}
