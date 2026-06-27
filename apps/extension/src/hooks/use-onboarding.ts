/**
 * React hook that fetches the dashboard onboarding state from the background.
 * Refetches when relevant resource-change events arrive via `chrome.runtime.onMessage`.
 */

import { useEffect, useState } from 'react';
import type { OnboardingResponse } from '@repo/shared-types';
import { fetchOnboarding } from '../services/dashboard-api.ts';

export interface UseOnboardingResult {
  data: OnboardingResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const REFETCH_RESOURCES = new Set(['apiKey', 'persona', 'resume', 'job', 'event', 'tag']);

export const useOnboarding = (): UseOnboardingResult => {
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchOnboarding()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.error ?? 'Failed to fetch onboarding');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch onboarding');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return undefined;
    const handler = (message: { action?: string; payload?: { resource?: string } }) => {
      if (message?.action !== 'RESOURCE_CHANGED') return;
      const resource = message.payload?.resource;
      if (resource && REFETCH_RESOURCES.has(resource)) {
        setTick((prev) => prev + 1);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, []);

  return { data, isLoading, error, refetch: () => setTick((prev) => prev + 1) };
};
