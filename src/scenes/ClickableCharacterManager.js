// Gerencia personagens clicaveis: baloes temporarios, icones de alerta,
// interacoes ao clicar e atualizacoes de posicao.

export function registerClickableCharacter(scene, config) {
    const character = {
        ...config,
        isStoppedByClick: false,
        balloon: null,
        balloonButton: null,
        // Cada personagem controla seu proprio alerta e quando ele deve aparecer.
        alertIcon: null,
        alertOffset: config.alertOffset || { x: -13, y: -35 },
        nextAlertTime: config.alertInterval ? scene.time.now + config.alertInterval : null
    };

    character.sprite.setInteractive({ useHandCursor: true });
    character.sprite.on('pointerdown', () => toggleCharacterInteraction(scene, character));
    scene.clickableCharacters.push(character);
}

export function toggleCharacterInteraction(scene, character) {
    const hadAlert = !!character.alertIcon;

    if (character.alertIcon) {
        resetCharacterAlert(scene, character);
    }

    if (character.isStoppedByClick) {
        character.isStoppedByClick = false;
        if (character.balloon) {
            character.balloon.destroy();
            character.balloon = null;
        }
        if (character.balloonButton) {
            character.balloonButton.destroy();
            character.balloonButton = null;
        }
        character.resume();
        return;
    }

    character.isStoppedByClick = true;
    character.stop();
    character.balloon = scene.add.image(0, 0, 'balao_temporario');

    if (hadAlert) {
        createMinigameBalloonButton(scene, character);
    }

    updateCharacterBalloonPosition(character);
}

function createMinigameBalloonButton(scene, character) {
    if (character.balloonButton) {
        return;
    }

    character.balloonButton = scene.add.image(0, 0, 'start-button');
    character.balloonButton.setScale(0.35);
    character.balloonButton.setDepth(character.sprite.depth + 10);
    character.balloonButton.setInteractive({ useHandCursor: true });

    character.balloonButton.on('pointerdown', () => {
        character.balloonButton.setTint(0x8B2E40);
    });

    character.balloonButton.on('pointerup', () => {
        character.balloonButton.clearTint();
        scene.scene.start('Minigame');
    });

    character.balloonButton.on('pointerout', () => {
        character.balloonButton.clearTint();
    });
}

export function updateCharacterBalloonPosition(character) {
    if (!character.balloon) {
        return;
    }

    character.balloon.setPosition(
        character.sprite.x + character.balloonOffset.x,
        character.sprite.y + character.balloonOffset.y
    );

    if (character.balloonButton) {
        character.balloonButton.setPosition(
            character.balloon.x,
            character.balloon.y - 18
        );
    }
}

export function updateCharacterAlert(scene, character, time) {
    if (!character.alertInterval) {
        return;
    }

    // Quando o tempo configurado termina, cria o icone uma unica vez.
    if (!character.alertIcon && time >= character.nextAlertTime) {
        character.alertIcon = scene.add.image(0, 0, 'icone_alerta');
        character.alertIcon.setDepth(character.sprite.depth + 1);

        if (character.iconButtonKey) {
            scene.alertedIconKeys.add(character.iconButtonKey);
            updateIconButtonTint(scene, character.iconButtonKey);
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

export function resetCharacterAlert(scene, character) {
    // Ao interagir com um personagem alertado, remove o icone e reinicia a contagem.
    character.alertIcon.destroy();
    character.alertIcon = null;
    character.nextAlertTime = scene.time.now + character.alertInterval;

    if (character.iconButtonKey) {
        scene.alertedIconKeys.delete(character.iconButtonKey);
        updateIconButtonTint(scene, character.iconButtonKey);
    }
}

export function updateCharacterIndicators(scene, time) {
    if (!scene.clickableCharacters) {
        return;
    }

    scene.clickableCharacters.forEach((character) => {
        updateCharacterBalloonPosition(character);
        updateCharacterAlert(scene, character, time);
    });
}

export function triggerAllCharactersAlert(scene, time) {
    // Metodo que ativa o alerta de todos os personagens do mapa simultaneamente.
    // Ao chamar este metodo, todos os personagens receberao seu icone de alerta,
    // e os botoes dos personagens serao destacados em vermelho.
    
    // Itera sobre cada personagem registrado na lista de personagens clicaveis.
    if (!scene.clickableCharacters) {
        return;
    }

    scene.clickableCharacters.forEach((character) => {
        // Define o tempo do proximo alerta como o momento atual,
        // forçando o alerta a ser criado imediatamente na proxima atualizacao.
        character.nextAlertTime = scene.time.now;
        
        // Se o personagem ainda nao possui um icone de alerta, o metodo
        // updateCharacterAlert criara um quando este metodo for chamado.
        // Se ja possui, o metodo mantera o alerta visivel.
    });
}

function updateIconButtonTint(scene, iconButtonKey) {
    const iconButton = scene.characterIconButtons && scene.characterIconButtons[iconButtonKey];

    if (!iconButton) {
        return;
    }

    if (scene.alertedIconKeys.has(iconButtonKey)) {
        iconButton.setTint(0xff5555);
        return;
    }

    iconButton.clearTint();
}
