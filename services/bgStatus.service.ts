import { projectDatesApi } from './api';
import type {
  BgStatusBundle,
  BGEntry,
  CreateBGPayload,
  UpdateBGPayload,
} from '../types/bgStatus';

export const getBGStatusBundle = async (projectName: string): Promise<BgStatusBundle> => {
  const res = await projectDatesApi.getBgStatusBundle(projectName);
  return res.data;
};

export const createBG = async (
  projectName: string,
  payload: CreateBGPayload,
): Promise<BGEntry | null> => {
  const res = await projectDatesApi.createBgEntry(projectName, payload);
  return res.data ?? null;
};

export const updateBG = async (
  id: number,
  payload: UpdateBGPayload,
): Promise<BGEntry | null> => {
  const res = await projectDatesApi.patchBgEntry(id, payload);
  return res.data ?? null;
};

export const deleteBG = async (id: number): Promise<void> => {
  await projectDatesApi.deleteBgEntry(id);
};
