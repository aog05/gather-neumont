import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

/**
 * Phaser game configuration for Neumont Virtual Campus
 * Game scales to fill the entire browser window
 */
function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent,
    backgroundColor: "#000000",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [MainScene],
  };

  return new Phaser.Game(config);
}

export default createGame;
