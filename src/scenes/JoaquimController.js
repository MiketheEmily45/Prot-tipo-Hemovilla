import { createJoaquimAnimations } from './CityCharacters.js';
import { startMove, startPause, stopJoaquimForInteraction, resumeJoaquimFromInteraction } from './CharacterMovement.js';
import { registerClickableCharacter } from './ClickableCharacterManager.js';

export class JoaquimController {
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        const scene = this.scene;
        createJoaquimAnimations(scene);

        scene.joaquim = scene.physics.add.sprite(120, 480, 'joaquim-idle-right');
        scene.joaquim.setCollideWorldBounds(true);

        scene.isMoving = false;
        scene.lastDirection = 'down';
        scene.idleTextures = {
            up: 'joaquim-idle-left',
            down: 'joaquim-idle-right',
            left: 'joaquim-idle-left',
            right: 'joaquim-idle-right'
        };

        scene.playerSpeed = 30;
        scene.verticalDistance = 120;
        scene.pauseTime = 700;
        scene.isPaused = false;
        scene.currentDirection = 'up';
        scene.moveStartY = scene.joaquim.y;
        scene.nextDirectionChange = scene.time.now + scene.pauseTime;
        scene.remainingPauseTime = scene.pauseTime;

        startMove(scene);

        registerClickableCharacter(scene, {
            sprite: scene.joaquim,
            balloonOffset: { x: 0, y: -55 },
            alertInterval: 60000,
            iconButtonKey: 'joaquim',
            stop: () => stopJoaquimForInteraction(scene),
            resume: () => resumeJoaquimFromInteraction(scene)
        });
    }

    update(time) {
        const scene = this.scene;
        const joaquimInteraction = scene.clickableCharacters && scene.clickableCharacters[0];
        if (joaquimInteraction && joaquimInteraction.isStoppedByClick) {
            scene.joaquim.setVelocity(0, 0);
            return;
        }

        if (scene.isPaused && time >= scene.nextDirectionChange) {
            scene.currentDirection = scene.currentDirection === 'up' ? 'down' : 'up';
            startMove(scene);
        }

        const body = scene.joaquim.body;
        if (!scene.isPaused && body && (body.blocked.up || body.blocked.down)) {
            startPause(scene);
            return;
        }

        if (!scene.isPaused && Math.abs(scene.joaquim.y - scene.moveStartY) >= scene.verticalDistance) {
            startPause(scene);
            return;
        }

        scene.isMoving = !scene.isPaused;
    }
}
