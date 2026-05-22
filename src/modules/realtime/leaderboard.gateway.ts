import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LeaderboardEntryDto } from '../leaderboard/dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/leaderboard',
})
export class LeaderboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LeaderboardGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcast a leaderboard update to all connected clients.
   * Called by LeaderboardService after a score change.
   */
  broadcastLeaderboardUpdate(topUsers: LeaderboardEntryDto[]): void {
    this.server.emit('leaderboard.updated', {
      timestamp: new Date().toISOString(),
      data: topUsers,
    });
    this.logger.debug(
      `Broadcasted leaderboard update to all clients (${topUsers.length} entries)`,
    );
  }

  /**
   * Broadcast a single user's score update.
   */
  broadcastScoreUpdate(entry: LeaderboardEntryDto): void {
    this.server.emit('score.updated', {
      timestamp: new Date().toISOString(),
      data: entry,
    });
  }
}
