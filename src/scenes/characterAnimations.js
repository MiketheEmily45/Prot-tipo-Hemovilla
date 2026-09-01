// Cria todas as animacoes dos personagens (Joaquim, Marlene e Aparecida).
// Esta funcao deve ser chamada na fase de create() da scene.
export function createCharacterAnimations(scene) {
    scene.anims.create({
        key: 'walk_Joaquim_down',
        frames: [
            { key: 'SJAD1' },
            { key: 'SJAD2' }
        ],
        frameRate: 2,
        repeat: -1
    });

    scene.anims.create({
        key: 'walk_Joaquim_up',
        frames: [
            { key: 'SJAE1' },
            { key: 'SJAE2' }
        ],
        frameRate: 2,
        repeat: -1
    });

    scene.anims.create({
        key: 'walk_Joaquim_left',
        frames: [
            { key: 'SJAE1' },
            { key: 'SJAE2' }
        ],
        frameRate: 2,
        repeat: -1
    });

    scene.anims.create({
        key: 'walk_Joaquim_right',
        frames: [
            { key: 'SJAD1' },
            { key: 'SJAD2' }
        ],
        frameRate: 5,
        repeat: -1
    });

    scene.anims.create({
        key: 'walk_marlene_left',
        frames: [
            { key: 'DMAE1' },
            { key: 'DMAE2' }
        ],
        frameRate: 4,
        repeat: -1
    });

    scene.anims.create({
        key: 'walk_marlene_right',
        frames: [
            { key: 'DMAD1' },
            { key: 'DMAD2' }
        ],
        frameRate: 4,
        repeat: -1
    });

    scene.anims.create({
        key: 'walk_aparecida_left',
        frames: [
            { key: 'DAAE1' },
            { key: 'DAAE2' }
        ],
        frameRate: 4,
        repeat: -1
    });

    scene.anims.create({
        key: 'walk_aparecida_right',
        frames: [
            { key: 'DAAD1' },
            { key: 'DAAD2' }
        ],
        frameRate: 4,
        repeat: -1
    });
}
