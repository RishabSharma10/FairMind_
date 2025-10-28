import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { storage } from './storage';
import { generateToken, verifyToken, authMiddleware, checkResolutionLimit, incrementResolutionCount } from './middleware/auth';
import { generateResolutions } from './services/aiClient';
import { registerSchema, loginSchema, insertMessageSchema } from '@shared/schema';
import type { User, WSMessage } from '@shared/schema';

const upload = multer({ storage: multer.memoryStorage() });

// WebSocket connection map: roomId -> Set of WebSocket connections
const roomConnections = new Map<string, Map<string, { ws: WebSocket; userName: string }>>();

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  const httpServer = createServer(app);

  // WebSocket Server with authentication
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: async (info, callback) => {
      try {
        // Extract token from cookie
        const cookies = info.req.headers.cookie;
        if (!cookies) {
          callback(false, 401, 'Unauthorized');
          return;
        }

        const tokenMatch = cookies.match(/token=([^;]+)/);
        if (!tokenMatch) {
          callback(false, 401, 'Unauthorized');
          return;
        }

        const token = tokenMatch[1];
        const payload = verifyToken(token);
        
        if (!payload) {
          callback(false, 401, 'Invalid token');
          return;
        }

        // Store user ID for later use
        (info.req as any).userId = payload.id;
        callback(true);
      } catch (error) {
        callback(false, 500, 'Internal server error');
      }
    }
  });

  wss.on('connection', (ws: WebSocket, req: any) => {
    let currentRoomId: string | null = null;
    const authenticatedUserId = req.userId;

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'join_room': {
            const requestedRoomId = message.roomId;
            const requestedUserId = message.userId;

            // Verify the user is authenticated and matches the token
            if (requestedUserId !== authenticatedUserId) {
              ws.send(JSON.stringify({ type: 'error', message: 'User ID mismatch' }));
              ws.close();
              return;
            }

            // Verify user has access to this room
            const room = await storage.getRoomById(requestedRoomId);
            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
              ws.close();
              return;
            }

            // Check if user is creator or participant
            const isParticipant = 
              room.createdBy === authenticatedUserId ||
              room.participant1Id === authenticatedUserId ||
              room.participant2Id === authenticatedUserId;

            if (!isParticipant) {
              ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
              ws.close();
              return;
            }

            currentRoomId = requestedRoomId;

            if (!roomConnections.has(currentRoomId)) {
              roomConnections.set(currentRoomId, new Map());
            }

            const roomClients = roomConnections.get(currentRoomId)!;
            roomClients.set(authenticatedUserId, { ws, userName: message.userName });

            // Notify others in the room
            roomClients.forEach((client, userId) => {
              if (userId !== authenticatedUserId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(
                  JSON.stringify({
                    type: 'user_joined',
                    userId: authenticatedUserId,
                    userName: message.userName,
                  })
                );
              }
            });
            break;
          }

          case 'leave_room': {
            if (currentRoomId && authenticatedUserId) {
              const roomClients = roomConnections.get(currentRoomId);
              if (roomClients) {
                roomClients.delete(authenticatedUserId);

                // Notify others
                roomClients.forEach((client) => {
                  if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(
                      JSON.stringify({
                        type: 'user_left',
                        userId: authenticatedUserId,
                      })
                    );
                  }
                });

                if (roomClients.size === 0) {
                  roomConnections.delete(currentRoomId);
                }
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && authenticatedUserId) {
        const roomClients = roomConnections.get(currentRoomId);
        if (roomClients) {
          roomClients.delete(authenticatedUserId);

          roomClients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(
                JSON.stringify({
                  type: 'user_left',
                  userId: authenticatedUserId,
                })
              );
            }
          });

          if (roomClients.size === 0) {
            roomConnections.delete(currentRoomId);
          }
        }
      }
    });
  });

  // Broadcast message to room
  function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    const roomClients = roomConnections.get(roomId);
    if (roomClients) {
      roomClients.forEach((client, userId) => {
        if (userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      });
    }
  }

  // Verify room membership middleware
  async function ensureRoomMember(roomId: string, userId: string): Promise<boolean> {
    const room = await storage.getRoomById(roomId);
    if (!room) {
      return false;
    }

    return (
      room.createdBy === userId ||
      room.participant1Id === userId ||
      room.participant2Id === userId
    );
  }

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        name: data.name,
        age: data.age,
        gender: data.gender,
        email: data.email,
        passwordHash,
      });

      const token = generateToken(user);
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(data.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = generateToken(user);
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Login failed' });
    }
  });

  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  });

  // Google OAuth routes (if configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', (_req, res) => {
      const redirectUri = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/api/auth/google/callback`;
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile email`;
      res.redirect(googleAuthUrl);
    });

    app.get('/api/auth/google/callback', async (req, res) => {
      // OAuth callback placeholder - would need full implementation
      res.redirect('/dashboard');
    });
  }

  // Room Routes
  app.post('/api/rooms', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const code = nanoid(6).toUpperCase();

      const room = await storage.createRoom({
        code,
        createdBy: userId,
        participant1Id: userId,
        status: 'active',
      });

      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/rooms/join', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { code } = req.body;

      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      await storage.updateRoomParticipant(room.id, userId);
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/rooms', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const rooms = await storage.getUserRooms(userId);
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/rooms/:id', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const roomId = req.params.id;

      const isMember = await ensureRoomMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const room = await storage.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Message Routes
  app.post('/api/rooms/:id/messages', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const roomId = req.params.id;

      const isMember = await ensureRoomMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const data = insertMessageSchema.parse({ ...req.body, roomId, senderId: userId });

      const message = await storage.createMessage(data);
      const user = await storage.getUserById(userId);

      // Broadcast to room
      broadcastToRoom(roomId, {
        type: 'new_message',
        message: { ...message, senderName: user?.name || 'User' },
      });

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/rooms/:id/messages', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const roomId = req.params.id;

      const isMember = await ensureRoomMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const messages = await storage.getRoomMessages(roomId);
      
      // Add sender names
      const messagesWithNames = await Promise.all(
        messages.map(async (msg) => {
          const sender = await storage.getUserById(msg.senderId);
          return { ...msg, senderName: sender?.name || 'User' };
        })
      );

      res.json(messagesWithNames);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Voice Transcription
  app.post('/api/transcribe', authMiddleware, upload.single('audio'), async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { roomId } = req.body;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ message: 'No audio file provided' });
      }

      const isMember = await ensureRoomMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // For now, create message without transcription
      // In production, integrate with Whisper API or similar
      const message = await storage.createMessage({
        roomId,
        senderId: userId,
        text: '',
        transcript: 'Voice message (transcription unavailable)',
        isVoice: true,
        voiceUrl: '/audio/placeholder.webm',
      });

      const user = await storage.getUserById(userId);

      broadcastToRoom(roomId, {
        type: 'new_message',
        message: { ...message, senderName: user?.name || 'User' },
      });

      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate Resolutions
  app.post('/api/rooms/:id/generate-resolutions', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const roomId = req.params.id;

      const isMember = await ensureRoomMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check rate limit
      const limit = checkResolutionLimit(userId);
      if (!limit.allowed) {
        return res.status(429).json({
          message: 'Daily resolution limit reached. Upgrade to PRO for unlimited resolutions.',
        });
      }

      // Get messages
      const messages = await storage.getRoomMessages(roomId);
      if (messages.length < 4) {
        return res.status(400).json({ message: 'Need at least 4 messages to generate resolutions' });
      }

      const messageTexts = messages.map((m) => m.text || m.transcript || '');

      // Generate resolutions
      const aiResponse = await generateResolutions(messageTexts);

      // Save to database
      const resolutionsToInsert = aiResponse.resolutions.map((r) => ({
        roomId,
        title: r.title,
        description: r.description,
        aiScore: r.ai_score,
        suggestedBest: r.suggested_best === 1,
      }));

      const savedResolutions = await storage.createResolutions(resolutionsToInsert);

      // Increment usage
      incrementResolutionCount(userId);

      // Broadcast to room
      broadcastToRoom(roomId, {
        type: 'resolutions_generated',
        resolutions: savedResolutions,
      });

      res.json(savedResolutions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to generate resolutions' });
    }
  });

  // Voting
  app.post('/api/rooms/:id/vote', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const roomId = req.params.id;
      const { resolutionId } = req.body;

      const isMember = await ensureRoomMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check if already voted
      const existingVote = await storage.getUserVote(roomId, userId);
      if (existingVote) {
        return res.status(400).json({ message: 'Already voted' });
      }

      // Create vote
      const vote = await storage.createVote({
        roomId,
        resolutionId,
        userId,
      });

      // Broadcast vote
      broadcastToRoom(roomId, {
        type: 'vote_cast',
        userId,
        resolutionId,
      });

      // Check if both users voted for the same resolution
      const allVotes = await storage.getRoomVotes(roomId);
      if (allVotes.length === 2) {
        const resolution1 = allVotes[0].resolutionId;
        const resolution2 = allVotes[1].resolutionId;

        if (resolution1 === resolution2) {
          // Both voted for same resolution - mark as resolved
          await storage.updateRoomStatus(roomId, 'resolved', new Date());

          const resolution = await storage.getResolutionById(resolutionId);

          broadcastToRoom(roomId, {
            type: 'room_resolved',
            resolution,
          });
        }
      }

      res.json(vote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stats
  app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Deletion
  app.delete('/api/user/delete', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      await storage.deleteUser(userId);
      res.clearCookie('token');
      res.json({ message: 'Account deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
