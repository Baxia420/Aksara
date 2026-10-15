import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import ts from "typescript";
function load(file, mocks = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const virtualModule = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => {
      if (name in mocks) return mocks[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    virtualModule,
    virtualModule.exports,
  );
  return virtualModule.exports;
}
const study = load("lib/study.ts");
const timer = load("lib/study-timer.ts");
const courses = [
  { id: "course-os", code: "OS", title: "Operating Systems", colorIndex: 0 },
];
const tasks = [
  {
    id: "task-1",
    courseCode: "OS",
    courseTitle: "Operating Systems",
    title: "Assignment 1",
  },
];
const start = new Date("2026-10-12T00:00:00Z"),
  end = new Date("2026-10-19T00:00:00Z");
const base = {
  id: "1",
  userId: "user",
  taskId: null,
  duration: 1500,
  type: "focus",
  createdAt: "2026-10-15T10:00:00Z",
  courseId: "course-os",
  courseCode: "OS",
  courseTitle: "Operating Systems",
};

test("course study and task work contribute to the course total once", () => {
  const result = study.studySummary(
    [base, { ...base, id: "2", taskId: "task-1", duration: 900 }],
    tasks,
    courses,
    start,
    end,
  );
  assert.equal(result.totalSeconds, 2400);
  assert.equal(result.courses.length, 1);
  assert.equal(result.courses[0].directSeconds, 1500);
  assert.equal(result.courses[0].taskSeconds.get("task-1").seconds, 900);
});
test("legacy task logs still resolve to their course", () => {
  const result = study.studySummary(
    [
      {
        ...base,
        courseId: null,
        courseCode: null,
        courseTitle: null,
        taskId: "task-1",
      },
    ],
    tasks,
    courses,
    start,
    end,
  );
  assert.equal(result.courses[0].key, "course-os");
});
test("breaks, future dates and next-week sessions do not inflate this week", () => {
  const result = study.studySummary(
    [
      base,
      { ...base, id: "2", type: "shortBreak" },
      { ...base, id: "3", createdAt: end.toISOString() },
    ],
    tasks,
    courses,
    start,
    end,
  );
  assert.equal(result.totalSeconds, 1500);
});
test("snapshots preserve attribution after task and course deletion", () => {
  const result = study.studySummary(
    [{ ...base, courseId: null, taskId: null, taskTitle: "Assignment 1" }],
    [],
    [],
    start,
    end,
  );
  assert.equal(result.courses[0].title, "Operating Systems");
  assert.equal(
    [...result.courses[0].taskSeconds.values()][0].title,
    "Assignment 1",
  );
});
test("retries with the same session ID are counted once", () => {
  const result = study.studySummary(
    [
      { ...base, sessionId: "same" },
      { ...base, id: "2", sessionId: "same" },
    ],
    tasks,
    courses,
    start,
    end,
  );
  assert.equal(result.sessions, 1);
  assert.equal(result.totalSeconds, 1500);
});
test("a session crossing a week boundary is split by its actual active intervals", () => {
  const log = {
    ...base,
    duration: 1800,
    intervals: [{ start: "2026-10-18T23:45:00Z", end: "2026-10-19T00:15:00Z" }],
  };
  assert.equal(study.secondsInRange(log, start, end), 900);
  assert.equal(
    study.secondsInRange(log, end, new Date("2026-10-26T00:00:00Z")),
    900,
  );
});
test("pauses and resumed intervals count only active time", () => {
  const state = {
    ...timer.emptyTimer(),
    intervals: [{ start: "2026-10-15T10:00:00Z", end: "2026-10-15T10:10:00Z" }],
    runningAt: Date.parse("2026-10-15T10:30:00Z"),
  };
  assert.equal(
    timer.elapsedMilliseconds(state, Date.parse("2026-10-15T10:35:00Z")),
    900000,
  );
});
test("sleeping or backgrounded Pomodoros stop at the planned duration", () => {
  const state = {
    ...timer.emptyTimer(),
    runningAt: Date.parse("2026-10-15T10:00:00Z"),
  };
  const intervals = timer.closeInterval(
    state,
    Date.parse("2026-10-15T11:00:00Z"),
    1500,
  );
  assert.equal(intervals[0].end, "2026-10-15T10:25:00.000Z");
});
test("stopwatch and pause state survive reload; invalid storage is ignored", () => {
  const state = {
    ...timer.emptyTimer(),
    timerStyle: "stopwatch",
    intervals: [{ start: "2026-10-15T10:00:00Z", end: "2026-10-15T10:05:00Z" }],
  };
  assert.deepEqual(timer.restoreTimer(JSON.stringify(state)), state);
  assert.equal(timer.restoreTimer("{broken"), null);
  assert.equal(
    timer.restoreTimer(
      JSON.stringify({ ...state, intervals: [{ start: "x", end: "y" }] }),
    ),
    null,
  );
});
test("zero time and partial minutes use honest labels", () => {
  assert.equal(study.formatStudyTime(0), "0m");
  assert.equal(study.formatStudyTime(30), "< 1m");
  assert.equal(study.formatStudyTime(3900), "1h 5m");
});
test("a previous term with the same course code does not merge into the new course", () => {
  const result = study.studySummary(
    [{ ...base, courseId: null, semesterId: "old-term" }],
    [],
    [{ ...courses[0], semesterId: "new-term" }],
    start,
    end,
  );
  assert.notEqual(result.courses[0].key, "course-os");
});

test("a deleted course's identifier cannot merge into a new course with the same code", () => {
  const result = study.studySummary(
    [base],
    [],
    [{ ...courses[0], id: "new-course-os" }],
    start,
    end,
  );
  assert.equal(result.courses[0].key, "course-os");
  assert.notEqual(result.courses[0].key, "new-course-os");
});
test("server rejects malformed sessions before opening a database connection", async () => {
  const actions = load("app/actions/focus.ts", {
    "@/lib/supabase/server": {
      createClient: () => {
        throw new Error("Must not connect");
      },
    },
    "next/cache": { revalidatePath() {} },
    "@/lib/study": study,
  });
  assert.match(
    (await actions.logFocusSession({ sessionId: "invalid" })).error,
    /Invalid study session/,
  );
});
test("server rejects overlapping active intervals", async () => {
  const actions = load("app/actions/focus.ts", {
    "@/lib/supabase/server": {
      createClient: () => {
        throw new Error("Must not connect");
      },
    },
    "next/cache": { revalidatePath() {} },
    "@/lib/study": study,
  });
  const result = await actions.logFocusSession({
    sessionId: "11111111-1111-4111-8111-111111111111",
    duration: 120,
    type: "focus",
    timerStyle: "pomodoro",
    courseId: null,
    taskId: null,
    intervals: [
      { start: "2026-01-01T10:00:00Z", end: "2026-01-01T10:01:00Z" },
      { start: "2026-01-01T10:00:30Z", end: "2026-01-01T10:01:30Z" },
    ],
  });
  assert.match(result.error, /Invalid session timing/);
});

const validInput = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  duration: 60,
  type: "focus",
  timerStyle: "pomodoro",
  courseId: null,
  taskId: null,
  intervals: [{ start: "2026-01-01T10:00:00Z", end: "2026-01-01T10:01:00Z" }],
};
function actionsWith(client) {
  return load("app/actions/focus.ts", {
    "@/lib/supabase/server": { createClient: async () => client },
    "next/cache": { revalidatePath() {} },
    "@/lib/study": study,
  });
}
test("signed-out requests cannot write study sessions", async () => {
  const actions = actionsWith({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from() {
      throw new Error("Must not write");
    },
  });
  assert.match((await actions.logFocusSession(validInput)).error, /sign in/);
});
test("a task from another course is rejected before insert", async () => {
  const queried = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "student" } } }) },
    from(table) {
      queried.push(table);
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        or() {
          return query;
        },
        async maybeSingle() {
          return {
            data:
              table === "focus_logs"
                ? null
                : table === "courses"
                  ? {
                      id: "course",
                      code: "OS",
                      title: "Operating Systems",
                      semester_id: null,
                    }
                  : {
                      title: "Other assignment",
                      course_code: "OTHER",
                      semester_id: null,
                    },
          };
        },
        upsert() {
          throw new Error("Must not insert mismatched task");
        },
      };
      return query;
    },
  };
  const actions = actionsWith(client);
  const result = await actions.logFocusSession({
    ...validInput,
    courseId: "22222222-2222-4222-8222-222222222222",
    taskId: "33333333-3333-4333-8333-333333333333",
  });
  assert.match(result.error, /selected course/);
  assert.deepEqual(queried, ["focus_logs", "courses", "tasks"]);
});
test("an already-saved session returns its original log even if its course was removed", async () => {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "student" } } }) },
    from(table) {
      assert.equal(table, "focus_logs");
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          if (key === "user_id") assert.equal(value, "student");
          return query;
        },
        async maybeSingle() {
          return {
            data: {
              id: "saved",
              user_id: "student",
              task_id: null,
              session_id: validInput.sessionId,
              duration: 60,
              type: "focus",
              created_at: "2026-01-01T10:01:00Z",
            },
          };
        },
      };
      return query;
    },
  };
  assert.equal(
    (await actionsWith(client).logFocusSession(validInput)).log.id,
    "saved",
  );
});
test("a missing migration is reported without claiming a successful save", async () => {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "student" } } }) },
    from() {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        async maybeSingle() {
          return { error: { code: "42703" } };
        },
      };
      return query;
    },
  };
  const result = await actionsWith(client).logFocusSession(validInput);
  assert.match(result.error, /database update/);
  assert.equal("log" in result, false);
});
test("local calendar weeks account for daylight-saving changes", () => {
  const old = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    const monday = study.weekStart(new Date("2026-03-08T17:00:00Z"));
    const next = study.addDays(monday, 7);
    assert.equal(monday.getDay(), 1);
    assert.equal(monday.getHours(), 0);
    assert.equal(next.getHours(), 0);
    assert.equal((next - monday) / 3600000, 167);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
