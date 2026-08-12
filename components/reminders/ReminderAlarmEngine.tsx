/**
 * Reminder alarm engine — polls "mine" reminders, plays looping audio at exact due time.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '../../types';
import { listReminders, type ReminderRecord } from '../../services/remindersApi';
import { isActiveReminder, REMINDER_REFRESH_MS } from '../../utils/reminderHelpers';
import {
  findDueReminderAlarm,
  haltReminderAlarmAudio,
  isReminderAlarmStopped,
  playReminderAlarmAudio,
  primeReminderAlarmAudio,
  stopReminderAlarmSession,
  type ReminderAlarmTarget,
} from '../../utils/reminderAlarm';
import ReminderOverdueAudioBar from './ReminderOverdueAudioBar';

const POLL_MS = REMINDER_REFRESH_MS;
const TICK_MS = 1_000;

interface ReminderAlarmEngineProps {
  user: User;
  /** Navigate to Reminders page (from any section). */
  onNavigateToReminders?: () => void;
}

const ReminderAlarmEngine: React.FC<ReminderAlarmEngineProps> = ({
  user,
  onNavigateToReminders,
}) => {
  const remindersRef = useRef<ReminderRecord[]>([]);
  const activeRef = useRef<ReminderAlarmTarget | null>(null);
  const playingRef = useRef(false);
  const audioReadyRef = useRef(false);

  const [active, setActive] = useState<ReminderAlarmTarget | null>(null);
  const [playing, setPlaying] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const syncPlaying = (value: boolean) => {
    playingRef.current = value;
    setPlaying(value);
  };

  const tryPlay = useCallback(async (target: ReminderAlarmTarget) => {
    if (isReminderAlarmStopped(target.id, target.dueMs)) {
      activeRef.current = null;
      setActive(null);
      syncPlaying(false);
      setNeedsUnlock(false);
      return false;
    }

    activeRef.current = target;
    setActive(target);

    const ok = await playReminderAlarmAudio();
    if (ok) {
      syncPlaying(true);
      setNeedsUnlock(false);
      return true;
    }
    syncPlaying(false);
    setNeedsUnlock(true);
    return false;
  }, []);

  const stopAlarm = useCallback(() => {
    const current = activeRef.current;
    if (current) {
      stopReminderAlarmSession(current.id, current.dueMs);
    }
    haltReminderAlarmAudio();
    activeRef.current = null;
    setActive(null);
    syncPlaying(false);
    setNeedsUnlock(false);
    onNavigateToReminders?.();
  }, [onNavigateToReminders]);

  const tick = useCallback(() => {
    const due = findDueReminderAlarm(remindersRef.current);
    if (!due) {
      if (playingRef.current) {
        haltReminderAlarmAudio();
        activeRef.current = null;
        setActive(null);
        syncPlaying(false);
        setNeedsUnlock(false);
      }
      return;
    }

    const current = activeRef.current;
    const same = current?.id === due.id && current?.dueMs === due.dueMs;

    if (!same) {
      void tryPlay(due);
      return;
    }

    if (!playingRef.current) {
      void tryPlay(due);
    }
  }, [tryPlay]);

  const fetchReminders = useCallback(async () => {
    try {
      const result = await listReminders({
        scope: 'mine',
        page_size: 100,
        ordering: 'due_at',
        skipCache: true,
      });
      remindersRef.current = result.results.filter(isActiveReminder);
      tick();
    } catch {
      /* keep last list */
    }
  }, [tick, user.id]);

  const unlockAndPlay = useCallback(async () => {
    audioReadyRef.current = await primeReminderAlarmAudio();
    const target = activeRef.current ?? findDueReminderAlarm(remindersRef.current);
    if (!target) return;
    await tryPlay(target);
  }, [tryPlay]);

  useEffect(() => {
    void fetchReminders();
    const pollTimer = window.setInterval(() => void fetchReminders(), POLL_MS);
    const tickTimer = window.setInterval(tick, TICK_MS);

    const onGesture = () => {
      void primeReminderAlarmAudio().then((ok) => {
        audioReadyRef.current = ok;
        const pending = activeRef.current;
        if (pending && !playingRef.current && !isReminderAlarmStopped(pending.id, pending.dueMs)) {
          void tryPlay(pending);
        } else {
          tick();
        }
      });
    };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);

    return () => {
      window.clearInterval(pollTimer);
      window.clearInterval(tickTimer);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      haltReminderAlarmAudio();
    };
  }, [fetchReminders, tick, tryPlay]);

  const showBar = Boolean(active) || needsUnlock;
  if (!showBar) return null;

  return (
    <ReminderOverdueAudioBar
      forcedState={{
        playing,
        pending: needsUnlock && !playing,
        showBar: true,
        label: active?.title || 'Reminder due',
      }}
      onEnableSound={() => void unlockAndPlay()}
      onOpenReminders={onNavigateToReminders}
      onStop={stopAlarm}
    />
  );
};

export default ReminderAlarmEngine;
