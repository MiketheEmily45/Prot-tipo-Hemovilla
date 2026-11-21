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
        }
    },
    cristina: {
        name: 'Cristina',
        gender: 'female',
        description: 'Uma educadora incrível, que espalha conhecimento e alegria com carisma excepcional. Só não mexa nas plantinhas dela!',
        icon: 'assets/Personagens/Extras/Cristina/Cristina.Icone.png',
        map: {
            idleLeft: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.ParadaEsquerda.png',
            idleRight: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.ParadaDireita.png',
            left1: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarEsquerda1.png',
            left2: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarEsquerda2.png',
            right1: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarDireita1.png',
            right2: 'assets/Personagens/Extras/Cristina/Movimento no mapa/Cristina.AndarDireita2.png'
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
        }
    }
};

export function getShopCharacterPresentation(characterId) {
    return SHOP_CHARACTER_PRESENTATIONS[characterId] ?? null;
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
    });
}
