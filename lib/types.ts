// Shared domain types for the Aksara dashboard. These mirror the shape returned
// by getDashboardData() in lib/academic-data.ts.

export type MarkerTone = "overdue" | "due" | "upcoming";

export type TaskFilter = "pending" | "group" | "urgent" | "completed";

export type DashboardView = "dashboard" | "calendar" | "tasks" | "courses" | "focus";

export type AcademicTask = {
  id: string;
  completed: boolean;
  courseCode: string;
  courseDisplay: string;
  courseTitle: string;
  daysRemaining: number;
  dueDateIso: string;
  dueTime: string;
  title: string;
  type: string;
  completedAt?: string | null;
  createdAt?: string | null;
  userId?: string;
  isPublic?: boolean;
};

export type AcademicCourse = {
  id: string;
  code: string;
  title: string;
  colorIndex: number;
  isPublic?: boolean;
};

export type FocusLog = {
  id: string;
  userId: string;
  taskId: string | null;
  duration: number;
  type: "focus" | "shortBreak" | "longBreak";
  createdAt: string;
};

export type UserProfile = {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
};

export type DashboardData = {
  user: UserProfile | null;
  tasks: AcademicTask[];
  courses: AcademicCourse[];
  focusLogs: FocusLog[];
  syncedAt: string;
};
