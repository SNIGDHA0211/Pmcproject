import {
  tutorialVideosApi,
  type TutorialVideo,
} from '../services/tutorialVideosApi';
import type { TutorialSectionKey } from './tutorialVideosSections';

const POLL_INTERVAL_MS = 4000;
const POLL_INITIAL_DELAY_MS = 4000;
/** Align with backend stuck sweeper (~15 min) + small buffer. */
const POLL_MAX_ATTEMPTS = 240; // ~16 minutes at 4s intervals
const BACKEND_TIMEOUT_MESSAGE =
  'Processing timed out after 15 minutes. Delete and re-upload a smaller/compressed MP4, or Retry if temp file remains.';

type PollSubscriber = (video: TutorialVideo) => void;

type PollEntry = {
  section: TutorialSectionKey;
  timerId: number | null;
  attempts: number;
  inFlight: boolean;
  lastPollAt: number;
  subscribers: Set<PollSubscriber>;
};

/** One global poll loop per video id — survives React effect re-runs / remounts. */
const polls = new Map<number, PollEntry>();

function belongsToSection(video: TutorialVideo, section: TutorialSectionKey): boolean {
  return String(video.section || '').toLowerCase() === section.toLowerCase();
}

function clearEntryTimer(entry: PollEntry): void {
  if (entry.timerId != null) {
    window.clearTimeout(entry.timerId);
    entry.timerId = null;
  }
}

function stopPoll(id: number): void {
  const entry = polls.get(id);
  if (!entry) return;
  clearEntryTimer(entry);
  polls.delete(id);
}

function schedulePoll(id: number, delayMs: number): void {
  const entry = polls.get(id);
  if (!entry || entry.subscribers.size === 0) {
    stopPoll(id);
    return;
  }

  clearEntryTimer(entry);
  entry.timerId = window.setTimeout(() => {
    entry.timerId = null;
    void runPollTick(id);
  }, delayMs);
}

async function runPollTick(id: number): Promise<void> {
  const entry = polls.get(id);
  if (!entry || entry.subscribers.size === 0) {
    stopPoll(id);
    return;
  }

  if (entry.inFlight) {
    schedulePoll(id, POLL_INTERVAL_MS);
    return;
  }

  const sinceLastPoll = Date.now() - entry.lastPollAt;
  if (entry.lastPollAt > 0 && sinceLastPoll < POLL_INTERVAL_MS) {
    schedulePoll(id, POLL_INTERVAL_MS - sinceLastPoll);
    return;
  }

  entry.inFlight = true;
  entry.attempts += 1;
  entry.lastPollAt = Date.now();

  try {
    if (entry.attempts > POLL_MAX_ATTEMPTS) {
      const timedOut: TutorialVideo = {
        id,
        title: 'Tutorial',
        description: '',
        section: entry.section,
        section_name: entry.section,
        status: 'failed',
        error_message: BACKEND_TIMEOUT_MESSAGE,
      };
      for (const notify of entry.subscribers) notify(timedOut);
      stopPoll(id);
      return;
    }

    const updated = await tutorialVideosApi.getTutorialVideo(id);
    if (!polls.has(id) || entry.subscribers.size === 0) return;

    if (belongsToSection(updated, entry.section)) {
      for (const notify of entry.subscribers) notify(updated);
    }

    const status = String(updated.status).toLowerCase();
    if (status !== 'processing') {
      stopPoll(id);
      return;
    }
  } catch {
    // Keep polling until timeout
  } finally {
    entry.inFlight = false;
  }

  if (polls.has(id) && entry.subscribers.size > 0) {
    schedulePoll(id, POLL_INTERVAL_MS);
  }
}

function ensurePoll(id: number, section: TutorialSectionKey): PollEntry {
  let entry = polls.get(id);
  if (!entry) {
    entry = {
      section,
      timerId: null,
      attempts: 0,
      inFlight: false,
      lastPollAt: 0,
      subscribers: new Set(),
    };
    polls.set(id, entry);
    schedulePoll(id, POLL_INITIAL_DELAY_MS);
    return entry;
  }

  entry.section = section;
  if (entry.timerId == null && !entry.inFlight) {
    schedulePoll(id, POLL_INTERVAL_MS);
  }
  return entry;
}

/** Subscribe to processing-status updates for one tutorial video id. */
export function subscribeTutorialVideoPoll(
  id: number,
  section: TutorialSectionKey,
  onUpdate: PollSubscriber,
): () => void {
  if (!id) return () => undefined;

  const entry = ensurePoll(id, section);
  entry.subscribers.add(onUpdate);

  return () => {
    entry.subscribers.delete(onUpdate);
    if (entry.subscribers.size === 0) {
      stopPoll(id);
    }
  };
}

/** Stop every active poll (e.g. tests / logout). */
export function stopAllTutorialVideoPolls(): void {
  for (const id of [...polls.keys()]) {
    stopPoll(id);
  }
}
