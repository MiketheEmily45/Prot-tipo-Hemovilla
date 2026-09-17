import { Start } from './scenes/Start.js'
import { GameMap } from './scenes/GameMap.js'
import { ConfigMenu } from './scenes/ConfigMenu.js'
import { Minigame } from './scenes/Minigame.js'

const config = {
    type: Phaser.AUTO,
    title: 'Overlord Rising',
    description: '',
    parent: 'game-container',
    width: 512,
    height: 512,
    backgroundColor: '#000000',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        Start,
        GameMap,
        ConfigMenu,
        Minigame
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
            
