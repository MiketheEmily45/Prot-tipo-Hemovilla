// Gerencia movimentação configurável de personagens (eixo horizontal ou vertical, limites, velocidade e pausas opcionais).

export class CharacterMovement {
    constructor(scene, sprite, config = {}) {
        this.scene = scene;
        this.sprite = sprite;
        this.axis = config.axis || 'horizontal';
        this.speed = config.speed ?? (this.axis === 'vertical' ? 30 : 20);
        this.direction = config.direction || (this.axis === 'vertical' ? 'up' : 'left');
        this.lastDirection = this.direction;

        // Limites horizontais
        this.minX = config.minX;
        this.maxX = config.maxX;

        // Limites verticais
        this.verticalDistance = config.verticalDistance ?? 120;
        this.moveStartY = config.y ?? (sprite ? sprite.y : 0);

        // Pausas autônomas periódicas (ex.: Seu Joaquim)
        this.hasPause = Boolean(config.hasPause || config.pauseTime);
        this.pauseTime = config.pauseTime ?? 700;
        this.isPaused = false;
        this._nextDirectionChange = scene?.time?.now != null ? scene.time.now + this.pauseTime : 0;
        this.remainingPauseTime = this.pauseTime;
        this.isMoving = false;

        // Nomes de animações
        this.walkLeftAnim = config.walkLeftAnim || `walk_${config.id}_left`;
        this.walkRightAnim = config.walkRightAnim || `walk_${config.id}_right`;
        this.walkUpAnim = config.walkUpAnim || `walk_${config.id}_up` || 'walk_Joaquim_up';
        this.walkDownAnim = config.walkDownAnim || `walk_${config.id}_down` || 'walk_Joaquim_down';

        // Texturas idle
        this.idleLeft = config.idleLeft || `${config.id}-idle-left`;
        this.idleRight = config.idleRight || `${config.id}-idle-right`;
        this.idleTextures = config.idleTextures || {
            up: config.idleUp || this.idleLeft,
            down: config.idleDown || this.idleRight,
            left: this.idleLeft,
            right: this.idleRight
        };

        this.isStoppedByClick = false;

        this.init();
    }

    get nextDirectionChange() {
        if (this.scene && this.scene.nextDirectionChange !== undefined && this.axis === 'vertical') {
            return this.scene.nextDirectionChange;
        }
        return this._nextDirectionChange;
    }

    set nextDirectionChange(val) {
        this._nextDirectionChange = val;
        if (this.scene && this.axis === 'vertical') {
            this.scene.nextDirectionChange = val;
        }
    }

    init() {
        if (!this.sprite) return;
        this.sprite.setCollideWorldBounds(true);
        if (this.axis === 'horizontal') {
            this.sprite.setImmovable(true);
        }
        this.startMove(true);
    }

    startMove(resetStart = true) {
        this.isPaused = false;
        this.isMoving = true;

        if (this.axis === 'vertical') {
            if (resetStart && this.sprite) {
                this.moveStartY = this.sprite.y;
            }
            if (this.direction === 'up') {
                this.sprite.setVelocity(0, -this.speed);
                if (this.walkUpAnim && this.sprite.play) this.sprite.play(this.walkUpAnim, true);
                this.lastDirection = 'up';
            } else {
                this.sprite.setVelocity(0, this.speed);
                if (this.walkDownAnim && this.sprite.play) this.sprite.play(this.walkDownAnim, true);
                this.lastDirection = 'down';
            }
        } else {
            const velX = this.direction === 'left' ? -this.speed : this.speed;
            this.sprite.setVelocityX(velX);
            const anim = this.direction === 'left' ? this.walkLeftAnim : this.walkRightAnim;
            if (anim && this.sprite.play) this.sprite.play(anim, true);
            this.lastDirection = this.direction;
        }

        this.syncScene();
    }

    startPause() {
        this.isPaused = true;
        this.isMoving = false;
        this.sprite.setVelocity(0, 0);
        if (this.sprite.anims) this.sprite.anims.stop();

        const idleTex = this.idleTextures[this.lastDirection] ||
            (this.lastDirection === 'left' ? this.idleLeft : this.idleRight);
        if (idleTex && this.sprite.setTexture) this.sprite.setTexture(idleTex);

        const now = this.scene?.time?.now ?? 0;
        this.nextDirectionChange = now + this.pauseTime;
        this.remainingPauseTime = this.pauseTime;

        this.syncScene();
    }

