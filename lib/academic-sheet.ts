const DEFAULT_SHEET_ID = "1XcNDiOy0A4Fll6ibU6mEZ0X4kaQ1hiD2sUnL8j-5-Ss";
const DEFAULT_SHEET_GID = "0";

export type AcademicSheetTask = {
  completed: boolean;
  courseCode: string;
  courseDisplay: string;
  courseTitle: string;
  daysRemaining: number;
  dueDateIso: string;
  dueTime: string;
  title: string;
  type: string;
};

export type AcademicSheetResponse = {
  sourceUrl: string;
  syncedAt: string;
  tasks: AcademicSheetTask[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function stripDecorativePrefix(value: string) {
  return value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeCourse(rawCourse: string) {
  const cleaned = stripDecorativePrefix(rawCourse);
  const match = cleaned.match(/^([A-Z]{4}\d{4})\s*-\s*(.+)$/i);

  if (!match) {
    return {
      courseCode: cleaned || "General",
      courseDisplay: cleaned || "General",
      courseTitle: toTitleCase(cleaned || "General"),
    };
  }

  const normalizedTitle = toTitleCase(match[2].trim());

  return {
    courseCode: match[1].toUpperCase(),
    courseDisplay: `${match[1].toUpperCase()} - ${normalizedTitle}`,
    courseTitle: normalizedTitle,
  };
}

function parseSheetDate(input: string) {
  const match = input.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function normalizeDueTime(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  const twelveHourMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (twelveHourMatch) {
    const [, hour, minute = "00", period] = twelveHourMatch;
    return `${Number(hour)}:${minute.padStart(2, "0")} ${period.toUpperCase()}`;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const [, hour, minute] = twentyFourHourMatch;
    return `${hour.padStart(2, "0")}:${minute}`;
  }

  return trimmed;
}

function parseCompletedStatus(input: string) {
  const normalized = input.trim().toUpperCase();

  return ["TRUE", "DONE", "COMPLETED", "COMPLETE", "YES", "Y"].includes(
    normalized,
  );
}

function calculateDaysRemaining(dueDateIso: string) {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const [year, month, day] = dueDateIso.split("-").map(Number);
  const dueUtc = Date.UTC(year, month - 1, day);

  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

export async function getAcademicSheetData(): Promise<AcademicSheetResponse> {
  const sheetId = process.env.GOOGLE_SHEET_ID ?? DEFAULT_SHEET_ID;
  const gid = process.env.GOOGLE_SHEET_GID ?? DEFAULT_SHEET_GID;
  const sourceUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  const response = await fetch(sourceUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Google Sheet request failed with status ${response.status}`);
  }

  const csv = await response.text();
  const rows = parseCsv(csv).map((row) => row.map((cell) => cell.trim()));
  const headerIndex = rows.findIndex(
    (row) => row.includes("Task Name") && row.includes("Due Date"),
  );

  if (headerIndex === -1) {
    return {
      sourceUrl,
      syncedAt: new Date().toISOString(),
      tasks: [],
    };
  }

  const headerRow = rows[headerIndex];
  const getIndex = (name: string) => headerRow.findIndex((cell) => cell === name);
  const getFirstIndex = (names: string[]) =>
    names.reduce((foundIndex, name) => {
      if (foundIndex !== -1) {
        return foundIndex;
      }

      return getIndex(name);
    }, -1);

  const titleIndex = getIndex("Task Name");
  const typeIndex = getIndex("Type");
  const courseIndex = getIndex("Course");
  const dueDateIndex = getIndex("Due Date");
  const dueTimeIndex = getFirstIndex([
    "Due Time",
    "Submission Time",
    "Time Due",
    "Due At",
    "Time",
  ]);
  const statusIndex = getIndex("Status");
  const daysRemainingIndex = getIndex("Days Remaining");

  const tasks = rows
    .slice(headerIndex + 1)
    .map((row) => {
      const title = row[titleIndex] ?? "";
      const type = row[typeIndex] ?? "";
      const rawCourse = row[courseIndex] ?? "";
      const dueDateIso = parseSheetDate(row[dueDateIndex] ?? "");
      const dueTime = dueTimeIndex === -1 ? "" : normalizeDueTime(row[dueTimeIndex] ?? "");

      if (!title || !dueDateIso) {
        return null;
      }

      const parsedDays = Number.parseInt(row[daysRemainingIndex] ?? "", 10);
      const { courseCode, courseDisplay, courseTitle } = normalizeCourse(rawCourse);

      return {
        completed: parseCompletedStatus(row[statusIndex] ?? ""),
        courseCode,
        courseDisplay,
        courseTitle,
        daysRemaining: Number.isNaN(parsedDays)
          ? calculateDaysRemaining(dueDateIso)
          : parsedDays,
        dueDateIso,
        dueTime,
        title,
        type: type || "Task",
      } satisfies AcademicSheetTask;
    })
    .filter((task): task is AcademicSheetTask => task !== null)
    .sort((left, right) => left.dueDateIso.localeCompare(right.dueDateIso));

  return {
    sourceUrl,
    syncedAt: new Date().toISOString(),
    tasks,
  };
}
