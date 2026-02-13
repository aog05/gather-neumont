import Phaser from "phaser";
import { GroundFloor } from "./maps/GroundFloor";
import { NPCManager } from "../entities/NPCManager";
import { DialogueManager } from "../systems/DialogueManager";
import { GameState } from "../systems/GameState";
import { GameEventBridge } from "../systems/GameEventBridge";

const PLAYER_SPEED = 200;
const PLAYER_SIZE = 50;

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

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // No assets to load for MVP - using simple shapes
  }

  create(): void {
    // Create walls group for physics
    const walls = this.physics.add.staticGroup();

    // Create ground floor layout from map file
    GroundFloor.createWalls(this, walls);

    // Get spawn position from map
    const spawnPos = GroundFloor.getSpawnPosition();

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
    playerBody.setCollideWorldBounds(true);

    // Set up collision between player and walls
    this.physics.add.collider(this.player, walls);

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

    // Configure camera to follow player
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.0);
    this.cameras.main.setBounds(0, 0, GroundFloor.WIDTH, GroundFloor.HEIGHT);

    // Set physics world bounds to match map
    this.physics.world.setBounds(0, 0, GroundFloor.WIDTH, GroundFloor.HEIGHT);

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
        console.log(`Dialogue requested: NPC ${data.npcId}, Tree ${data.treeId}`);
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
