import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { NotificationsService } from './notifications.service';
import { ILoggerService } from '../../services/logger.service';

export class NotificationsController {
  private notificationsService: NotificationsService;
  private logger: ILoggerService;

  constructor() {
    this.notificationsService = DIContainer.resolve<NotificationsService>('NotificationsService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  // Templates
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const template = await this.notificationsService.createTemplate(req.body);
      res.status(201).json(ResponseUtil.success(template, 'Template created'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await this.notificationsService.getTemplates(req.query.type as any);
      res.json(ResponseUtil.success(templates, 'Templates fetched'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const template = await this.notificationsService.updateTemplate(
        parseInt(req.params.id),
        req.body,
      );
      res.json(ResponseUtil.success(template, 'Template updated'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      await this.notificationsService.deleteTemplate(parseInt(req.params.id));
      res.json(ResponseUtil.success(null, 'Template deleted'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  // Send Notifications
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.notificationsService.sendNotification(req.body);
      res.status(201).json(ResponseUtil.success(result, 'Notification sent'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async sendBulkNotification(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.notificationsService.sendBulkNotification(req.body);
      res.status(201).json(ResponseUtil.success(result, 'Bulk notification sent'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async sendToAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.notificationsService.sendToAllUsers(req.body);
      res.status(201).json(ResponseUtil.success(result, 'Broadcast sent'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  // Fetch Notifications
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const result = await this.notificationsService.getUserNotifications(userId, req.query);
      res.json(ResponseUtil.success(result, 'Notifications fetched'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const result = await this.notificationsService.getUnreadCount(userId);
      res.json(ResponseUtil.success(result, 'Unread count fetched'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const stats = await this.notificationsService.getNotificationStats(userId);
      res.json(ResponseUtil.success(stats, 'Stats fetched'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  // Update Notifications
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.body.user_id);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const result = await this.notificationsService.markAsRead(userId, parseInt(req.params.id));
      res.json(ResponseUtil.success(result, 'Marked as read'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.body.user_id);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const result = await this.notificationsService.markAllAsRead(userId);
      res.json(ResponseUtil.success(result, 'All marked as read'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.body.user_id);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const result = await this.notificationsService.deleteNotification(
        userId,
        parseInt(req.params.id),
      );
      res.json(ResponseUtil.success(result, 'Notification deleted'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async clearReadNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.body.user_id);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const result = await this.notificationsService.clearReadNotifications(userId);
      res.json(ResponseUtil.success(result, 'Read notifications cleared'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  // Preferences
  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const preferences = await this.notificationsService.getPreferences(userId);
      res.json(ResponseUtil.success(preferences, 'Preferences fetched'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.body.user_id);
      if (!userId) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const { user_id, ...data } = req.body;
      const preferences = await this.notificationsService.updatePreferences(userId, data);
      res.json(ResponseUtil.success(preferences, 'Preferences updated'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  async toggleNotificationType(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, type, enabled } = req.body;
      if (!user_id) {
        res.status(400).json(ResponseUtil.error('user_id is required'));
        return;
      }
      const preferences = await this.notificationsService.toggleNotificationType(
        user_id,
        type,
        enabled,
      );
      res.json(ResponseUtil.success(preferences, 'Type toggled'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }

  // Batch Operations
  async getBatchStatus(req: Request, res: Response): Promise<void> {
    try {
      const batch = await this.notificationsService.getBatchStatus(parseInt(req.params.id));
      res.json(ResponseUtil.success(batch, 'Batch status fetched'));
    } catch (error: any) {
      res.status(500).json(ResponseUtil.error(error.message));
    }
  }
}
