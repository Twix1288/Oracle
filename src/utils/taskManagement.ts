import type { UserSkill, ExperienceLevel } from "@/types/onboarding";

// Interface for initial task (since it doesn't exist in types)
interface InitialTask {
  title: string;
  description: string;
  type: string;
  priority: string;
  estimatedHours: number;
  resources?: string[];
  dependencies?: string[];
}

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

  // TODO: Implement task storage when tasks table is created
  // For now, return the tasks without saving to database
  console.log('Generated tasks for team:', teamId, tasks);
  return tasks;
};

// Task management functions (stubbed until tasks table is created)
export const getTasksForTeam = async (teamId: string): Promise<any[]> => {
  console.log('Getting tasks for team:', teamId);
  return [];
};

export const updateTaskStatus = async (taskId: string, status: string): Promise<void> => {
  console.log('Updating task status:', taskId, status);
};

export const getTeamProgress = async (teamId: string): Promise<any> => {
  console.log('Getting team progress for:', teamId);
  return {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
    currentFocus: 'Planning'
  };
};

export const assignTaskToMember = async (taskId: string, memberId: string): Promise<void> => {
  console.log('Assigning task to member:', taskId, memberId);
};

export const createCustomTask = async (task: any): Promise<any> => {
  console.log('Creating custom task:', task);
  return {
    ...task,
    id: `temp-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

export const deleteTask = async (taskId: string): Promise<void> => {
  console.log('Deleting task:', taskId);
};

export const getTasksByMember = async (memberId: string): Promise<any[]> => {
  console.log('Getting tasks for member:', memberId);
  return [];
};

export const getMemberProgress = async (memberId: string): Promise<any> => {
  console.log('Getting member progress for:', memberId);
  return {
    memberId,
    memberName: 'Unknown',
    totalTasks: 0,
    completedTasks: 0,
    completionPercentage: 0,
    currentTask: null
  };
};