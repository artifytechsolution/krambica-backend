import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { redisSubscriber } from './redis';

export const userSockets = new Map<number, string>();
let ioInstance: Server | null = null;
let isRedisReady = false; // Track Redis subscription status

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export function initializeWebSocket(httpServer: HttpServer): Promise<Server> {
  return new Promise((resolve, reject) => {
    const io = new Server(httpServer, {
      cors: {
        origin: '*',
        credentials: false,
      },
      path: '/socket.io',
    });

    ioInstance = io;

    console.log('🔌 Initializing WebSocket server...');

    // ========================================
    // SOCKET.IO CONNECTION HANDLING
    // ========================================
    io.on('connection', async (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      socket.on('join', async (userId: number) => {
        socket.data.userId = userId;
        userSockets.set(userId, socket.id);

        console.log(`✅ User ${userId} joined - Socket: ${socket.id}`);
        console.log(`👥 Total connected users: ${userSockets.size}`);
        console.log(`📋 Connected user IDs: [${Array.from(userSockets.keys()).join(', ')}]`);

        try {
          const stats = await prisma.notificationStats.findUnique({
            where: { user_id: userId },
          });

          socket.emit('notification:count', {
            unreadCount: stats?.unreadCount || 0,
          });

          console.log(`📊 Sent initial stats to user ${userId}: ${stats?.unreadCount || 0} unread`);
        } catch (error) {
          console.error('❌ Error fetching stats:', error);
        }
      });

      socket.on('notification:read', async (notificationId: number) => {
        const userId = socket.data.userId;
        if (!userId) return;

        try {
          await prisma.notificationRecipient.updateMany({
            where: {
              notification_id: notificationId,
              user_id: userId,
            },
            data: {
              isRead: true,
              readAt: new Date(),
            },
          });

          const stats = await prisma.notificationStats.findUnique({
            where: { user_id: userId },
          });

          socket.emit('notification:read:success', {
            notificationId,
            unreadCount: stats?.unreadCount || 0,
          });

          console.log(`✅ Notification ${notificationId} marked as read for user ${userId}`);
        } catch (error) {
          console.error('❌ Error marking as read:', error);
          socket.emit('notification:error', {
            message: 'Failed to mark as read',
          });
        }
      });

      socket.on('notification:read-all', async () => {
        const userId = socket.data.userId;
        if (!userId) return;

        try {
          const result = await prisma.notificationRecipient.updateMany({
            where: {
              user_id: userId,
              isRead: false,
            },
            data: {
              isRead: true,
              readAt: new Date(),
            },
          });

          socket.emit('notification:read-all:success', {
            unreadCount: 0,
            markedCount: result.count,
          });

          console.log(`✅ ${result.count} notifications marked as read for user ${userId}`);
        } catch (error) {
          console.error('❌ Error marking all as read:', error);
          socket.emit('notification:error', {
            message: 'Failed to mark all as read',
          });
        }
      });

      socket.on('notification:delete', async (notificationId: number) => {
        const userId = socket.data.userId;
        if (!userId) return;

        try {
          await prisma.notificationRecipient.updateMany({
            where: {
              notification_id: notificationId,
              user_id: userId,
            },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });

          socket.emit('notification:delete:success', { notificationId });

          console.log(`✅ Notification ${notificationId} deleted for user ${userId}`);
        } catch (error) {
          console.error('❌ Error deleting notification:', error);
          socket.emit('notification:error', {
            message: 'Failed to delete notification',
          });
        }
      });

      socket.on('disconnect', () => {
        const userId = socket.data.userId;
        if (userId) {
          console.log(`❌ User ${userId} disconnected`);
          userSockets.delete(userId);
          console.log(`👥 Total connected users: ${userSockets.size}`);
        }
      });
    });

    // ========================================
    // REDIS PUB/SUB SETUP - PROPERLY INITIALIZED
    // ========================================
    console.log('📡 Setting up Redis subscriber...');

    // Handle Redis connection events
    redisSubscriber.on('connect', () => {
      console.log('🔴 Redis Subscriber connecting...');
    });

    redisSubscriber.on('ready', () => {
      console.log('✅ Redis Subscriber is READY');
    });

    redisSubscriber.on('error', (err) => {
      console.error('❌ Redis Subscriber error:', err);
    });

    // Subscribe to notifications channel
    redisSubscriber.subscribe('notifications', (err, count) => {
      if (err) {
        console.error('❌ Failed to subscribe to Redis channel:', err);
        reject(err);
      } else {
        console.log('═══════════════════════════════════════');
        console.log(`✅ REDIS SUBSCRIPTION SUCCESSFUL!`);
        console.log(`✅ Subscribed to ${count} channel(s)`);
        console.log(`✅ Channel: "notifications"`);
        console.log('═══════════════════════════════════════');
        isRedisReady = true;
        resolve(io);
      }
    });

    // Listen to messages from Redis
    redisSubscriber.on('message', async (channel, message) => {
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('📬 NEW MESSAGE FROM REDIS');
      console.log('═══════════════════════════════════════');
      console.log(`📡 Channel: "${channel}"`);
      console.log(`📦 Raw Message: ${message.substring(0, 100)}...`);

      if (channel === 'notifications') {
        try {
          const data = JSON.parse(message);
          const { user_id, notification } = data;

          console.log(`🎯 Target User ID: ${user_id}`);
          console.log(`📋 Notification ID: ${notification.notification_id}`);
          console.log(`📝 Title: ${notification.title}`);
          console.log(
            `👥 Currently Connected Users: [${Array.from(userSockets.keys()).join(', ')}]`,
          );

          const socketId = userSockets.get(user_id);

          if (socketId) {
            console.log(`✅ User ${user_id} is ONLINE!`);
            console.log(`🔌 Socket ID: ${socketId}`);
            console.log(`📤 Sending notification via WebSocket...`);

            // Send notification
            io.to(socketId).emit('notification:new', notification);

            // Send updated count
            const stats = await prisma.notificationStats.findUnique({
              where: { user_id },
            });

            io.to(socketId).emit('notification:count', {
              unreadCount: stats?.unreadCount || 0,
            });

            console.log(`✅ Notification delivered successfully!`);
            console.log(`📊 Updated unread count: ${stats?.unreadCount || 0}`);
          } else {
            console.log(`⚠️ User ${user_id} is OFFLINE`);
            console.log(`💾 Notification saved in database for later retrieval`);
          }

          console.log('═══════════════════════════════════════');
          console.log('');
        } catch (error) {
          console.error('❌ Error processing Redis message:', error);
          console.error('📦 Message content:', message);
          console.log('═══════════════════════════════════════');
        }
      }
    });

    // Timeout fallback (if Redis doesn't respond in 5 seconds)
    setTimeout(() => {
      if (!isRedisReady) {
        console.warn('⚠️ Redis subscription timeout - continuing anyway');
        resolve(io);
      }
    }, 5000);
  });
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
}

export function isWebSocketReady(): boolean {
  return isRedisReady;
}
