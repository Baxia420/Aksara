"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logFocusSession } from "@/app/actions/focus";
import {
  closeInterval,
  elapsedMilliseconds,
  emptyTimer,
  restoreTimer,
  TIMER_DURATIONS,
} from "./study-timer";
import type { StudyTimerState } from "./study-timer";
import type { FocusLog, StudySessionInput } from "./types";

export function useStudyTimer(
  userKey: string,
  onSaved: (log: FocusLog) => void,
  saveSession = logFocusSession,
) {
  const [state, setState] = useState<StudyTimerState>(emptyTimer);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const stateRef = useRef(state);
  const savingRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  const storageKey = `aksara-study-v1:${userKey}`;
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const commit = useCallback(
    (next: StudyTimerState) => {
      stateRef.current = next;
      setState(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        setStorageWarning(true);
      }
    },
    [storageKey],
  );

  useEffect(() => {
    let restored = emptyTimer();
    try {
      restored = restoreTimer(localStorage.getItem(storageKey)) || restored;
    } catch {
      /* The timer still works when storage is unavailable. */
    }
    stateRef.current = restored;
    // Restore after hydration so the server and first client render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(restored);
    setNow(Date.now());
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey || savingRef.current) return;
      const next = restoreTimer(event.newValue);
      if (next) {
        stateRef.current = next;
        setState(next);
        setNow(Date.now());
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);

  const save = useCallback(
    async (pending: StudySessionInput) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setError(null);
      try {
        const result = await saveSession(pending);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        const current = stateRef.current;
        commit({
          ...current,
          sessionId: null,
          intervals: [],
          runningAt: null,
          pending: null,
        });
        setNotice(
          pending.type === "focus"
            ? "Study session saved."
            : "Break finished. Ready when you are.",
        );
        onSavedRef.current(result.log);
      } catch {
        setError(
          "Could not save your session. It is kept on this device; retry when you are connected.",
        );
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [commit, saveSession],
  );

  const finish = useCallback(
    async (completed = false) => {
      const current = stateRef.current;
      if (savingRef.current || !current.sessionId) return;
      if (current.pending) {
        await save(current.pending);
        return;
      }
      const limit =
        current.timerStyle === "pomodoro"
          ? TIMER_DURATIONS[current.type]
          : 86400;
      const intervals = closeInterval(current, Date.now(), limit);
      const duration = Math.floor(
        intervals.reduce(
          (sum, interval) =>
            sum + Date.parse(interval.end) - Date.parse(interval.start),
          0,
        ) / 1000,
      );
      if (duration < 1) {
        commit({ ...current, runningAt: null, intervals: [], sessionId: null });
        setNotice("Session ended before any study time was recorded.");
        return;
      }
      const pending: StudySessionInput = {
        sessionId: current.sessionId,
        courseId: current.courseId,
        taskId: current.taskId,
        timerStyle: current.timerStyle,
        type: current.type,
        duration,
        intervals,
      };
      // Persist before starting the request. Retrying after reload uses the same ID.
      commit({ ...current, runningAt: null, intervals, pending });
      if (completed) {
        try {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.connect(gain);
          gain.connect(context.destination);
          gain.gain.setValueAtTime(0.08, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.4,
          );
          oscillator.frequency.value = 660;
          oscillator.start();
          oscillator.stop(context.currentTime + 0.4);
          oscillator.onended = () => {
            void context.close();
          };
        } catch {
          /* Audio is optional on devices that require a user gesture. */
        }
      }
      await save(pending);
    },
    [commit, save],
  );

  useEffect(() => {
    if (!ready || state.runningAt === null) return;
    const update = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      const current = stateRef.current;
      const limit =
        current.timerStyle === "pomodoro"
          ? TIMER_DURATIONS[current.type]
          : 86400;
      if (
        current.runningAt !== null &&
        elapsedMilliseconds(current, timestamp) >= limit * 1000
      )
        void finish(true);
    };
    update();
    const interval = window.setInterval(update, 500);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [ready, state.runningAt, finish]);

  const elapsed = Math.floor(elapsedMilliseconds(state, now) / 1000);
  const active = Boolean(state.sessionId);
  const selectCourse = (
    courseId: string | null,
    taskId: string | null = null,
  ) => {
    if (active || !ready) return false;
    commit({ ...stateRef.current, courseId, taskId });
    setNotice(null);
    return true;
  };
  return {
    state,
    ready,
    saving,
    error,
    notice,
    storageWarning,
    active,
    running: state.runningAt !== null,
    seconds:
      state.timerStyle === "pomodoro"
        ? Math.max(0, TIMER_DURATIONS[state.type] - elapsed)
        : elapsed,
    elapsed,
    selectCourse,
    selectTask: (taskId: string | null) => {
      if (!active) commit({ ...stateRef.current, taskId });
    },
    configure: (
      timerStyle: StudyTimerState["timerStyle"],
      type: StudyTimerState["type"],
    ) => {
      if (!active) {
        commit({ ...stateRef.current, timerStyle, type });
        setNotice(null);
      }
    },
    toggle: () => {
      if (!ready || saving || stateRef.current.pending) return;
      const current = stateRef.current,
        timestamp = Date.now();
      if (current.runningAt !== null)
        commit({
          ...current,
          intervals: closeInterval(current, timestamp),
          runningAt: null,
        });
      else
        commit({
          ...current,
          sessionId: current.sessionId || crypto.randomUUID(),
          runningAt: timestamp,
        });
      setNow(timestamp);
      setNotice(null);
      setError(null);
    },
    finish: () => finish(false),
    discard: () => {
      if (saving) return;
      commit({
        ...stateRef.current,
        sessionId: null,
        runningAt: null,
        intervals: [],
        pending: null,
      });
      setError(null);
      setNotice("Session discarded.");
    },
  };
}

export type StudyTimer = ReturnType<typeof useStudyTimer>;
