"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";

export type UseApiResourceOptions<T> = {
  resourceKey: string;
  loader: () => Promise<T>;
  enabled?: boolean;
};

export type UseApiResourceResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  runMutation: <R>(fn: () => Promise<R>) => Promise<R | null>;
};

export function useApiResource<T>({
  resourceKey,
  loader,
  enabled = true,
}: UseApiResourceOptions<T>): UseApiResourceResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const generationRef = useRef(0);

  const reload = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    try {
      const next = await loaderRef.current();
      if (generation !== generationRef.current) return;
      setData(next);
    } catch (err) {
      if (generation !== generationRef.current) return;
      setError(apiErrorMessage(err, "Failed to load data"));
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, [resourceKey]);

  useEffect(() => {
    generationRef.current += 1;
    setData(null);
    setError(null);
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
  }, [resourceKey, enabled, reload]);

  const runMutation = useCallback(
    async <R,>(fn: () => Promise<R>): Promise<R | null> => {
      setError(null);
      try {
        const result = await fn();
        await reload();
        return result;
      } catch (err) {
        setError(apiErrorMessage(err, "Action failed"));
        return null;
      }
    },
    [reload],
  );

  return { data, loading, error, reload, runMutation };
}
