import type { MultiplayerMode } from "../systems/multiplayer";

interface MultiplayerConfig {
  mode: MultiplayerMode;
  roomId: string;
  statePublishIntervalMs: number;
}

/**
 * Multiplayer defaults are intentionally server-agnostic.
 * `local-loopback` lets us exercise the multiplayer client flow now,
 * while we decide the production server transport.
 */
export const MULTIPLAYER_CONFIG: MultiplayerConfig = {
  mode: "local-loopback",
  roomId: "ground-floor-dev",
  statePublishIntervalMs: 100,
};
