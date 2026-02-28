export type MultiplayerMode = "disabled" | "local-loopback";

export type TransportStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isMoving: boolean;
  timestamp: number;
}

export interface RemotePlayerState {
  playerId: string;
  displayName: string;
  snapshot: PlayerSnapshot;
  updatedAt: number;
}

export type MultiplayerMessage =
  | {
      type: "player_join";
      playerId: string;
      displayName: string;
    }
  | {
      type: "player_leave";
      playerId: string;
    }
  | {
      type: "player_state";
      playerId: string;
      snapshot: PlayerSnapshot;
    }
  | {
      type: "state_sync";
      players: Array<{
        playerId: string;
        displayName: string;
        snapshot: PlayerSnapshot;
      }>;
    };

export interface TransportConnectOptions {
  roomId: string;
  playerId: string;
  displayName: string;
}

export interface MultiplayerTransport {
  connect(options: TransportConnectOptions): Promise<void>;
  disconnect(): void;
  send(message: MultiplayerMessage): void;
  onMessage(handler: (message: MultiplayerMessage) => void): () => void;
  onStatusChange(handler: (status: TransportStatus) => void): () => void;
}
