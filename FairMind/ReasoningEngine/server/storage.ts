import { db } from './db';
import { eq, and, desc, gte } from 'drizzle-orm';
import {
  users,
  rooms,
  messages,
  resolutions,
  votes,
  type User,
  type InsertUser,
  type Room,
  type InsertRoom,
  type Message,
  type InsertMessage,
  type Resolution,
  type InsertResolution,
  type Vote,
  type InsertVote,
} from '@shared/schema';
import { randomUUID } from 'crypto';

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUserResolutionCount(userId: string, count: number, resetDate: Date): Promise<void>;
  deleteUser(userId: string): Promise<void>;

  // Rooms
  createRoom(room: InsertRoom): Promise<Room>;
  getRoomById(id: string): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  updateRoomParticipant(roomId: string, participantId: string): Promise<void>;
  updateRoomStatus(roomId: string, status: string, resolvedAt?: Date): Promise<void>;
  getUserRooms(userId: string): Promise<Room[]>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getRoomMessages(roomId: string): Promise<Message[]>;

  // Resolutions
  createResolutions(resolutionList: InsertResolution[]): Promise<Resolution[]>;
  getRoomResolutions(roomId: string): Promise<Resolution[]>;
  getResolutionById(id: string): Promise<Resolution | undefined>;

  // Votes
  createVote(vote: InsertVote): Promise<Vote>;
  getRoomVotes(roomId: string): Promise<Vote[]>;
  getUserVote(roomId: string, userId: string): Promise<Vote | undefined>;

  // Stats
  getUserStats(userId: string): Promise<{
    totalArguments: number;
    resolvedCount: number;
    resolutionsToday: number;
  }>;
}

export class DbStorage implements IStorage {
  // Users
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async updateUserResolutionCount(userId: string, count: number, resetDate: Date): Promise<void> {
    await db
      .update(users)
      .set({ resolutionsUsedToday: count, lastResolutionReset: resetDate })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  // Rooms
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(insertRoom).returning();
    return room;
  }

  async getRoomById(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async updateRoomParticipant(roomId: string, participantId: string): Promise<void> {
    const room = await this.getRoomById(roomId);
    if (!room) throw new Error('Room not found');

    if (!room.participant1Id) {
      await db.update(rooms).set({ participant1Id: participantId }).where(eq(rooms.id, roomId));
    } else if (!room.participant2Id && room.participant1Id !== participantId) {
      await db.update(rooms).set({ participant2Id: participantId }).where(eq(rooms.id, roomId));
    }
  }

  async updateRoomStatus(roomId: string, status: string, resolvedAt?: Date): Promise<void> {
    await db
      .update(rooms)
      .set({ status, resolvedAt })
      .where(eq(rooms.id, roomId));
  }

  async getUserRooms(userId: string): Promise<Room[]> {
    const userRooms = await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.createdBy, userId)
        )
      )
      .orderBy(desc(rooms.createdAt));
    return userRooms;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getRoomMessages(roomId: string): Promise<Message[]> {
    const roomMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(messages.timestamp);
    return roomMessages;
  }

  // Resolutions
  async createResolutions(resolutionList: InsertResolution[]): Promise<Resolution[]> {
    const created = await db.insert(resolutions).values(resolutionList).returning();
    return created;
  }

  async getRoomResolutions(roomId: string): Promise<Resolution[]> {
    const roomResolutions = await db
      .select()
      .from(resolutions)
      .where(eq(resolutions.roomId, roomId))
      .orderBy(desc(resolutions.aiScore));
    return roomResolutions;
  }

  async getResolutionById(id: string): Promise<Resolution | undefined> {
    const [resolution] = await db.select().from(resolutions).where(eq(resolutions.id, id));
    return resolution;
  }

  // Votes
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(insertVote).returning();
    return vote;
  }

  async getRoomVotes(roomId: string): Promise<Vote[]> {
    const roomVotes = await db.select().from(votes).where(eq(votes.roomId, roomId));
    return roomVotes;
  }

  async getUserVote(roomId: string, userId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.roomId, roomId), eq(votes.userId, userId)));
    return vote;
  }

  // Stats
  async getUserStats(userId: string): Promise<{
    totalArguments: number;
    resolvedCount: number;
    resolutionsToday: number;
  }> {
    const userRooms = await this.getUserRooms(userId);
    const resolvedRooms = userRooms.filter((r) => r.status === 'resolved');

    const user = await this.getUserById(userId);
    if (!user) {
      return { totalArguments: 0, resolvedCount: 0, resolutionsToday: 0 };
    }

    return {
      totalArguments: userRooms.length,
      resolvedCount: resolvedRooms.length,
      resolutionsToday: user.resolutionsUsedToday,
    };
  }
}

export const storage = new DbStorage();