    update(time) {
        if (this.isStoppedByClick) {
            this.sprite.setVelocity(0, 0);
            return;
        }

        const currentTime = time ?? this.scene?.time?.now ?? 0;

        if (this.hasPause) {
            if (this.isPaused && currentTime >= this.nextDirectionChange) {
                this.direction = this.direction === 'up' ? 'down' : 'up';
                this.startMove(true);
            }

            const body = this.sprite.body;
            if (!this.isPaused) {
                const blocked = body && (body.blocked.up || body.blocked.down);
                const reachedDistance = Math.abs(this.sprite.y - this.moveStartY) >= this.verticalDistance;
                if (blocked || reachedDistance) {
                    this.startPause();
                    return;
                }
            }

            this.isMoving = !this.isPaused;
            this.syncScene();
            return;
        }

        if (this.axis === 'horizontal') {
            if (this.direction === 'left' && this.sprite.x <= this.minX) {
                this.direction = 'right';
            } else if (this.direction === 'right' && this.sprite.x >= this.maxX) {
                this.direction = 'left';
            }

            const velX = this.direction === 'left' ? -this.speed : this.speed;
            this.sprite.setVelocityX(velX);
            const anim = this.direction === 'left' ? this.walkLeftAnim : this.walkRightAnim;
            if (anim && this.sprite.play) this.sprite.play(anim, true);
        }
    }

    stop() {
        this.isStoppedByClick = true;
        if (this.hasPause && this.isPaused) {
            const now = this.scene?.time?.now ?? 0;
            this.remainingPauseTime = Math.max(0, this.nextDirectionChange - now);
        }

        this.sprite.setVelocity(0, 0);
        if (this.sprite.anims) this.sprite.anims.stop();
        const idleTex = this.idleTextures[this.lastDirection] ||
            (this.direction === 'left' ? this.idleLeft : this.idleRight);
        if (idleTex && this.sprite.setTexture) this.sprite.setTexture(idleTex);

        this.syncScene();
    }

    resume() {
        this.isStoppedByClick = false;

        if (this.hasPause) {
            if (this.isPaused) {
                const now = this.scene?.time?.now ?? 0;
                this.nextDirectionChange = now + this.remainingPauseTime;
                this.sprite.setVelocity(0, 0);
                const idleTex = this.idleTextures[this.lastDirection] ||
                    (this.direction === 'left' ? this.idleLeft : this.idleRight);
                if (idleTex && this.sprite.setTexture) this.sprite.setTexture(idleTex);
                this.syncScene();
                return;
            }
            this.startMove(false);
            return;
        }

        this.update();
    }

    syncScene() {
        if (!this.scene || this.axis !== 'vertical') return;
        this.scene.joaquim = this.sprite;
        this.scene.isMoving = this.isMoving;
        this.scene.isPaused = this.isPaused;
        this.scene.lastDirection = this.lastDirection;
        this.scene.currentDirection = this.direction;
        this.scene.playerSpeed = this.speed;
        this.scene.verticalDistance = this.verticalDistance;
        this.scene.pauseTime = this.pauseTime;
        this.scene.moveStartY = this.moveStartY;
        this.scene.nextDirectionChange = this.nextDirectionChange;
        this.scene.remainingPauseTime = this.remainingPauseTime;
        this.scene.idleTextures = this.idleTextures;
    }
}

// ========== Fachadas de compatibilidade para código legado e testes ==========

export class HorizontalMovement extends CharacterMovement {
    constructor(scene, config) {
        super(scene, config.sprite, { ...config, axis: 'horizontal' });
    }
}

export class JoaquimMovement extends CharacterMovement {
    constructor(scene) {
        super(scene, scene.joaquim, {
            axis: 'vertical',
            speed: scene.playerSpeed ?? 30,
            verticalDistance: scene.verticalDistance ?? 120,
            pauseTime: scene.pauseTime ?? 700,
            hasPause: true
        });
    }
}

export function createHorizontalWalker(scene, config) {
    return new CharacterMovement(scene, config.sprite, { ...config, axis: 'horizontal' });
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
    if (scene.joaquimMovement) {
        scene.joaquimMovement.startMove(resetMoveStart);
    }
}

export function startPause(scene) {
    if (scene.joaquimMovement) {
        scene.joaquimMovement.startPause();
    }
}

export function stopJoaquimForInteraction(scene) {
    if (scene.joaquimMovement) {
        scene.joaquimMovement.stop();
    }
}

export function resumeJoaquimFromInteraction(scene) {
    if (scene.joaquimMovement) {
        scene.joaquimMovement.resume();
    }
}
