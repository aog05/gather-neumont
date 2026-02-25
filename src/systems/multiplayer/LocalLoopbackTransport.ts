import type {
  MultiplayerMessage,
  MultiplayerTransport,
  TransportConnectOptions,
  TransportStatus,
} from "./types";

type MessageHandler = (message: MultiplayerMessage) => void;
type StatusHandler = (status: TransportStatus) => void;

interface LoopbackClient {
  playerId: string;
  displayName: string;
  deliver: MessageHandler;
}

class LoopbackRoomHub {
  private static rooms = new Map<string, Map<string, LoopbackClient>>();

  public static join(roomId: string, client: LoopbackClient): void {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }

    const existingPlayers = Array.from(room.values()).map((member) => ({
      playerId: member.playerId,
      displayName: member.displayName,
    }));

    room.set(client.playerId, client);

    client.deliver({
      type: "state_sync",
      players: existingPlayers.map((player) => ({
        ...player,
        snapshot: {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          isMoving: false,
          timestamp: Date.now(),
        },
      })),
    });

    for (const member of room.values()) {
      if (member.playerId === client.playerId) {
        continue;
      }

      member.deliver({
        type: "player_join",
        playerId: client.playerId,
        displayName: client.displayName,
      });
    }
  }

  public static leave(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.delete(playerId);

    for (const member of room.values()) {
      member.deliver({
        type: "player_leave",
        playerId,
      });
    }

    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  public static broadcast(
    roomId: string,
    senderId: string,
    message: MultiplayerMessage,
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    for (const member of room.values()) {
      if (member.playerId === senderId) {
        continue;
      }
      member.deliver(message);
    }
  }
}

export class LocalLoopbackTransport implements MultiplayerTransport {
  private roomId: string | null = null;
  private playerId: string | null = null;
  private displayName = "Player";
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();

  public async connect(options: TransportConnectOptions): Promise<void> {
    this.emitStatus("connecting");

    this.roomId = options.roomId;
    this.playerId = options.playerId;
    this.displayName = options.displayName;

    LoopbackRoomHub.join(options.roomId, {
      playerId: options.playerId,
      displayName: options.displayName,
      deliver: (message) => this.emitMessage(message),
    });

    this.emitStatus("connected");
  }

  public disconnect(): void {
    if (this.roomId && this.playerId) {
      LoopbackRoomHub.leave(this.roomId, this.playerId);
    }

    this.roomId = null;
    this.playerId = null;
    this.emitStatus("disconnected");
  }

  public send(message: MultiplayerMessage): void {
    if (!this.roomId || !this.playerId) {
      return;
    }

    if (message.type !== "player_state") {
      return;
    }

    LoopbackRoomHub.broadcast(this.roomId, this.playerId, {
      ...message,
      playerId: this.playerId,
    });
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private emitMessage(message: MultiplayerMessage): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  private emitStatus(status: TransportStatus): void {
    for (const handler of this.statusHandlers) {
      handler(status);
    }
  }
}
