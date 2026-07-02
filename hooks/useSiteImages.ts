import { useCallback, useEffect, useState } from 'react';
import type { SiteImageRecord } from '../types';
import { getApiErrorMessage, normalizeSiteImageList, siteImagesApi } from '../services/api';

export function useSiteImages(projectName: string | undefined, month: number, year: number) {
  const [images, setImages] = useState<SiteImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!projectName?.trim()) {
      setImages([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await siteImagesApi.getByProjectMonthYear(projectName.trim(), month, year);
      const payload = response.data?.data ?? response.data;
      setImages(normalizeSiteImageList(payload, projectName.trim()));
    } catch (err) {
      setImages([]);
      setError(getApiErrorMessage(err, 'Unable to load site photos.'));
    } finally {
      setIsLoading(false);
    }
  }, [projectName, month, year]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return { images, isLoading, error, refresh: fetchImages, setImages };
}
