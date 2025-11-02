import {
  Prisma,
  NotificationType,
  ReferenceType,
  NotificationPriority,
} from '../../generated/prisma';

export type Notification = Prisma.NotificationGetPayload<{}>;
export type NotificationTemplate = Prisma.NotificationTemplateGetPayload<{}>;
export type NotificationRecipient = Prisma.NotificationRecipientGetPayload<{}>;
export type NotificationStats = Prisma.NotificationStatsGetPayload<{}>;
export type NotificationPreference = Prisma.NotificationPreferenceGetPayload<{}>;

export interface CreateNotificationDTO {
  user_id: number; // REQUIRED - no auth, must provide explicitly
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: NotificationPriority;
  metadata?: any;
}

export interface SendBulkNotificationDTO {
  user_ids: number[];
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: NotificationPriority;
  metadata?: any;
}

export interface UpdatePreferenceDTO {
  enabled?: boolean;
  typePreferences?: Record<string, boolean>;
  maxPerDay?: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface PaginationQuery {
  user_id?: number; // REQUIRED for user-specific queries
  limit?: number;
  offset?: number;
  isRead?: boolean;
  type?: NotificationType;
}
