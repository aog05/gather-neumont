import Phaser from "phaser";
import { GroundFloor } from "./maps/GroundFloor";
import { NPCManager } from "../entities/NPCManager";
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
  private dialogueManager!: DialogueManager;
  private gameState!: GameState;
  private bridge!: GameEventBridge;
  private playerState: "EXPLORING" | "DIALOGUE" = "EXPLORING";
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private quizTerminal!: Phaser.GameObjects.Rectangle;
  private quizTerminalZone!: Phaser.GameObjects.Zone;
  private quizPromptText!: Phaser.GameObjects.Text;

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

    // Get spawn position from map
    const spawnPos = groundFloor.getSpawnPosition();

    // Create player (blue square)
    this.player = this.add.rectangle(
      spawnPos.x,
      spawnPos.y,
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
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    // Daily Quiz "terminal" (placeholder interactable)
    const terminalX = spawnPos.x + 120;
    const terminalY = spawnPos.y;

    this.quizTerminal = this.add.rectangle(
      terminalX,
      terminalY,
      78,
      62,
      0x7c3aed,
    );
    this.quizTerminal.setStrokeStyle(2, 0xffffff, 0.9);
    this.quizTerminal.setDepth(2);

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

    // Overlap zone (slightly larger than the terminal so it feels usable)
    this.quizTerminalZone = this.add.zone(terminalX, terminalY, 140, 120);
    this.physics.add.existing(this.quizTerminalZone, true);

    this.quizPromptText = this.add.text(
      terminalX,
      terminalY + 54,
      "Press E to start quiz",
      {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        padding: { x: 8, y: 4 },
      },
    );
    this.quizPromptText.setOrigin(0.5);
    this.quizPromptText.setVisible(false);
    this.quizPromptText.setDepth(3);

    // Configure camera to follow player
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.0);

    // Initialize game systems
    this.bridge = GameEventBridge.getInstance();
    this.gameState = new GameState();

    // Set player username for quest operations (matches Game.tsx)
    this.gameState.setPlayerUsername("sarah_dev");

    this.dialogueManager = new DialogueManager(this.gameState, this.bridge);

    // Initialize NPC system
    this.npcManager = new NPCManager(this);
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
      if (this.quizPromptText) {
        this.quizPromptText.setVisible(false);
      }
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

    const isNearTerminal =
      Boolean(
        this.quizTerminalZone &&
        this.physics.overlap(this.player, this.quizTerminalZone),
      ) ||
      Boolean(
        this.quizTerminal &&
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          this.quizTerminal.x,
          this.quizTerminal.y,
        ) <= 90,
      );

    if (this.quizPromptText) {
      this.quizPromptText.setVisible(isNearTerminal);
    }

    if (
      isNearTerminal &&
      this.interactKey &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      console.log("[quiz] dailyQuiz:start dispatched");
      window.dispatchEvent(new CustomEvent("dailyQuiz:start"));
    }
  }
}
