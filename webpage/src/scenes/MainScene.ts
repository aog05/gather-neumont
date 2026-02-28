import Phaser from "phaser";
import { GroundFloor } from "./maps/GroundFloor";
import { GROUND_FLOOR_TILED_MAP } from "./maps/groundFloorMap";
import { NPCManager } from "../entities/NPCManager";
import { QuizTerminalManager } from "../entities/QuizTerminalManager";
import { DialogueManager } from "../systems/DialogueManager";
import { GameState } from "../systems/GameState";
import { GameEventBridge } from "../systems/GameEventBridge";
import { PlayerController } from "../entities/PlayerController";
import { MapParser } from "@/utils/MapParser";
import { AsepriteParser } from "@/utils/AsepriteParser";
import { MULTIPLAYER_CONFIG } from "../config/multiplayer";
import {
  LocalLoopbackTransport,
  MultiplayerSession,
} from "../systems/multiplayer";

const PLAYER_TEXTURE_KEY = "player";
const PLAYER_ATLAS_PNG_PATH = "assets/sprites/player.png";
const PLAYER_ATLAS_JSON_PATH = "assets/sprites/player.json";
const PLAYER_ATLAS_JSON_CACHE_KEY = "player-aseprite-json";

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
  private multiplayerSession: MultiplayerSession | null = null;
  private lastMultiplayerPublishAt = 0;
  private remotePlayerCount = 0;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    MapParser.preloadTiledMapAssets(GROUND_FLOOR_TILED_MAP, this);
    AsepriteParser.preloadAtlas(this, {
      textureKey: PLAYER_TEXTURE_KEY,
      pngPath: PLAYER_ATLAS_PNG_PATH,
      jsonPath: PLAYER_ATLAS_JSON_PATH,
    });
    this.load.json(PLAYER_ATLAS_JSON_CACHE_KEY, PLAYER_ATLAS_JSON_PATH);
  }

  create(): void {
    // Create tiles group for physics
    const tiles = this.physics.add.staticGroup();
    const groundFloor = new GroundFloor(GROUND_FLOOR_TILED_MAP);

    // Create ground floor layout from map file
    groundFloor.createTiles(this, tiles);

    // Calculate center point between the three NPCs
    // Dean Walsh: (500, 400), Dr. Chen: (1200, 800), Prof. Rodriguez: (1800, 600)
    const npcCenterX = (500 + 1200 + 1800) / 3; // = 1166.67
    const npcCenterY = (400 + 800 + 600) / 3; // = 600

    console.log(
      `[MainScene] Player spawning at center of NPCs: (${npcCenterX}, ${npcCenterY})`,
    );

    AsepriteParser.createAnimationsFromCache(this, {
      textureKey: PLAYER_TEXTURE_KEY,
      jsonKey: PLAYER_ATLAS_JSON_CACHE_KEY,
      animationKeyPrefix: PLAYER_TEXTURE_KEY,
      defaultRepeat: -1,
    });

    this.playerController = new PlayerController(this);
    this.playerController.create(npcCenterX, npcCenterY, tiles, () =>
      this.bridge.emit("dialogue:close", {}),
    );
    const player = this.playerController.getGameObject();

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

    // Configure camera to follow player
    this.cameras.main.startFollow(player);
    this.cameras.main.setZoom(1.0);

    // Initialize game systems
    this.bridge = GameEventBridge.getInstance();
    this.gameState = new GameState();

    // Set player username for quest operations (matches Game.tsx)
    this.gameState.setPlayerUsername("sarah_dev");

    this.dialogueManager = new DialogueManager(this.gameState, this.bridge);
    this.setupMultiplayer();

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
      this.playerController.setPlayerState("DIALOGUE");
      console.log("Player state: DIALOGUE");
    });

    this.bridge.on("dialogue:end", () => {
      this.playerController.setPlayerState("EXPLORING");
      console.log("Player state: EXPLORING");
    });

    this.bridge.on("popup:show", () => {
      this.playerController.setPlayerState("POPUP");
      console.log("Player state: POPUP");
    });

    this.bridge.on("popup:hide", () => {
      this.playerController.setPlayerState("EXPLORING");
      console.log("Player state: EXPLORING");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.multiplayerSession?.stop();
      this.multiplayerSession = null;
    });

    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.multiplayerSession?.stop();
      this.multiplayerSession = null;
    });
  }

  override update(): void {
    const player = this.playerController?.getGameObject();
    if (!player || !player.body) {
      return;
    }

    // Update quiz terminal system
    this.quizTerminalManager.update(this.playerController);

    // Update NPC system
    this.npcManager.update(this.playerController);

    this.playerController.update();

    this.publishMultiplayerState();
  }

  private setupMultiplayer(): void {
    if (MULTIPLAYER_CONFIG.mode === "disabled") {
      console.log("[MainScene] Multiplayer disabled");
      return;
    }

    if (MULTIPLAYER_CONFIG.mode === "local-loopback") {
      this.multiplayerSession = new MultiplayerSession(
        new LocalLoopbackTransport(),
      );

      this.multiplayerSession.onStatusChange((status) => {
        console.log(`[MainScene] Multiplayer status: ${status}`);
      });

      this.multiplayerSession.onRemotePlayersChange((players) => {
        if (players.length !== this.remotePlayerCount) {
          this.remotePlayerCount = players.length;
          console.log(
            `[MainScene] Remote players connected: ${players.length}`,
          );
        }
      });

      void this.multiplayerSession
        .start({
          roomId: MULTIPLAYER_CONFIG.roomId,
          displayName: "sarah_dev",
        })
        .catch((error) => {
          console.error(
            "[MainScene] Failed to start multiplayer session:",
            error,
          );
        });
    }
  }

  private publishMultiplayerState(): void {
    if (!this.multiplayerSession) {
      return;
    }

    const now = this.time.now;
    if (
      now - this.lastMultiplayerPublishAt <
      MULTIPLAYER_CONFIG.statePublishIntervalMs
    ) {
      return;
    }

    this.multiplayerSession.publishLocalState(
      this.playerController.getMultiplayerSnapshot(),
    );
    this.lastMultiplayerPublishAt = now;
  }
}
