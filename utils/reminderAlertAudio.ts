/**
 * Reminder alarm audio for assignees (TL / SE).
 * Fires exactly when due time is reached — never before.
 */

import type { AppNotification, User } from '../types';
import { UserRole } from '../types';
import type { ReminderRecord } from '../services/remindersApi';
import { getReminderAlarmDueAt, isActiveReminder } from './reminderHelpers';
import { isReminderDueNotification } from './reminderNotifications';

export type ReminderAudioRow = { id: number | string; title: string; dueAt: string };

type AudioState = {
  playing: boolean;
  pending: boolean;
  showBar: boolean;
  label: string;
};

type Listener = (state: AudioState) => void;

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let loopTimer: number | null = null;
let stopEnvelopeTimer: number | null = null;
let htmlAudio: HTMLAudioElement | null = null;
let playing = false;
let pending = false;
let showBar = false;
let detailLabel = '';
let activeAlertIds: string[] = [];
let pendingAlarmRows: ReminderAudioRow[] = [];
let watchedReminders: ReminderRecord[] = [];
let alarmWatchInterval: number | null = null;
const triggeredIds = new Set<string>();
const alarmScheduleTimers = new Map<string, number>();
const listeners = new Set<Listener>();

const MUTE_KEY = 'pmc.reminderOverdueAudioMuted';
const ALARM_TICK_MS = 1000;

function readMutedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(MUTE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Array<string | number>;
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeMutedIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(MUTE_KEY, JSON.stringify([...ids].slice(-120)));
  } catch {
    /* ignore */
  }
}

function asIdKey(id: number | string): string {
  return String(id);
}

function rowAlarmKey(row: ReminderAudioRow): string {
  return `${asIdKey(row.id)}@${new Date(row.dueAt).getTime()}`;
}

function scheduleKeyForReminder(reminder: ReminderRecord, dueMs: number): string {
  return `${reminder.id}@${dueMs}`;
}

function markAlarmTriggered(keys: string[]): void {
  for (const key of keys) triggeredIds.add(key);
}

function ensureAlarmWatchTicker(): void {
  if (alarmWatchInterval != null) return;
  alarmWatchInterval = window.setInterval(() => {
    if (watchedReminders.length === 0) return;
    processReminderAlarms(watchedReminders);
  }, ALARM_TICK_MS);
}

function stopAlarmWatchTicker(): void {
  if (alarmWatchInterval != null) {
    window.clearInterval(alarmWatchInterval);
    alarmWatchInterval = null;
  }
}

export function clearReminderOverdueAudioSession(): void {
  try {
    sessionStorage.removeItem(MUTE_KEY);
  } catch {
    /* ignore */
  }
  triggeredIds.clear();
  activeAlertIds = [];
  pendingAlarmRows = [];
  watchedReminders = [];
  showBar = false;
  clearReminderAlarmSchedules();
  stopAlarmWatchTicker();
  stopReminderOverdueAudio({ muteActive: false });
}

export function clearReminderAlarmSchedules(): void {
  for (const timer of alarmScheduleTimers.values()) {
    window.clearTimeout(timer);
  }
  alarmScheduleTimers.clear();
}

function fireReminderAlarm(reminder: ReminderRecord, dueAt: string, scheduleKey: string): void {
  alarmScheduleTimers.delete(scheduleKey);
  void syncReminderDueAudio([{ id: reminder.id, title: reminder.title, dueAt }]);
}

