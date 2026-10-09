export class Character {
    constructor(scene, config = {}) {
        this.scene = scene;
        Object.assign(this, config);
        this.isStoppedByClick = false;
        this.balloon = null;
        this.miniGameButton = null;
        this.descriptionButton = null;
        this.alertIcon = null;
        this.alertOffset = config.alertOffset || { x: -13, y: -35 };
        this.nextAlertTime = config.alertInterval ? scene.time.now + config.alertInterval : null;

        if (typeof config.stop === 'function') {
            this.stop = config.stop;
        }
        if (typeof config.resume === 'function') {
            this.resume = config.resume;
        }
    }

    stop() {
        // Callback padrão caso não definido
    }

    resume() {
        // Callback padrão caso não definido
    }
}
