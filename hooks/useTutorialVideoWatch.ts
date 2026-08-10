import { useCallback, useEffect, useState } from 'react';
import {
  getTutorialVideosErrorMessage,
  invalidateTutorialVideosSection,
  tutorialVideosApi,
  type TutorialVideo,
} from '../services/tutorialVideosApi';
import type { TutorialSectionKey } from '../utils/tutorialVideosSections';
import { isAbortError } from '../utils/isAbortError';
import { subscribeTutorialSectionUpdated } from '../utils/tutorialVideosEvents';

function belongsToSection(video: TutorialVideo, section: TutorialSectionKey): boolean {
  return String(video.section || '').toLowerCase() === section.toLowerCase();
}

export function useTutorialVideoWatch(
  section: TutorialSectionKey,
  /** Bump when panel learns a video became ready so the header button appears. */
  refreshKey?: string | number,
) {
  const [readyVideo, setReadyVideo] = useState<TutorialVideo | null>(null);
  const [checking, setChecking] = useState(true);

  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerTitle, setPlayerTitle] = useState('');
  const [playerDescription, setPlayerDescription] = useState('');
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const loadReadyVideo = useCallback(async (signal?: AbortSignal) => {
    setChecking(true);
    try {
      const result = await tutorialVideosApi.getTutorialVideos(section, {
        page: 1,
        page_size: 20,
        ordering: '-created_at',
      });
      if (signal?.aborted) return;
      const ready =
        result.data.find(
          (v) =>
            belongsToSection(v, section) &&
            String(v.status).toLowerCase() === 'ready',
        ) ?? null;
      setReadyVideo(ready);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      setReadyVideo(null);
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }, [section]);

  useEffect(() => {
    const controller = new AbortController();
    invalidateTutorialVideosSection(section);
    void loadReadyVideo(controller.signal);
    return () => controller.abort();
  }, [section, loadReadyVideo, refreshKey]);

  useEffect(() => {
    return subscribeTutorialSectionUpdated(section, () => {
      invalidateTutorialVideosSection(section);
      void loadReadyVideo();
    });
  }, [section, loadReadyVideo]);

  const openPlayerForVideo = useCallback(async (video: TutorialVideo) => {
    setPlayerOpen(true);
    setPlayerTitle(video.title);
    setPlayerDescription(video.description || '');
    setPlayerUrl(null);
    setPlayerError(null);
    setPlayerLoading(true);
    try {
      const playback = await tutorialVideosApi.getTutorialVideoPlaybackUrl(video.id);
      setPlayerUrl(playback.video_url);
      if (playback.title) setPlayerTitle(playback.title);
    } catch (err) {
      setPlayerError(
        getTutorialVideosErrorMessage(err, 'Unable to open tutorial video.'),
      );
    } finally {
      setPlayerLoading(false);
    }
  }, []);

  const openPlayer = useCallback(async () => {
    if (!readyVideo) return;
    await openPlayerForVideo(readyVideo);
  }, [readyVideo, openPlayerForVideo]);

  const closePlayer = useCallback(() => {
    setPlayerOpen(false);
    setPlayerUrl(null);
    setPlayerError(null);
    setPlayerDescription('');
  }, []);

  return {
    readyVideo,
    checking,
    openPlayer,
    openPlayerForVideo,
    refresh: loadReadyVideo,
    playerOpen,
    playerTitle,
    playerDescription,
    playerUrl,
    playerLoading,
    playerError,
    closePlayer,
  };
}
