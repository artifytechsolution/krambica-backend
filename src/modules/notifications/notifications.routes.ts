import { Router } from 'express';
import { NotificationsController } from './notifications.controller';

export const notificationsRoutes = (controller: NotificationsController): Router => {
  const router = Router();

  // Templates
  router.post('/templates', controller.createTemplate.bind(controller));
  router.get('/templates', controller.getTemplates.bind(controller));
  router.put('/templates/:id', controller.updateTemplate.bind(controller));
  router.delete('/templates/:id', controller.deleteTemplate.bind(controller));

  // Send Notifications
  router.post('/send', controller.sendNotification.bind(controller));
  router.post('/send-bulk', controller.sendBulkNotification.bind(controller));
  router.post('/send-all', controller.sendToAllUsers.bind(controller));

  // Fetch Notifications
  router.get('/user', controller.getUserNotifications.bind(controller));
  router.get('/user/unread-count', controller.getUnreadCount.bind(controller));
  router.get('/user/stats', controller.getNotificationStats.bind(controller));

  // Update Notifications
  router.patch('/user/:id/read', controller.markAsRead.bind(controller));
  router.patch('/user/read-all', controller.markAllAsRead.bind(controller));
  router.delete('/user/:id', controller.deleteNotification.bind(controller));
  router.delete('/user/clear-read', controller.clearReadNotifications.bind(controller));

  // Preferences // this api used for notification settings so thay are not neccessory
  router.get('/preferences', controller.getPreferences.bind(controller));
  router.put('/preferences', controller.updatePreferences.bind(controller));
  router.patch('/preferences/toggle', controller.toggleNotificationType.bind(controller));

  // Batch Operations
  router.get('/batches/:id', controller.getBatchStatus.bind(controller));

  return router;
};
