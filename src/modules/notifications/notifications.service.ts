import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import {
  CreateNotificationDTO,
  SendBulkNotificationDTO,
  UpdatePreferenceDTO,
  PaginationQuery,
} from './notifications.types';
import { redisPublisher } from '../../config/redis';
import { NotificationType, NotificationPriority, ReferenceType } from '../../generated/prisma';
import { NOTIFICATION_CONSTANTS } from '../../config/constants';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { IConfigService } from '../../services/config.service';
import { InvalidInputError } from '../../utils/error.utils';

@injectable()
export class NotificationsService implements IService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService', 'EmailService'];
  static optionalDependencies: string[] = [];

  private db: IDatabaseService;
  private logger: ILoggerService;
  private config: IConfigService;

  constructor(logger: ILoggerService, db: IDatabaseService, config: IConfigService) {
    this.logger = logger;
    this.logger.info('AuthService instantiated');
    this.db = db;
    this.config = config;
  }

  async initialize() {
    this.logger.info('NotificationsService initialized');
  }

  // Template Management
  async createTemplate(data: any) {
    const template = await this.db.client.notificationTemplate.create({
      data: {
        type: data.type as NotificationType,
        title: data.title,
        message: data.message,
        icon: data.icon,
        priority: (data.priority as NotificationPriority) || 'MEDIUM',
        expiryDays: data.expiryDays || 90,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
    return template;
  }
  //here i have avided error
  async getTemplates(type?: NotificationType) {
    return await this.db.client.notificationTemplate.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTemplate(templateId: number, data: any) {
    console.log('template id is herer------>>');
    console.log(templateId);
    const exist = await this.db.client.notificationTemplate.findUnique({
      where: { template_id: templateId },
    });
    console.log(exist);
    if (!exist) {
      throw new InvalidInputError('template is not exist');
    }
    return await this.db.client.notificationTemplate.update({
      where: { template_id: templateId },
      data,
    });
  }

  async deleteTemplate(templateId: number) {
    const exist = await this.db.client.notificationTemplate.findUnique({
      where: { template_id: templateId },
    });
    console.log(exist);
    if (!exist) {
      throw new InvalidInputError('template is not exist');
    }
    await this.db.client.notificationTemplate.delete({
      where: { template_id: templateId },
    });
    return true;
  }

  // Send Notifications
  async sendNotification(data: any) {
    const { user_id, ...notificationData } = data;
    console.log('send notification data is comminggggg------>');
    console.log(data);

    // Check preferences
    const canSend = await this.checkUserPreference(user_id, data.type);
    if (!canSend) {
      return { success: false, message: 'User has disabled this notification type' };
    }

    const notification = await this.db.client.notification.create({
      data: {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        icon: notificationData.icon,
        priority: (notificationData.priority as NotificationPriority) || 'MEDIUM',
        referenceType: notificationData.referenceType as ReferenceType,
        referenceId: notificationData.referenceId,
        actionUrl: notificationData.actionUrl,
        actionLabel: notificationData.actionLabel,
        metadata: notificationData.metadata,
        // expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    const recipient = await this.db.client.notificationRecipient.create({
      data: {
        notification_id: notification.notification_id,
        user_id: user_id,
        //expiresAt: notification.expiresAt,
      },
    });

    await this.publishToRedis(user_id, {
      ...notification,
      isRead: recipient.isRead,
      readAt: recipient.readAt,
      createdAt: recipient.createdAt,
    });

    return { success: true, notification };
  }

  async sendBulkNotification(data: SendBulkNotificationDTO) {
    const { user_ids, ...notificationData } = data;

    const notification = await this.db.client.notification.create({
      data: {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        icon: notificationData.icon,
        priority: (notificationData.priority as NotificationPriority) || 'MEDIUM',
        actionUrl: notificationData.actionUrl,
        actionLabel: notificationData.actionLabel,
        metadata: notificationData.metadata,
        //expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    const batch = await this.db.client.notificationBatch.create({
      data: {
        notification_id: notification.notification_id,
        targetType: 'SPECIFIC_USERS',
        totalUsers: user_ids.length,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    const eligibleUsers = await this.filterUsersByPreference(user_ids, notificationData.type);

    const chunkSize = 1000;
    for (let i = 0; i < eligibleUsers.length; i += chunkSize) {
      const chunk = eligibleUsers.slice(i, i + chunkSize);

      await this.db.client.notificationRecipient.createMany({
        data: chunk.map((user_id) => ({
          notification_id: notification.notification_id,
          user_id: user_id,
          //expiresAt: notification.expiresAt,
        })),
        skipDuplicates: true,
      });

      await this.db.client.notificationBatch.update({
        where: { batch_id: batch.batch_id },
        data: {
          processedUsers: Math.min(i + chunkSize, eligibleUsers.length),
          successCount: Math.min(i + chunkSize, eligibleUsers.length),
        },
      });

      for (const user_id of chunk) {
        await this.publishToRedis(user_id, notification);
      }
    }

    await this.db.client.notificationBatch.update({
      where: { batch_id: batch.batch_id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return { success: true, batch_id: batch.batch_id };
  }

  async sendToAllUsers(data: Omit<SendBulkNotificationDTO, 'user_ids'>) {
    const users = await this.db.client.user.findMany({
      where: { is_verified: true },
      select: { user_id: true },
    });

    return await this.sendBulkNotification({
      user_ids: users.map((u: any) => u.user_id),
      ...data,
    } as SendBulkNotificationDTO);
  }

  // Fetch Notifications
  async getUserNotifications(userId: number, query: PaginationQuery) {
    const { limit = 20, offset = 0, isRead, type } = query;

    const where: any = {
      user_id: userId,
      isDeleted: false,
    };

    if (isRead !== undefined) where.isRead = isRead;
    if (type) where.notification = { type };

    const [notifications, total] = await Promise.all([
      this.db.client.notificationRecipient.findMany({
        where,
        include: { notification: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.db.client.notificationRecipient.count({ where }),
    ]);

    const stats = await this.db.client.notificationStats.findUnique({
      where: { user_id: userId },
    });

    return {
      notifications: notifications.map((nr: any) => ({
        ...nr.notification,
        isRead: nr.isRead,
        readAt: nr.readAt,
        createdAt: nr.createdAt,
      })),
      total,
      unreadCount: stats?.unreadCount || 0,
      hasMore: offset + notifications.length < total,
    };
  }

  async getUnreadCount(userId: number) {
    const stats = await this.db.client.notificationStats.findUnique({
      where: { user_id: userId },
    });
    return { unreadCount: stats?.unreadCount || 0 };
  }

  async getNotificationStats(userId: number) {
    let stats = await this.db.client.notificationStats.findUnique({
      where: { user_id: userId },
    });

    if (!stats) {
      stats = await this.db.client.notificationStats.create({
        data: { user_id: userId, unreadCount: 0, totalCount: 0 },
      });
    }

    return stats;
  }

  // Update Notifications
  async markAsRead(userId: number, notificationId: number) {
    await this.db.client.notificationRecipient.updateMany({
      where: { notification_id: notificationId, user_id: userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllAsRead(userId: number) {
    const result = await this.db.client.notificationRecipient.updateMany({
      where: { user_id: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, updatedCount: result.count };
  }

  async deleteNotification(userId: number, notificationId: number) {
    await this.db.client.notificationRecipient.updateMany({
      where: { notification_id: notificationId, user_id: userId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }

  async clearReadNotifications(userId: number) {
    const result = await this.db.client.notificationRecipient.updateMany({
      where: { user_id: userId, isRead: true, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true, deletedCount: result.count };
  }

  // Preferences
  async getPreferences(userId: number) {
    let preferences = await this.db.client.notificationPreference.findUnique({
      where: { user_id: userId },
    });

    if (!preferences) {
      preferences = await this.db.client.notificationPreference.create({
        data: { user_id: userId, enabled: true, typePreferences: {} },
      });
    }

    return preferences;
  }

  async updatePreferences(userId: number, data: UpdatePreferenceDTO) {
    return await this.db.client.notificationPreference.upsert({
      where: { user_id: userId },
      update: data,
      create: { user_id: userId, ...data },
    });
  }

  async toggleNotificationType(userId: number, type: NotificationType, enabled: boolean) {
    const preferences = await this.getPreferences(userId);
    const typePreferences = (preferences.typePreferences as any) || {};
    typePreferences[type] = enabled;

    return await this.db.client.notificationPreference.update({
      where: { user_id: userId },
      data: { typePreferences },
    });
  }

  // Batch Operations
  async getBatchStatus(batchId: number) {
    const batch = await this.db.client.notificationBatch.findUnique({
      where: { batch_id: batchId },
      include: { notification: true },
    });

    if (!batch) throw new Error('Batch not found');

    return {
      ...batch,
      progress: ((batch.processedUsers / batch.totalUsers) * 100).toFixed(2),
    };
  }

  // Helper Methods
  private async checkUserPreference(userId: number, type: NotificationType): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);
      if (!preferences.enabled) return false;

      const typePrefs = (preferences.typePreferences as any) || {};
      if (typePrefs[type] === false) return false;

      return true;
    } catch (error) {
      return true;
    }
  }

  private async filterUsersByPreference(
    userIds: number[],
    type: NotificationType,
  ): Promise<number[]> {
    try {
      const preferences = await this.db.client.notificationPreference.findMany({
        where: { user_id: { in: userIds } },
      });

      return userIds.filter((userId) => {
        const pref = preferences.find((p: any) => p.user_id === userId);
        if (!pref) return true;
        if (!pref.enabled) return false;

        const typePrefs = (pref.typePreferences as any) || {};
        if (typePrefs[type] === false) return false;

        return true;
      });
    } catch (error) {
      return userIds;
    }
  }

  private async publishToRedis(userId: number, notification: any) {
    try {
      console.log('publish notification=======>');
      console.log(userId);
      console.log(notification);
      const abc = await redisPublisher.publish(
        'notifications',
        JSON.stringify({ user_id: userId, notification }),
      );
      console.log(`✅ Successfully published to Redis`, abc);
    } catch (error) {
      this.logger.error(`Redis publish error: ${error}`);
    }
  }
}
