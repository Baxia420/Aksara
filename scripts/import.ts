import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// The parser logic directly from your current app
const DEFAULT_SHEET_ID = "1XcNDiOy0A4Fll6ibU6mEZ0X4kaQ1hiD2sUnL8j-5-Ss";
const DEFAULT_SHEET_GID = "0";

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
    return null;
  }

  const twelveHourMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (twelveHourMatch) {
    const [, hour, minute = "00", period] = twelveHourMatch;
    let hr = parseInt(hour, 10);
    if (period.toUpperCase() === 'PM' && hr < 12) hr += 12;
    if (period.toUpperCase() === 'AM' && hr === 12) hr = 0;
    return `${hr.toString().padStart(2, '0')}:${minute.padStart(2, "0")}:00`;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const [, hour, minute] = twentyFourHourMatch;
    return `${hour.padStart(2, "0")}:${minute}:00`;
  }

  return null;
}

function parseCompletedStatus(input: string) {
  const normalized = input.trim().toUpperCase();
  return ["TRUE", "DONE", "COMPLETED", "COMPLETE", "YES", "Y"].includes(
    normalized,
  );
}

async function runImport() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use the service role key for importing without RLS bypass issues
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase URL or Service Role Key in .env.local");
    console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🔍 Fetching tasks from Google Sheets...");
  const sheetId = process.env.GOOGLE_SHEET_ID ?? DEFAULT_SHEET_ID;
  const gid = process.env.GOOGLE_SHEET_GID ?? DEFAULT_SHEET_GID;
  const sourceUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  const response = await fetch(sourceUrl, { cache: "no-store" });

  if (!response.ok) {
    console.error(`❌ Google Sheet request failed with status ${response.status}`);
    process.exit(1);
  }

  const csv = await response.text();
  const rows = parseCsv(csv).map((row) => row.map((cell) => cell.trim()));
  const headerIndex = rows.findIndex(
    (row) => row.includes("Task Name") && row.includes("Due Date"),
  );

  if (headerIndex === -1) {
    console.error("❌ Could not find header row in Google Sheets.");
    process.exit(1);
  }

  const headerRow = rows[headerIndex];
  const getIndex = (name: string) => headerRow.findIndex((cell) => cell === name);
  const getFirstIndex = (names: string[]) =>
    names.reduce((foundIndex, name) => {
      if (foundIndex !== -1) return foundIndex;
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

  const tasksToImport = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const title = row[titleIndex] ?? "";
    const rawCourse = row[courseIndex] ?? "";
    const dueDateIso = parseSheetDate(row[dueDateIndex] ?? "");
    
    if (!title || !dueDateIso) continue;

    const { courseCode, courseTitle } = normalizeCourse(rawCourse);
    const dueTime = dueTimeIndex === -1 ? null : normalizeDueTime(row[dueTimeIndex] ?? "");

    tasksToImport.push({
      course_code: courseCode,
      course_title: courseTitle,
      title: title,
      type: (row[typeIndex] ?? "") || "Task",
      due_date: dueDateIso,
      due_time: dueTime,
      completed: parseCompletedStatus(row[statusIndex] ?? ""),
    });
  }

  console.log(`✅ Parsed ${tasksToImport.length} tasks from Google Sheets.`);

  // Get the first user from Supabase Auth to assign these tasks to
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError || !authData.users.length) {
    console.error("❌ No users found in Supabase Auth.");
    console.error("Please create a user first via the Supabase Dashboard -> Authentication -> Add User.");
    process.exit(1);
  }

  const userId = authData.users[0].id;
  console.log(`👤 Assigning tasks to user ID: ${userId} (${authData.users[0].email})`);

  const tasksWithUserId = tasksToImport.map(task => ({ ...task, user_id: userId }));

  console.log("⬆️ Inserting tasks into Supabase...");
  const { error: insertError } = await supabase.from('tasks').insert(tasksWithUserId);

  if (insertError) {
    console.error("❌ Failed to insert tasks:");
    console.error(insertError);
  } else {
    console.log("🚀 Successfully imported all tasks to Supabase!");
  }
}

runImport().catch(console.error);
