// Barrel for the server actions, which live in app/actions/ by domain.
// Import sites can use either this path or the domain module directly.

export {
  toggleTaskCompletion,
  createTask,
  editTask,
  deleteTask,
} from "@/app/actions/tasks";

export { addCourse, editCourse, deleteCourse } from "@/app/actions/courses";

export {
  createSemester,
  switchSemester,
  deleteSemester,
} from "@/app/actions/semesters";

export {
  savePushSubscription,
  removePushSubscription,
  sendTestNotification,
} from "@/app/actions/push";

export {
  logFocusSession,
  updateReminderPreferences,
  signOutUser,
  updateProfile,
} from "@/app/actions/account";