function processReminderAlarms(reminders: ReminderRecord[]): void {
  const keepKeys = new Set<string>();
  const now = Date.now();

  for (const reminder of reminders) {
    if (!isActiveReminder(reminder)) continue;
    if (isReminderOverdueAudioMuted(reminder.id)) continue;

    const dueAt = getReminderAlarmDueAt(reminder);
    if (!dueAt) continue;
    const dueMs = new Date(dueAt).getTime();
    if (!Number.isFinite(dueMs)) continue;

    const scheduleKey = scheduleKeyForReminder(reminder, dueMs);
    keepKeys.add(scheduleKey);

    if (now >= dueMs) {
      if (!triggeredIds.has(scheduleKey) && !pending) {
        fireReminderAlarm(reminder, dueAt, scheduleKey);
      }
      continue;
    }

    if (!alarmScheduleTimers.has(scheduleKey)) {
      const delay = Math.min(dueMs - now, 2_147_483_647);
      alarmScheduleTimers.set(
        scheduleKey,
        window.setTimeout(() => {
          if (!triggeredIds.has(scheduleKey)) {
            fireReminderAlarm(reminder, dueAt, scheduleKey);
          }
        }, delay),
      );
    }
  }

  for (const [key, timer] of [...alarmScheduleTimers.entries()]) {
    if (!keepKeys.has(key)) {
      window.clearTimeout(timer);
      alarmScheduleTimers.delete(key);
    }
  }

  if (keepKeys.size === 0) {
    stopAlarmWatchTicker();
  } else {
    ensureAlarmWatchTicker();
  }
}

