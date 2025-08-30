import { supabase } from "@/integrations/supabase/client";
import type { InitialTask } from "@/types/onboarding";
import type { UserSkill, ExperienceLevel } from "@/types/onboarding";

// Generate initial tasks based on role and skills
export const generateInitialTasks = async (
  role: string,
  skills: UserSkill[],
  experienceLevel: ExperienceLevel,
  teamId: string
): Promise<InitialTask[]> => {
  const tasks: InitialTask[] = [];

  // Common setup tasks
  tasks.push({
    title: "Complete Environment Setup",
    description: "Set up your local development environment with all necessary tools and dependencies.",
    type: "setup",
    priority: "high",
    estimatedHours: 2,
    resources: [
      "Project README.md",
      "Development Environment Guide",
      "Team Best Practices"
    ]
  });

  tasks.push({
    title: "Review Project Documentation",
    description: "Familiarize yourself with the project architecture, coding standards, and workflows.",
    type: "learning",
    priority: "high",
    estimatedHours: 3,
    resources: [
      "Architecture Overview",
      "Coding Standards",
      "Git Workflow Guide"
    ]
  });

  // Role-specific tasks
  if (role === 'builder') {
    if (skills.includes('frontend')) {
      tasks.push({
        title: "Frontend Component Review",
        description: "Review existing UI components and identify areas for improvement.",
        type: "development",
        priority: "medium",
        estimatedHours: 4,
        dependencies: ["Complete Environment Setup"]
      });
    }

    if (skills.includes('backend')) {
      tasks.push({
        title: "API Documentation Review",
        description: "Review API documentation and test endpoints.",
        type: "development",
        priority: "medium",
        estimatedHours: 4,
        dependencies: ["Complete Environment Setup"]
      });
    }

    // Add more skill-specific tasks
    if (experienceLevel === 'beginner') {
      tasks.push({
        title: "Complete Training Modules",
        description: "Work through the beginner training modules for your skill area.",
        type: "learning",
        priority: "high",
        estimatedHours: 8,
        dependencies: ["Review Project Documentation"]
      });
    }
  }

  // Save tasks to database
  const { error } = await supabase.from('tasks').insert(
    tasks.map(task => ({
      ...task,
      team_id: teamId,
      status: 'todo',
      created_at: new Date().toISOString()
    }))
  );

  if (error) throw error;
  return tasks;
};

// Get task suggestions based on progress
export const getTaskSuggestions = async (
  userId: string,
  teamId: string,
  role: string
): Promise<string[]> => {
  // Get completed tasks
  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', teamId)
    .eq('assigned_to', userId)
    .eq('status', 'completed');

  // Get in-progress tasks
  const { data: inProgressTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', teamId)
    .eq('assigned_to', userId)
    .eq('status', 'in_progress');

  const suggestions: string[] = [];

  // If no tasks completed yet
  if (!completedTasks?.length) {
    suggestions.push("Start with the environment setup task to get your development environment ready.");
    suggestions.push("Review the project documentation to understand the architecture and workflows.");
  }

  // If setup complete but no development tasks started
  if (completedTasks?.some(t => t.type === 'setup') && !inProgressTasks?.length) {
    suggestions.push("Pick a development task from your backlog to start contributing.");
    suggestions.push("Consider pairing with a team member on their task to learn the codebase.");
  }

  // If multiple tasks in progress
  if (inProgressTasks && inProgressTasks.length > 2) {
    suggestions.push("You have multiple tasks in progress. Consider focusing on completing one task before starting another.");
  }

  return suggestions;
};

// Track task progress
export const updateTaskProgress = async (
  taskId: string,
  status: 'todo' | 'in_progress' | 'completed',
  progress: number,
  notes?: string
): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      progress,
      notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  if (error) throw error;
};

// Get task metrics
export const getTaskMetrics = async (
  userId: string,
  teamId: string
): Promise<{
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
}> => {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', teamId)
    .eq('assigned_to', userId);

  if (!tasks) return {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    completionRate: 0
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completionRate = totalTasks ? (completedTasks / totalTasks) * 100 : 0;

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    completionRate
  };
};
