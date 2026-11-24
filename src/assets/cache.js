import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "./utils";

const store = new Map();
const inflight = new Map();

export const clearCache = () => store.clear();
export const invalidate = (prefix) => [...store.keys()].forEach((key) => key.startsWith(prefix) && store.delete(key));

export function cached(key, loader, force = false) {
  if (!force && store.has(key)) return Promise.resolve(store.get(key));
  if (!force && inflight.has(key)) return inflight.get(key);
  const request = loader().then((result) => (store.set(key, result), result)).finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

export function useCached(key, loader, { onError, fallback = "Could not load data.", enabled = true } = {}) {
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const reported = useRef(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(async (force = false) => {
    setFailed(false);
    try {
      await cached(key, () => loaderRef.current(), force);
      if (reported.current) (reported.current = false, onError?.(""));
    } catch (error) {
      setFailed(true);
      reported.current = true;
      onError?.(getErrorMessage(error, fallback));
    } finally {
      setTick((t) => t + 1);
    }
  }, [key]);

  useEffect(() => { if (enabled && !store.has(key)) load(); }, [enabled, key, load]);

  const mutate = (updater) => (store.set(key, updater(store.get(key))), setTick((t) => t + 1));
  return { data: store.get(key), loading: enabled && !store.has(key) && !failed, reload: () => load(true), mutate };
}
