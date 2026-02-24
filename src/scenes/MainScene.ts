import Phaser from "phaser";
import { GroundFloor } from "./maps/GroundFloor";
import { NPCManager } from "../entities/NPCManager";
import { QuizTerminalManager } from "../entities/QuizTerminalManager";
import { DialogueManager } from "../systems/DialogueManager";
import { GameState } from "../systems/GameState";
import { GameEventBridge } from "../systems/GameEventBridge";
import { MapParser } from "@/utils/MapParser";
import { PlayerController } from "../entities/PlayerController";

const temporaryMap = `
-0002,-0001 tex=assets/test-images/IMG_5026.png
+0000,-0001 tex=assets/test-images/IMG_5090.png
+0001,-0006 tex=assets/test-images/IMG_5093.png
-0003,+0005 tex=assets/test-images/waterfall_pixel_art.png
+0010,+0002 tex=assets/test-images/waterfall_pixel_art.png
-000d,-0005 tex=assets/test-images/IMG_4948.png
-0005,-0005 tex=assets/test-images/IMG_4948.png
+0004,+0001 tex=assets/test-images/IMG_2025.png
+0005,-0005 ob tex=assets/test-images/IMG_2025.png
+0006,-0008 ob tex=assets/test-images/IMG_2025.png
-0009,+0004 ob tex=assets/test-images/IMG_5090.png
`;

/**
 * MainScene - The primary game scene for the Neumont Virtual Campus
 * Features the ground floor layout with multiple rooms and collision detection
 */
export class MainScene extends Phaser.Scene {
  private playerController!: PlayerController;
  private npcManager!: NPCManager;
  private quizTerminalManager!: QuizTerminalManager;
  private dialogueManager!: DialogueManager;
  private gameState!: GameState;
  private bridge!: GameEventBridge;
  private interactionKey!: Phaser.Input.Keyboard.Key; // Shared E key for NPCs and terminal

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    MapParser.preloadMapAssets(temporaryMap, this);
  }

  create(): void {
    // Create tiles group for physics
    const tiles = this.physics.add.staticGroup();
    const groundFloor = new GroundFloor(temporaryMap);

    // Create ground floor layout from map file
    groundFloor.createTiles(this, tiles);

    // Calculate center point between the three NPCs
    // Dean Walsh: (500, 400), Dr. Chen: (1200, 800), Prof. Rodriguez: (1800, 600)
    const npcCenterX = (500 + 1200 + 1800) / 3; // = 1166.67
    const npcCenterY = (400 + 800 + 600) / 3; // = 600

    console.log(
      `[MainScene] Player spawning at center of NPCs: (${npcCenterX}, ${npcCenterY})`,
    );

    this.playerController = new PlayerController(this);
    this.playerController.create(npcCenterX, npcCenterY, tiles);
    const player = this.playerController.getPlayer();

    // Create shared interaction key (E) for NPCs and quiz terminal
    // This prevents the key press from being consumed by the first manager
    this.interactionKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
    this.playerController.setInteractionKey(this.interactionKey);
    console.log(`[MainScene] Created shared E key for interactions`);

    // Create quiz terminal manager (follows NPC pattern)
    // Terminal spawns ABOVE the player (negative Y offset)
    this.quizTerminalManager = new QuizTerminalManager(
      this,
      this.interactionKey,
    );
    const terminalX = npcCenterX;
    const terminalY = npcCenterY - 150; // 150px above player
    console.log(
      `[MainScene] Quiz terminal spawning above player at: (${terminalX}, ${terminalY})`,
    );
    this.quizTerminalManager.createTerminal(terminalX, terminalY);

    // Add "Daily Quiz" label above terminal
    const terminalLabel = this.add.text(
      terminalX,
      terminalY - 6,
      "Daily Quiz",
      {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "600",
      },
    );
    terminalLabel.setOrigin(0.5);
    terminalLabel.setDepth(3);

    // Configure camera to follow player
    this.cameras.main.startFollow(player);
    this.cameras.main.setZoom(1.0);

    // Initialize game systems
    this.bridge = GameEventBridge.getInstance();
    this.gameState = new GameState();

    // Set player username for quest operations (matches Game.tsx)
    this.gameState.setPlayerUsername("sarah_dev");

    this.dialogueManager = new DialogueManager(this.gameState, this.bridge);

    // Initialize NPC system with shared interaction key
    this.npcManager = new NPCManager(this, this.interactionKey);
    this.npcManager.loadNPCs(1); // Load ground floor NPCs

    // Listen for dialogue requests from NPCs
    this.bridge.on(
      "dialogue:request",
      (data: { npcId: string; treeId: string; startNode: string }) => {
        console.log(
          `Dialogue requested: NPC ${data.npcId}, Tree ${data.treeId}`,
        );
        this.dialogueManager.startDialogue(
          data.npcId,
          data.treeId,
          data.startNode,
        );
      },
    );

    // Listen for player state changes
    this.bridge.on("dialogue:start", () => {
      this.playerController.setDialogueActive(true);
      console.log("Player state: DIALOGUE");
    });

    this.bridge.on("dialogue:end", () => {
      this.playerController.setDialogueActive(false);
      console.log("Player state: EXPLORING");
    });
  }

  override update(): void {
    const player = this.playerController?.getPlayer();
    if (!player || !player.body) {
      return;
    }

    this.playerController.captureJustDownStates();
    const interactionJustDown = this.playerController.getInteractionJustDown();

    // IMPORTANT: Update quiz terminal BEFORE NPCs
    // This ensures terminal gets priority for E key interaction
    // when player is near terminal (prevents NPCManager from consuming JustDown)
    const terminalHandledInteraction = this.quizTerminalManager.update(
      player,
      interactionJustDown,
    );

    // Update NPC system
    this.npcManager.update(
      player,
      interactionJustDown && !terminalHandledInteraction,
    );

    this.playerController.update(() => {
      this.bridge.emit("dialogue:close", {});
    });
  }
}
