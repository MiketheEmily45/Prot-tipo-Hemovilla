// Gerencia movimento de personagens: Seu Joaquim (movimento vertical autônomo)
// e NPCs (movimento horizontal). Exporta funções para criar, atualizar e controlar.

// ========== HORIZONTAL WALKER (Marlene, Aparecida) ==========

export function createHorizontalWalker(scene, config) {
    const walker = {
        ...config,
        sprite: config.sprite,
        direction: config.direction || 'left',
        isStoppedByClick: false
    };

    walker.sprite.setCollideWorldBounds(true);
    walker.sprite.setImmovable(true);
    walker.sprite.setVelocityX(walker.direction === 'left' ? -walker.speed : walker.speed);
    walker.sprite.play(walker.direction === 'left' ? walker.walkLeftAnim : walker.walkRightAnim, true);

    return walker;
}

export function updateHorizontalWalker(walker) {
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

export function stopHorizontalWalkerForInteraction(walker) {
    walker.isStoppedByClick = true;
    walker.sprite.setVelocityX(0);
    walker.sprite.anims.stop();
    walker.sprite.setTexture(walker.direction === 'left' ? walker.idleLeft : walker.idleRight);
}

export function resumeHorizontalWalkerFromInteraction(scene, walker) {
    walker.isStoppedByClick = false;
    updateHorizontalWalker(walker);
}

// ========== JOAQUIM MOVEMENT (Seu Joaquim) ==========

export function startMove(scene, resetMoveStart = true) {
    scene.isPaused = false;

    if (resetMoveStart) {
        scene.moveStartY = scene.joaquim.y;
    }

    if (scene.currentDirection === 'up') {
        scene.joaquim.setVelocity(0, -scene.playerSpeed);
        scene.joaquim.play('walk_Joaquim_up', true);
        scene.lastDirection = 'up';
    } else {
        scene.joaquim.setVelocity(0, scene.playerSpeed);
        scene.joaquim.play('walk_Joaquim_down', true);
        scene.lastDirection = 'down';
    }
}

export function startPause(scene) {
    scene.isPaused = true;
    scene.joaquim.setVelocity(0, 0);
    scene.joaquim.anims.stop();
    scene.joaquim.setTexture(scene.idleTextures[scene.lastDirection] || 'SJPD');
    scene.nextDirectionChange = scene.time.now + scene.pauseTime;
    scene.remainingPauseTime = scene.pauseTime;
}

export function stopJoaquimForInteraction(scene) {
    if (scene.isPaused) {
        scene.remainingPauseTime = Math.max(0, scene.nextDirectionChange - scene.time.now);
    }

    scene.joaquim.setVelocity(0, 0);
    scene.joaquim.anims.stop();
    scene.joaquim.setTexture(scene.idleTextures[scene.lastDirection] || 'SJPD');
}

export function resumeJoaquimFromInteraction(scene) {
    if (scene.isPaused) {
        scene.nextDirectionChange = scene.time.now + scene.remainingPauseTime;
        scene.joaquim.setVelocity(0, 0);
        scene.joaquim.setTexture(scene.idleTextures[scene.lastDirection] || 'SJPD');
        return;
    }

    startMove(scene, false);
}
