import { createClient } from '@supabase/supabase-js';
import { NotificationManager, NotificationPriority } from './notifications';

// Task types
export enum TaskType {
  FEATURE = 'feature',
  BUG = 'bug',
  DOCUMENTATION = 'documentation',
  TESTING = 'testing',
  DESIGN = 'design',
  RESEARCH = 'research',
  MAINTENANCE = 'maintenance'
}

// Task status
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked'
}

// Task priority
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Task interface
export interface Task {
  id?: string;
  team_id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  created_by: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  dependencies?: string[];
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

// Task manager class
export class TaskManager {
  private supabase: ReturnType<typeof createClient>;
  private notificationManager: NotificationManager;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
    this.notificationManager = new NotificationManager(supabase);
  }

  // Create a new task
  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;

      // Auto-assign task if no assignee specified
      if (!task.assigned_to) {
        await this.autoAssignTask(data.id);
      } else {
        // Notify assigned user
        await this.notificationManager.createTaskAssignment(
          data.id,
          task.assigned_to,
          task.title
        );
      }

      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Auto-assign task based on team member workload and skills
  async autoAssignTask(taskId: string): Promise<void> {
    try {
      const { data: task } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!task) throw new Error('Task not found');

      // Get team members
      const { data: members } = await this.supabase
        .from('members')
        .select(`
          id,
          name,
          role,
          skills,
          experience_level,
          tasks!tasks_assigned_to_fkey (
            id,
            status,
            priority
          )
        `)
        .eq('team_id', task.team_id)
        .eq('role', 'builder');

      if (!members || members.length === 0) {
        throw new Error('No team members available for assignment');
      }

      // Calculate workload score for each member
      const memberScores = members.map(member => {
        const tasks = member.tasks || [];
        const activeTaskCount = tasks.filter((t: any) => t.status !== 'completed').length;
        const urgentTaskCount = tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'completed').length;
        
        // Calculate base workload score
        let workloadScore = activeTaskCount * 10 + urgentTaskCount * 20;

        // Adjust score based on skills match
        if (member.skills?.some(skill => task.tags?.includes(skill))) {
          workloadScore -= 15; // Prefer members with relevant skills
        }

        // Adjust score based on experience
        if (member.experience_level === 'senior') workloadScore -= 10;
        if (member.experience_level === 'junior') workloadScore += 10;

        return {
          memberId: member.id,
          name: member.name,
          workloadScore
        };
      });

      // Select member with lowest workload score
      const bestMatch = memberScores.reduce((prev, curr) => 
        prev.workloadScore < curr.workloadScore ? prev : curr
      );

      // Assign task to selected member
      const { error } = await this.supabase
        .from('tasks')
        .update({ assigned_to: bestMatch.memberId })
        .eq('id', taskId);

      if (error) throw error;