/** Schedule exact-time alarms — e.g. due 13:14 plays at 13:14, not before. */
export function scheduleReminderDueAlarms(reminders: ReminderRecord[]): void {
  watchedReminders = reminders;
  processReminderAlarms(reminders);
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

export function isReminderDueAlertNotification(notification: AppNotification): boolean {
  const type = (notification.notificationType || notification.actionType || '').toUpperCase();
  const module = (notification.moduleName || '').trim().toLowerCase();
  if (type === 'REMINDER_DUE') return true;
  if (isReminderDueNotification(notification.id)) return true;
  if (module === 'reminders' && /^Reminder:/i.test(notification.title || '')) return true;
  return false;
}

export async function syncReminderDueAudioFromAlerts(
  _notifications: AppNotification[],
): Promise<AudioState> {
  return snapshot();
}

export const syncOverdueReminderAudio = syncReminderDueAudio;

export function getReminderOverdueAudioState(): AudioState {
  return snapshot();
}

export function subscribeReminderOverdueAudio(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

function snapshot(): AudioState {
  return { playing, pending, showBar, label: detailLabel };
}

function notify(): void {
  for (const listener of listeners) {
    try {
      listener(snapshot());
    } catch {
      /* ignore */
    }
  }
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

async function unlockContext(): Promise<AudioContext | null> {
  const ctx = getContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === 'running' ? ctx : null;
}

function playMotif(ctx: AudioContext, gain: GainNode, when: number): void {
  const notes = [
    { freq: 523.25, start: 0.0, dur: 0.45, peak: 0.8 },
    { freq: 659.25, start: 0.16, dur: 0.5, peak: 0.75 },
    { freq: 783.99, start: 0.32, dur: 0.65, peak: 0.7 },
    { freq: 1046.5, start: 0.5, dur: 0.85, peak: 0.55 },
  ];
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, when + note.start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, when + note.start);
    const t0 = when + note.start;
    const t1 = t0 + note.dur;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(note.peak, t0 + 0.03);
    amp.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(gain);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

function ensureHtmlBeep(): HTMLAudioElement {
  if (htmlAudio) return htmlAudio;
  const sampleRate = 22050;
  const duration = 0.45;
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 10) * Math.max(0, 1 - t / duration);
    const sample = Math.sin(2 * Math.PI * 880 * t) * env * 0.7;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }
  htmlAudio = new Audio(URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' })));
  htmlAudio.volume = 0.9;
  return htmlAudio;
}

async function playHtmlFallback(): Promise<boolean> {
  try {
    const audio = ensureHtmlBeep();
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function clearPlaybackTimers(): void {
  if (loopTimer != null) {
    window.clearInterval(loopTimer);
    loopTimer = null;
  }
  if (stopEnvelopeTimer != null) {
    window.clearTimeout(stopEnvelopeTimer);
    stopEnvelopeTimer = null;
  }
}

function scheduleMotifNow(): void {
  const ctx = audioCtx;
  const gain = masterGain;
  if (!ctx || !gain || !playing) return;
  playMotif(ctx, gain, ctx.currentTime + 0.02);
}

function startLoop(): void {
  clearPlaybackTimers();
  loopTimer = window.setInterval(() => {
    if (!playing) return;
    scheduleMotifNow();
    void playHtmlFallback();
  }, 7000);
}

async function startAudioPlayback(): Promise<boolean> {
  const htmlOk = await playHtmlFallback();
  if (htmlOk) {
    if (!playing) {
      playing = true;
      pending = false;
      startLoop();
      notify();
    }
    const ctx = await unlockContext();
    if (ctx && masterGain) {
      scheduleMotifNow();
    }
    return true;
  }

  const ctx = await unlockContext();
  if (ctx && masterGain) {
    if (!playing) {
      playing = true;
      pending = false;
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(0.55, ctx.currentTime);
      scheduleMotifNow();
      startLoop();
      notify();
    } else {
      scheduleMotifNow();
    }
    return true;
  }

  pending = true;
  playing = false;
  notify();
  return false;
}

export async function syncReminderDueAudio(rows: ReminderAudioRow[]): Promise<AudioState> {
  const now = Date.now();
  const eligible = rows.filter((r) => {
    if (!r.dueAt) return false;
    const dueMs = new Date(r.dueAt).getTime();
    return Number.isFinite(dueMs) && now >= dueMs;
  });

  activeAlertIds = eligible.map((r) => asIdKey(r.id));
  const alertableRows = eligible.filter((r) => !readMutedIds().has(asIdKey(r.id)));
  const alertableKeys = alertableRows.map(rowAlarmKey);

  if (alertableRows.length === 0) {
    pendingAlarmRows = [];
    showBar = false;
    stopReminderOverdueAudio({ muteActive: false });
    return snapshot();
  }

  pendingAlarmRows = alertableRows.map((r) => ({
    id: r.id,
    title: r.title,
    dueAt: r.dueAt,
  }));

  detailLabel =
    alertableRows.length === 1
      ? alertableRows[0]?.title || 'Reminder alarm'
      : `${alertableRows.length} reminder alarms`;
  showBar = true;
  notify();

  const needStart = alertableKeys.some((key) => !triggeredIds.has(key));
  if (needStart || pending) {
    const started = await startAudioPlayback();
    if (started && playing) {
      markAlarmTriggered(alertableKeys);
      pendingAlarmRows = [];
    }
  }

  return snapshot();
}

export function stopReminderOverdueAudio(options?: { muteActive?: boolean }): void {
  if (options?.muteActive !== false && activeAlertIds.length > 0) {
    const muted = readMutedIds();
    for (const id of activeAlertIds) muted.add(id);
    writeMutedIds(muted);
    pendingAlarmRows = [];
  }

  clearPlaybackTimers();
  pending = false;
  showBar = false;

  if (htmlAudio) {
    try {
      htmlAudio.pause();
      htmlAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  const ctx = audioCtx;
  const gain = masterGain;
  if (ctx && gain) {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.001), t);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.2);
    stopEnvelopeTimer = window.setTimeout(() => {
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(0.55, audioCtx.currentTime);
      }
    }, 250);
  }

  playing = false;
  notify();
}

/** Retry after user clicks anywhere (browser autoplay unlock). */
export function unlockReminderOverdueAudioOnGesture(): void {
  void (async () => {
    await unlockContext();
    try {
      const audio = ensureHtmlBeep();
      audio.volume = 0.01;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.9;
    } catch {
      /* still blocked until explicit Enable sound */
    }
    if (pendingAlarmRows.length > 0) {
      await syncReminderDueAudio(pendingAlarmRows);
      return;
    }
    if (watchedReminders.length > 0) {
      processReminderAlarms(watchedReminders);
    }
  })();
}

export function isReminderOverdueAudioMuted(id: number | string): boolean {
  return readMutedIds().has(asIdKey(id));
}

/** Stop alarm for one reminder and suppress replay until session ends or snooze clears it. */
export function muteReminderAlarm(id: number | string): void {
  const muted = readMutedIds();
  muted.add(asIdKey(id));
  writeMutedIds(muted);
  stopReminderOverdueAudio({ muteActive: false });
}

export function clearReminderAlarmMute(id: number | string): void {
  const muted = readMutedIds();
  muted.delete(asIdKey(id));
  writeMutedIds(muted);
}
