/**
 * Reminder alarm utilities — simple, self-contained audio + session stop tracking.
 */
import type { User } from '../types';
import { UserRole } from '../types';
import type { ReminderRecord } from '../services/remindersApi';
import { getReminderAlarmDueMs, isActiveReminder } from './reminderHelpers';

const STOPPED_KEY = 'pmc.reminderAlarmStopped';

let sharedAudio: HTMLAudioElement | null = null;
let audioUrl: string | null = null;

export type ReminderAlarmTarget = {
  id: number;
  title: string;
  dueMs: number;
};

function readStoppedKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STOPPED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeStoppedKeys(keys: Set<string>): void {
  try {
    sessionStorage.setItem(STOPPED_KEY, JSON.stringify([...keys].slice(-120)));
  } catch {
    /* ignore */
  }
}

export function alarmStopKey(id: number, dueMs?: number): string {
  if (dueMs != null) return `${id}@${dueMs}`;
  return String(id);
}

/** True when user stopped the alarm for this reminder this session. */
export function isReminderAlarmStopped(id: number, dueMs?: number): boolean {
  const keys = readStoppedKeys();
  if (keys.has(String(id))) return true;
  if (dueMs != null && keys.has(alarmStopKey(id, dueMs))) return true;
  return false;
}

/** Mark reminder alarm as stopped — will not play again until snooze clears it or new login. */
export function stopReminderAlarmSession(id: number, dueMs?: number): void {
  const keys = readStoppedKeys();
  keys.add(String(id));
  if (dueMs != null) keys.add(alarmStopKey(id, dueMs));
  writeStoppedKeys(keys);
}

export function clearReminderAlarmStop(id: number, dueMs?: number): void {
  const keys = readStoppedKeys();
  keys.delete(String(id));
  if (dueMs != null) {
    keys.delete(alarmStopKey(id, dueMs));
  } else {
    for (const key of [...keys]) {
      if (key.startsWith(`${id}@`)) keys.delete(key);
    }
  }
  writeStoppedKeys(keys);
}

export function clearAllReminderAlarmStops(): void {
  try {
    sessionStorage.removeItem(STOPPED_KEY);
  } catch {
    /* ignore */
  }
}

export function canUserHearReminderAudio(user: Pick<User, 'role'>): boolean {
  return (
    user.role === UserRole.TEAM_LEAD ||
    user.role === UserRole.SITE_ENGINEER ||
    user.role === UserRole.BILLING_SITE_ENGINEER ||
    user.role === UserRole.QAQC_SITE_ENGINEER ||
    user.role === UserRole.HSE_SITE_ENGINEER
  );
}

function buildBeepUrl(): string {
  if (audioUrl) return audioUrl;
  const sampleRate = 22050;
  const duration = 0.55;
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 8) * Math.max(0, 1 - t / duration);
    const sample = Math.sin(2 * Math.PI * 880 * t) * env * 0.8;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }
  audioUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  return audioUrl;
}

export function getReminderAlarmAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio(buildBeepUrl());
    sharedAudio.loop = true;
    sharedAudio.volume = 1;
    sharedAudio.preload = 'auto';
  }
  return sharedAudio;
}

export async function primeReminderAlarmAudio(): Promise<boolean> {
  const audio = getReminderAlarmAudio();
  try {
    audio.volume = 0.01;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    return true;
  } catch {
    return false;
  }
}

export async function playReminderAlarmAudio(): Promise<boolean> {
  const audio = getReminderAlarmAudio();
  try {
    audio.currentTime = 0;
    audio.volume = 1;
    await audio.play();
    return true;
  } catch {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    return false;
  }
}

export function haltReminderAlarmAudio(): void {
  const audio = sharedAudio;
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
}

/** Pick the first active reminder whose due time has passed and was not stopped. */
export function findDueReminderAlarm(
  reminders: ReminderRecord[],
  now = Date.now(),
): ReminderAlarmTarget | null {
  for (const reminder of reminders) {
    if (!isActiveReminder(reminder)) continue;
    const dueMs = getReminderAlarmDueMs(reminder);
    if (dueMs == null || now < dueMs) continue;
    if (isReminderAlarmStopped(reminder.id, dueMs)) continue;
    return {
      id: reminder.id,
      title: reminder.title || 'Reminder',
      dueMs,
    };
  }
  return null;
}
