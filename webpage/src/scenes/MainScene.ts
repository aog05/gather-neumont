import Phaser from "phaser";
import { GroundFloor } from "./maps/GroundFloor";
import { NPCManager } from "../entities/NPCManager";
import { QuizTerminalManager } from "../entities/QuizTerminalManager";
import { ForumTerminalManager } from "../entities/ForumTerminalManager";
import { DialogueManager } from "../systems/DialogueManager";
import { GameState } from "../systems/GameState";
import { GameEventBridge } from "../systems/GameEventBridge";
import {
  AnalyticsService,
  AnalyticsEventType,
} from "../services/analytics.service";

const PLAYER_SPEED = 200;
const PLAYER_SIZE = 50;
const GROUND_FLOOR_MAP_KEY = "ground-floor-map";
const GROUND_FLOOR_TILESET_KEY = "ground-floor-tileset";

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
  private forumTerminalManager!: ForumTerminalManager;
  private dialogueManager!: DialogueManager;
  private gameState!: GameState;
  private bridge!: GameEventBridge;
  private playerState: "EXPLORING" | "DIALOGUE" = "EXPLORING";
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private interactionKey!: Phaser.Input.Keyboard.Key; // Shared E key for NPCs and terminal
  private analyticsService!: AnalyticsService;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    this.load.json(
      GROUND_FLOOR_MAP_KEY,
      "assets/images/map/ground_floor/ground_floor_map.json",
    );
    this.load.json(
      GROUND_FLOOR_TILESET_KEY,
      "assets/images/map/ground_floor/Wooden House.json",
    );
    this.load.image(
      "Wooden House.png",
      "assets/images/map/ground_floor/Wooden House.png",
    );
  }

  create(): void {
    const tiledMapData: string = JSON.stringify(
      this.cache.json.get(GROUND_FLOOR_MAP_KEY),
    );
    const tiledTilesetData: string = JSON.stringify(
      this.cache.json.get(GROUND_FLOOR_TILESET_KEY),
    );

    if (!tiledMapData || !tiledTilesetData) {
      throw new Error("Ground floor map assets failed to load.");
    }

    // Create tiles group for physics
    const tiles = this.physics.add.staticGroup();
    const groundFloor = new GroundFloor(tiledMapData, tiledTilesetData);

    // Create ground floor layout from map file
    groundFloor.createTiles(this, tiles);

    // Calculate center point between the three NPCs
    // Dean Walsh: (500, 400), Dr. Chen: (1200, 800), Prof. Rodriguez: (1800, 600)
    const npcCenterX = (500 + 1200 + 1800) / 3; // = 1166.67
    const npcCenterY = (400 + 800 + 600) / 3; // = 600

    console.log(
      `[MainScene] Player spawning at center of NPCs: (${npcCenterX}, ${npcCenterY})`,
    );

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

    // Create forum terminal manager (same E-key + browser event pattern as quiz terminal).
    this.forumTerminalManager = new ForumTerminalManager(
      this,
      this.interactionKey,
    );
    const forumTerminalX = npcCenterX + 150;
    const forumTerminalY = npcCenterY - 150;
    this.forumTerminalManager.createTerminal(forumTerminalX, forumTerminalY);

    const forumLabel = this.add.text(
      forumTerminalX,
      forumTerminalY - 6,
      "Forum",
      {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "600",
      },
    );
    forumLabel.setOrigin(0.5);
    forumLabel.setDepth(3);

    // Configure camera to follow player
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.0);

    // Initialize game systems
    this.bridge = GameEventBridge.getInstance();
    this.gameState = new GameState();

    // Set player username for quest operations (matches Game.tsx)
    this.gameState.setPlayerUsername("sarah_dev");

    this.dialogueManager = new DialogueManager(this.gameState, this.bridge);

    // Initialize analytics service and track session start
    this.analyticsService = AnalyticsService.getInstance();
    this.analyticsService.trackSessionStart("sarah_dev");
    this.analyticsService.trackEvent(
      AnalyticsEventType.SCENE_ENTER,
      "sarah_dev",
      { scene: "MainScene", floor: "ground" },
    );

    // Initialize NPC system with shared interaction key
    this.npcManager = new NPCManager(this, this.interactionKey);
    this.npcManager.loadNPCs(1); // Load ground floor NPCs

    // Listen for dialogue requests from NPCs
    this.bridge.on(
      "dialogue:request",
      (data: {
        npcId: string;
        npcName?: string;
        treeId: string;
        startNode: string;
      }) => {
        console.log(
          `Dialogue requested: NPC ${data.npcId}${data.npcName ? ` (${data.npcName})` : ""}, Tree ${data.treeId}`,
        );
        this.dialogueManager.startDialogue(
          data.npcId,
          data.treeId,
          data.startNode,
          data.npcName,
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

  /**
   * Dispatch E key to the single closest in-range interactable.
   * Reads JustDown exactly once per frame to avoid the destructive _justDown flag bug.
   */
  private dispatchEInteraction(): void {
    const candidates: Array<{ dist: number; idx: number; interact: () => void }> = [];

    const fd = this.forumTerminalManager.nearestInRangeDistance();
    if (fd !== null) {
      candidates.push({ dist: fd, idx: 0, interact: () => { this.forumTerminalManager.tryInteract(); } });
    }

    const qd = this.quizTerminalManager.nearestInRangeDistance();
    if (qd !== null) {
      candidates.push({ dist: qd, idx: 1, interact: () => { this.quizTerminalManager.tryInteract(); } });
    }

    const nd = this.npcManager.nearestInRangeDistance();
    if (nd !== null) {
      candidates.push({ dist: nd, idx: 2, interact: () => { this.npcManager.tryInteract(); } });
    }

    // Sort by distance; use insertion index as deterministic tie-breaker.
    candidates.sort((a, b) => a.dist - b.dist || a.idx - b.idx);
    candidates[0]?.interact();
  }

  override update(): void {
    if (!this.player || !this.player.body) {
      return;
    }

    // Read JustDown exactly once — Phaser.Input.Keyboard.JustDown is destructive
    // (it clears the _justDown flag after the first read). All managers must use
    // the pre-read value via dispatchEInteraction().
    const eJustDown = Phaser.Input.Keyboard.JustDown(this.interactionKey);

    // Phase 1: all managers update proximity (no key handling here).
    this.forumTerminalManager.updateProximity(this.player);
    this.quizTerminalManager.updateProximity(this.player);
    this.npcManager.updateProximity(this.player);

    // Phase 2: if E was pressed this frame, dispatch to closest in-range interactable.
    if (eJustDown) {
      this.dispatchEInteraction();
    }

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

  /**
   * Cleanup when scene is destroyed
   */
  shutdown(): void {
    // Track session end before scene shutdown
    if (this.analyticsService) {
      this.analyticsService.trackSessionEnd("sarah_dev");
    }
  }
}
