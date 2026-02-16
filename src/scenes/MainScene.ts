import Phaser from "phaser";
import { GroundFloor } from "./maps/GroundFloor";
import { NPCManager } from "../entities/NPCManager";
import { QuizTerminalManager } from "../entities/QuizTerminalManager";
import { DialogueManager } from "../systems/DialogueManager";
import { GameState } from "../systems/GameState";
import { GameEventBridge } from "../systems/GameEventBridge";

const PLAYER_SPEED = 200;
const PLAYER_SIZE = 50;

const temporaryMap = `
-0007,-0003 ob
+0005,-0005 ob
+0005,+0001 ob
+0000,-0001
-0005,-0007
+0002,-0007
-0002,-0004
+0002,-0005
-0005,+0005
-0006,+0002
+0003,+0002
+0001,+0005
+0006,+0000
-0008,+0000 ob
-0008,-0007 ob
+0002,-0009 ob
+0008,-0004 ob
-0003,+0007 ob
`;

/**
 * MainScene - The primary game scene for the Neumont Virtual Campus
 * Features the ground floor layout with multiple rooms and collision detection
 */
export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private npcManager!: NPCManager;
  private quizTerminalManager!: QuizTerminalManager;
  private dialogueManager!: DialogueManager;
  private gameState!: GameState;
  private bridge!: GameEventBridge;
  private playerState: "EXPLORING" | "DIALOGUE" = "EXPLORING";
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private interactionKey!: Phaser.Input.Keyboard.Key; // Shared E key for NPCs and terminal

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // No assets to load for MVP - using simple shapes
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
    const npcCenterY = (400 + 800 + 600) / 3;   // = 600

    console.log(`[MainScene] Player spawning at center of NPCs: (${npcCenterX}, ${npcCenterY})`);

    // Create player (blue square) at center of NPCs
    this.player = this.add.rectangle(
      npcCenterX,
      npcCenterY,
      PLAYER_SIZE,
      PLAYER_SIZE,
      0x0000ff,
    );

    // Enable physics on player
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    // Set up collision between player and tiles
    this.physics.add.collider(this.player, tiles);

    // Set up keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.escapeKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );

    // Create shared interaction key (E) for NPCs and quiz terminal
    // This prevents the key press from being consumed by the first manager
    this.interactionKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
    console.log(`[MainScene] Created shared E key for interactions`);

    // Create quiz terminal manager (follows NPC pattern)
    // Terminal spawns ABOVE the player (negative Y offset)
    this.quizTerminalManager = new QuizTerminalManager(this, this.interactionKey);
    const terminalX = npcCenterX;
    const terminalY = npcCenterY - 150; // 150px above player
    console.log(`[MainScene] Quiz terminal spawning above player at: (${terminalX}, ${terminalY})`);
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
    this.cameras.main.startFollow(this.player);
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
      this.playerState = "DIALOGUE";
      console.log("Player state: DIALOGUE");
    });

    this.bridge.on("dialogue:end", () => {
      this.playerState = "EXPLORING";
      console.log("Player state: EXPLORING");
    });
  }

  override update(): void {
    if (!this.player || !this.player.body) {
      return;
    }

    // IMPORTANT: Update quiz terminal BEFORE NPCs
    // This ensures terminal gets priority for E key interaction
    // when player is near terminal (prevents NPCManager from consuming JustDown)
    this.quizTerminalManager.update(this.player);

    // Update NPC system
    this.npcManager.update(this.player);

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    // Handle Escape key to close dialogue
    if (
      this.playerState === "DIALOGUE" &&
      Phaser.Input.Keyboard.JustDown(this.escapeKey)
    ) {
      this.bridge.emit("dialogue:close", {});
    }

    // Disable player movement during dialogue
    if (this.playerState === "DIALOGUE") {
      playerBody.setVelocity(0, 0);
      return; // Skip movement input
    }

    // Handle horizontal movement (Arrow keys or WASD)
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      playerBody.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      playerBody.setVelocityX(PLAYER_SPEED);
    } else {
      playerBody.setVelocityX(0);
    }

    // Handle vertical movement (Arrow keys or WASD)
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      playerBody.setVelocityY(-PLAYER_SPEED);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      playerBody.setVelocityY(PLAYER_SPEED);
    } else {
      playerBody.setVelocityY(0);
    }
  }
}
