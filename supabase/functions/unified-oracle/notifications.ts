import { createClient } from '@supabase/supabase-js';

// Notification types
export enum NotificationType {
  TEAM_UPDATE = 'team_update',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  MENTION = 'mention',
  BROADCAST = 'broadcast',
  MILESTONE = 'milestone',
  ALERT = 'alert'
}

// Notification priority
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Notification interface
export interface Notification {
  id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  content: string;
  recipient_id: string;
  recipient_role?: string;
  team_id?: string;
  metadata?: any;
  read?: boolean;
  read_at?: string;
  created_at?: string;
}

// Notification manager class
export class NotificationManager {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  // Create a new notification
  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;

      // Trigger real-time notification
      await this.broadcastNotification(data);

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Broadcast notification through Supabase realtime
  private async broadcastNotification(notification: Notification): Promise<void> {
    try {
      await this.supabase
        .from('notification_broadcasts')
        .insert({
          notification_id: notification.id,
          recipient_id: notification.recipient_id,
          type: notification.type,
          payload: {
            title: notification.title,
            content: notification.content,
            priority: notification.priority,
            metadata: notification.metadata
          }
        });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Get unread notifications for a user
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  }

  // Create team update notification
  async createTeamUpdate(
    teamId: string,
    content: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<void> {
    try {
      // Get team members
      const { data: members } = await this.supabase
        .from('members')
        .select('id, role')
        .eq('team_id', teamId);

      if (!members) return;

      // Create notifications for each member
      const notifications = members.map(member => ({
        type: NotificationType.TEAM_UPDATE,
        priority,
        title: 'Team Update',
        content,
        recipient_id: member.id,
        recipient_role: member.role,
        team_id: teamId,
        metadata: {
          update_type: 'team',
          team_id: teamId
        }
      }));

      await this.supabase
        .from('notifications')
        .insert(notifications);
    } catch (error) {
      console.error('Error creating team update notifications:', error);
      throw error;
    }
  }

  // Create task assignment notification
  async createTaskAssignment(
    taskId: string,
    assigneeId: string,
    taskTitle: string
  ): Promise<void> {
    try {
      await this.createNotification({
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.HIGH,
        title: 'New Task Assigned',
        content: `You have been assigned a new task: ${taskTitle}`,
        recipient_id: assigneeId,
        metadata: {
          task_id: taskId,
          task_title: taskTitle
        }
      });
    } catch (error) {
      console.error('Error creating task assignment notification:', error);
      throw error;
    }
  }

  // Create mention notification
  async createMention(
    mentionedUserId: string,
    mentionerName: string,
    content: string,
    teamId?: string
  ): Promise<void> {
    try {
      await this.createNotification({
        type: NotificationType.MENTION,
        priority: NotificationPriority.HIGH,
        title: 'You were mentioned',
        content: `${mentionerName} mentioned you: ${content}`,
        recipient_id: mentionedUserId,
        team_id: teamId,
        metadata: {
          mentioner_name: mentionerName,
          original_content: content
        }
      });
    } catch (error) {
      console.error('Error creating mention notification:', error);
      throw error;
    }
  }

  // Create broadcast notification
  async createBroadcast(
    content: string,
    targetRole?: string,
    teamId?: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<void> {
    try {
      // Build query for recipients
      let query = this.supabase
        .from('members')
        .select('id, role');

      if (targetRole) {
        query = query.eq('role', targetRole);
      }
      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data: recipients } = await query;

      if (!recipients) return;

      // Create notifications for each recipient
      const notifications = recipients.map(recipient => ({
        type: NotificationType.BROADCAST,
        priority,
        title: 'Broadcast Message',
        content,
        recipient_id: recipient.id,
        recipient_role: recipient.role,
        team_id: teamId,
        metadata: {
          broadcast_type: teamId ? 'team' : targetRole ? 'role' : 'all'
        }
      }));

      await this.supabase
        .from('notifications')
        .insert(notifications);
    } catch (error) {
      console.error('Error creating broadcast notifications:', error);
      throw error;
    }
  }

  // Create milestone notification
  async createMilestone(
    teamId: string,
    milestone: string,
    progress: number
  ): Promise<void> {
    try {
      // Get team members and mentors
      const { data: members } = await this.supabase
        .from('members')
        .select('id, role')
        .or(`team_id.eq.${teamId},role.eq.mentor`);

      if (!members) return;

      // Create notifications for each recipient
      const notifications = members.map(member => ({
        type: NotificationType.MILESTONE,
        priority: NotificationPriority.HIGH,
        title: 'Team Milestone',
        content: `Team milestone achieved: ${milestone} (${progress}% complete)`,
        recipient_id: member.id,
        recipient_role: member.role,
        team_id: teamId,
        metadata: {
          milestone,
          progress
        }
      }));

      await this.supabase
        .from('notifications')
        .insert(notifications);
    } catch (error) {
      console.error('Error creating milestone notifications:', error);
      throw error;
    }
  }

  // Create alert notification
  async createAlert(
    message: string,
    targetRole: string,
    priority: NotificationPriority = NotificationPriority.URGENT
  ): Promise<void> {
    try {
      const { data: recipients } = await this.supabase
        .from('members')
        .select('id')
        .eq('role', targetRole);

      if (!recipients) return;

      const notifications = recipients.map(recipient => ({
        type: NotificationType.ALERT,
        priority,
        title: 'Alert',
        content: message,
        recipient_id: recipient.id,
        recipient_role: targetRole,
        metadata: {
          alert_type: 'system'
        }
      }));

      await this.supabase
        .from('notifications')
        .insert(notifications);
    } catch (error) {
      console.error('Error creating alert notifications:', error);
      throw error;
    }
  }
}
