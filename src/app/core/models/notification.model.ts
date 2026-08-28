export type NotificationSystem = 'CONTROL' | 'IMPAGOS';
export type NotificationLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type NotificationActionType = 'NAVIGATE' | 'NAVIGATE_NEW_TAB' | 'API_CALL' | 'DISMISS';

export interface NotificationAction {
  label: string;
  actionType: NotificationActionType;
  payload: string;
}

export interface AppNotification {
  id: string;
  system: NotificationSystem;
  title: string;
  message: string | null;
  level: NotificationLevel;
  actions: NotificationAction[] | null;
  processError: boolean;
  parentId: string | null;
  createdAt: string;
  read: boolean;
}
