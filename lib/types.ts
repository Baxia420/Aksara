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
  semesterId?: string | null;
};

export type AcademicCourse = {
  id: string;
  code: string;
  title: string;
  colorIndex: number;
  isPublic?: boolean;
  semesterId?: string | null;
};

export type Semester = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
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

export type ReminderPreferences = {
  enabled: boolean;
  // Minutes before a deadline to remind (0 = at the deadline).
  leadTimes: number[];
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: true,
  leadTimes: [1440, 180],
};

export const REMINDER_LEAD_TIME_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "At the deadline" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 180, label: "3 hours before" },
  { minutes: 720, label: "12 hours before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 2880, label: "2 days before" },
];

export type DashboardData = {
  user: UserProfile | null;
  // Whether the signed-in user is the admin who owns the shared syllabus.
  isAdmin: boolean;
  reminderPreferences: ReminderPreferences;
  tasks: AcademicTask[];
  courses: AcademicCourse[];
  focusLogs: FocusLog[];
  // All of the user's semesters (empty until the semesters migration has run).
  semesters: Semester[];
  // The semester the dashboard is currently scoped to, or null in legacy
  // (pre-migration / no-semesters) mode where everything is shown.
  activeSemesterId: string | null;
  syncedAt: string;
};
