import { useState, useCallback } from 'react';
import {
  getBGStatusBundle,
  createBG,
  updateBG,
  deleteBG,
} from '../services/bgStatus.service';
import type {
  BgStatusBundle,
  CreateBGPayload,
  UpdateBGPayload,
} from '../types/bgStatus';
import { emptyBgStatusBundle } from '../utils/bgStatusDisplay';
import { getApiErrorMessage } from '../services/api';

export const useBGStatus = (projectName: string) => {
  const [bundle, setBundle] = useState<BgStatusBundle>(emptyBgStatusBundle());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectName) return emptyBgStatusBundle();
    setLoading(true);
    setError(null);
    try {
      const data = await getBGStatusBundle(projectName);
      setBundle(data);
      return data;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load BG status.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  const create = useCallback(
    async (payload: CreateBGPayload) => {
      const entry = await createBG(projectName, payload);
      await fetchData();
      return entry;
    },
    [projectName, fetchData],
  );

  const edit = useCallback(
    async (id: number, payload: UpdateBGPayload) => {
      const entry = await updateBG(id, payload);
      await fetchData();
      return entry;
    },
    [fetchData],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteBG(id);
      await fetchData();
    },
    [fetchData],
  );

  return {
    bundle,
    loading,
    error,
    fetchData,
    create,
    edit,
    remove,
  };
};
