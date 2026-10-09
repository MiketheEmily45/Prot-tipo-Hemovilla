// Gerencia movimento de personagens: Seu Joaquim possui movimento vertical autônomo,
// enquanto os outros NPCs possuem movimento horizontal.

export class HorizontalMovement {
    constructor(scene, config) {
        this.scene = scene;
        Object.assign(this, config);
        this.sprite = config.sprite;
        this.direction = config.direction || 'left';
        this.minX = config.minX;
        this.maxX = config.maxX;
        this.speed = config.speed || 20;
        this.walkLeftAnim = config.walkLeftAnim;
        this.walkRightAnim = config.walkRightAnim;
        this.idleLeft = config.idleLeft;
        this.idleRight = config.idleRight;
        this.isStoppedByClick = false;

        this.init();
    }

    init() {
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setImmovable(true);
        this.sprite.setVelocityX(this.direction === 'left' ? -this.speed : this.speed);
        this.sprite.play(this.direction === 'left' ? this.walkLeftAnim : this.walkRightAnim, true);
    }

    update() {
        if (this.isStoppedByClick) {
            this.sprite.setVelocityX(0);
            return;
        }

        if (this.direction === 'left' && this.sprite.x <= this.minX) {
            this.direction = 'right';
        } else if (this.direction === 'right' && this.sprite.x >= this.maxX) {
            this.direction = 'left';
        }

        const velocityX = this.direction === 'left' ? -this.speed : this.speed;
        this.sprite.setVelocityX(velocityX);
        this.sprite.play(this.direction === 'left' ? this.walkLeftAnim : this.walkRightAnim, true);
    }

    stop() {
        this.isStoppedByClick = true;
        this.sprite.setVelocityX(0);
        this.sprite.anims.stop();
        this.sprite.setTexture(this.direction === 'left' ? this.idleLeft : this.idleRight);
    }

    resume() {
        this.isStoppedByClick = false;
        this.update();
    }
}

export class JoaquimMovement {
    constructor(scene) {
        this.scene = scene;
    }

    startMove(resetMoveStart = true) {
        const scene = this.scene;
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

    startPause() {
        const scene = this.scene;
        scene.isPaused = true;
        scene.joaquim.setVelocity(0, 0);
        scene.joaquim.anims.stop();
        scene.joaquim.setTexture(scene.idleTextures[scene.lastDirection] || 'joaquim-idle-right');
        scene.nextDirectionChange = scene.time.now + scene.pauseTime;
        scene.remainingPauseTime = scene.pauseTime;
    }

    stopForInteraction() {
        const scene = this.scene;
        if (scene.isPaused) {
            scene.remainingPauseTime = Math.max(0, scene.nextDirectionChange - scene.time.now);
        }

        scene.joaquim.setVelocity(0, 0);
        scene.joaquim.anims.stop();
        scene.joaquim.setTexture(scene.idleTextures[scene.lastDirection] || 'joaquim-idle-right');
    }

    resumeFromInteraction() {
        const scene = this.scene;
        if (scene.isPaused) {
            scene.nextDirectionChange = scene.time.now + scene.remainingPauseTime;
            scene.joaquim.setVelocity(0, 0);
            scene.joaquim.setTexture(scene.idleTextures[scene.lastDirection] || 'joaquim-idle-right');
            return;
        }

        this.startMove(false);
    }
}

// ========== Funções de compatibilidade / exportação direta ==========

export function createHorizontalWalker(scene, config) {
    return new HorizontalMovement(scene, config);
}

export function updateHorizontalWalker(walker) {
    if (walker && typeof walker.update === 'function') {
        walker.update();
    }
}

export function stopHorizontalWalkerForInteraction(walker) {
    if (walker && typeof walker.stop === 'function') {
        walker.stop();
    }
}

export function resumeHorizontalWalkerFromInteraction(scene, walker) {
    if (walker && typeof walker.resume === 'function') {
        walker.resume();
    }
}

export function startMove(scene, resetMoveStart = true) {
    new JoaquimMovement(scene).startMove(resetMoveStart);
}

export function startPause(scene) {
    new JoaquimMovement(scene).startPause();
}

export function stopJoaquimForInteraction(scene) {
    new JoaquimMovement(scene).stopForInteraction();
}

export function resumeJoaquimFromInteraction(scene) {
    new JoaquimMovement(scene).resumeFromInteraction();
}
