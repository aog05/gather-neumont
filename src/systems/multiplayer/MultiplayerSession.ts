import type {
  MultiplayerTransport,
  PlayerSnapshot,
  RemotePlayerState,
  TransportStatus,
} from "./types";

interface SessionOptions {
  roomId: string;
  displayName: string;
}

type RemotePlayersListener = (players: RemotePlayerState[]) => void;
type StatusListener = (status: TransportStatus) => void;

export class MultiplayerSession {
  private readonly transport: MultiplayerTransport;
  private readonly localPlayerId: string;
  private remotePlayers = new Map<string, RemotePlayerState>();
  private remoteListeners = new Set<RemotePlayersListener>();
  private statusListeners = new Set<StatusListener>();
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeStatus: (() => void) | null = null;
  private isStarted = false;

  constructor(transport: MultiplayerTransport) {
    this.transport = transport;
    this.localPlayerId = `player_${Math.random().toString(36).slice(2, 10)}`;
  }

  public async start(options: SessionOptions): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.unsubscribeMessage = this.transport.onMessage((message) => {
      switch (message.type) {
        case "player_join": {
          if (message.playerId === this.localPlayerId) {
            return;
          }

          const existing = this.remotePlayers.get(message.playerId);
          this.remotePlayers.set(message.playerId, {
            playerId: message.playerId,
            displayName: message.displayName,
            snapshot: existing?.snapshot ?? {
              x: 0,
              y: 0,
              vx: 0,
              vy: 0,
              isMoving: false,
              timestamp: Date.now(),
            },
            updatedAt: Date.now(),
          });
          this.emitRemotePlayers();
          break;
        }
        case "player_leave": {
          this.remotePlayers.delete(message.playerId);
          this.emitRemotePlayers();
          break;
        }
        case "player_state": {
          if (message.playerId === this.localPlayerId) {
            return;
          }

          const existing = this.remotePlayers.get(message.playerId);
          this.remotePlayers.set(message.playerId, {
            playerId: message.playerId,
            displayName: existing?.displayName ?? "Player",
            snapshot: message.snapshot,
            updatedAt: Date.now(),
          });
          this.emitRemotePlayers();
          break;
        }
        case "state_sync": {
          for (const player of message.players) {
            if (player.playerId === this.localPlayerId) {
              continue;
            }

            this.remotePlayers.set(player.playerId, {
              playerId: player.playerId,
              displayName: player.displayName,
              snapshot: player.snapshot,
              updatedAt: Date.now(),
            });
          }
          this.emitRemotePlayers();
          break;
        }
      }
    });

    this.unsubscribeStatus = this.transport.onStatusChange((status) => {
      this.emitStatus(status);
    });

    await this.transport.connect({
      roomId: options.roomId,
      playerId: this.localPlayerId,
      displayName: options.displayName,
    });

    this.isStarted = true;
  }

  public stop(): void {
    if (!this.isStarted) {
      return;
    }

    this.transport.disconnect();
    this.unsubscribeMessage?.();
    this.unsubscribeStatus?.();
    this.unsubscribeMessage = null;
    this.unsubscribeStatus = null;
    this.remotePlayers.clear();
    this.emitRemotePlayers();
    this.isStarted = false;
  }

  public publishLocalState(snapshot: PlayerSnapshot): void {
    if (!this.isStarted) {
      return;
    }

    this.transport.send({
      type: "player_state",
      playerId: this.localPlayerId,
      snapshot,
    });
  }

  public onRemotePlayersChange(listener: RemotePlayersListener): () => void {
    this.remoteListeners.add(listener);
    listener(this.getRemotePlayers());

    return () => {
      this.remoteListeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getRemotePlayers(): RemotePlayerState[] {
    return Array.from(this.remotePlayers.values());
  }

  public getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  private emitRemotePlayers(): void {
    const players = this.getRemotePlayers();
    for (const listener of this.remoteListeners) {
      listener(players);
    }
  }

  private emitStatus(status: TransportStatus): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
