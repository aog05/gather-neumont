import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

/**
 * Phaser game configuration for Neumont Virtual Campus
 */
function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent,
    backgroundColor: "#000000",
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