      // Notify assigned member
      await this.notificationManager.createTaskAssignment(
        taskId,
        bestMatch.memberId,
        task.title
      );

    } catch (error) {
      console.error('Error auto-assigning task:', error);
      throw error;
    }
  }

  // Update task status
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    actualHours?: number
  ): Promise<Task> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (actualHours !== undefined) {
        updates.actual_hours = actualHours;
      }

      const { data: task, error } = await this.supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // If task is completed, check for dependent tasks
      if (status === TaskStatus.COMPLETED) {
        await this.handleTaskCompletion(task);
      }

      // If task is blocked, notify team lead
      if (status === TaskStatus.BLOCKED) {
        await this.handleBlockedTask(task);
      }

      return task;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  // Handle task completion
  private async handleTaskCompletion(task: Task): Promise<void> {
    try {
      // Get dependent tasks
      const { data: dependentTasks } = await this.supabase
        .from('tasks')
        .select('*')
        .contains('dependencies', [task.id]);

      if (dependentTasks && dependentTasks.length > 0) {
        // Update dependent tasks to todo if all their dependencies are completed
        for (const depTask of dependentTasks) {
          const { data: dependencies } = await this.supabase
            .from('tasks')
            .select('status')
            .in('id', depTask.dependencies);

          const allDependenciesCompleted = dependencies?.every(d => d.status === TaskStatus.COMPLETED);

          if (allDependenciesCompleted) {
            await this.supabase
              .from('tasks')
              .update({ status: TaskStatus.TODO })
              .eq('id', depTask.id);

            // Auto-assign if needed
            if (!depTask.assigned_to) {
              await this.autoAssignTask(depTask.id);
            }
          }
        }
      }

      // Check team progress
      await this.checkTeamProgress(task.team_id);

    } catch (error) {
      console.error('Error handling task completion:', error);
    }
  }

  // Handle blocked task
  private async handleBlockedTask(task: Task): Promise<void> {
    try {
      // Get team lead
      const { data: lead } = await this.supabase
        .from('members')
        .select('id')
        .eq('team_id', task.team_id)
        .eq('role', 'lead')
        .single();

      if (lead) {
        await this.notificationManager.createNotification({
          type: 'alert',
          priority: NotificationPriority.HIGH,
          title: 'Task Blocked',
          content: `Task "${task.title}" has been marked as blocked. Immediate attention required.`,
          recipient_id: lead.id,
          team_id: task.team_id,
          metadata: {
            task_id: task.id,
            task_title: task.title,
            assigned_to: task.assigned_to
          }
        });
      }
    } catch (error) {
      console.error('Error handling blocked task:', error);
    }
  }

  // Check team progress
  private async checkTeamProgress(teamId: string): Promise<void> {
    try {
      // Get all team tasks
      const { data: tasks } = await this.supabase
        .from('tasks')
        .select('status, priority')
        .eq('team_id', teamId);

      if (!tasks) return;

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const progress = (completedTasks / totalTasks) * 100;

      // Check for milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      const currentMilestone = milestones.find(m => progress >= m && progress < m + 25);

      if (currentMilestone) {
        await this.notificationManager.createMilestone(
          teamId,
          `${currentMilestone}% of tasks completed`,
          progress
        );
      }

      // Update team status
      await this.supabase
        .from('team_status')
        .upsert({
          team_id: teamId,
          current_status: `Progress: ${progress.toFixed(1)}% (${completedTasks}/${totalTasks} tasks)`,
          last_update: new Date().toISOString(),
          metadata: {
            task_progress: progress,
            completed_tasks: completedTasks,
            total_tasks: totalTasks
          }
        });

    } catch (error) {
      console.error('Error checking team progress:', error);
    }
  }

  // Get task suggestions for a team
  async getTaskSuggestions(teamId: string): Promise<string[]> {
    try {
      // Get team context
      const { data: team } = await this.supabase
        .from('teams')
        .select(`
          stage,
          updates (content),
          tasks (type, status)
        `)
        .eq('id', teamId)
        .single();

      if (!team) return [];

      // Analyze team stage and current tasks
      const stage = team.stage;
      const completedTaskTypes = team.tasks
        .filter((t: any) => t.status === TaskStatus.COMPLETED)
        .map((t: any) => t.type);

      // Generate suggestions based on stage
      const suggestions: string[] = [];

      switch (stage) {
        case 'ideation':
          if (!completedTaskTypes.includes(TaskType.RESEARCH)) {
            suggestions.push('Market research and competitor analysis');
            suggestions.push('User persona development');
          }
          if (!completedTaskTypes.includes(TaskType.DESIGN)) {
            suggestions.push('Initial wireframe design');
            suggestions.push('User journey mapping');
          }
          break;

        case 'development':
          if (!completedTaskTypes.includes(TaskType.FEATURE)) {
            suggestions.push('Core feature implementation');
            suggestions.push('Database schema design');
          }
          if (!completedTaskTypes.includes(TaskType.TESTING)) {
            suggestions.push('Unit test setup');
            suggestions.push('Integration test framework');
          }
          break;

        case 'testing':
          suggestions.push('User acceptance testing');
          suggestions.push('Performance optimization');
          suggestions.push('Bug fixing and refinement');
          suggestions.push('Documentation updates');
          break;

        case 'launch':
          suggestions.push('Deployment pipeline setup');
          suggestions.push('Marketing material preparation');
          suggestions.push('Launch checklist completion');
          suggestions.push('Monitoring setup');
          break;

        case 'growth':
          suggestions.push('Analytics implementation');
          suggestions.push('User feedback collection');
          suggestions.push('Feature enhancement planning');
          suggestions.push('Performance monitoring');
          break;
      }

      return suggestions;

    } catch (error) {
      console.error('Error getting task suggestions:', error);
      return [];
    }
  }
}
