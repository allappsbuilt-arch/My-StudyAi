/**
 * useApi - load data from the backend with loading / error / reload handling.
 *
 *   const { data, loading, error, reload, setData } = useApi(() => notesApi.list(), []);
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api';

export function useApi(fetcher, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current && id === requestId.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current && id === requestId.current) setError(getErrorMessage(err));
      return null;
    } finally {
      if (mounted.current && id === requestId.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    if (immediate) run();
  }, [run, immediate]);

  return { data, loading, error, reload: run, setData };
}
