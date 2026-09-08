import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook with loading, error, and refetch.
 */
export function useApi(apiFn, deps = [], opts = {}) {
  const [data, setData] = useState(opts.initialData ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetch = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      if (mountedRef.current) setData(res.data);
    } catch (err) {
      if (mountedRef.current) {
        setError(err.response?.data?.message || err.message || 'Something went wrong');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Paginated data hook.
 */
export function usePaginatedApi(apiFn, params = {}, extraDeps = []) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn({ ...params, page: p, limit: params.limit || 25 });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [page, JSON.stringify(params), ...extraDeps]); // eslint-disable-line

  useEffect(() => { fetch(page); }, [fetch]);

  return { data, loading, error, page, setPage, refetch: () => fetch(page) };
}
