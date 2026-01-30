import { useEffect, useRef } from "react";
import Phaser from "phaser";
import createGame from "./game.ts";

function GamePage() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Initialize Phaser game on mount
    if (!gameRef.current) {
      gameRef.current = createGame("game-container");
    }

    // Cleanup: destroy game on unmount to prevent memory leaks
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="game-wrapper">
      <div id="game-container" />
    </div>
  );
}

export default GamePage;
