import { useEffect, useState, useCallback } from 'react';
import { apiGet, errorMessage } from '../services/api';

/** Fetch helper: returns { data, loading, error, reload } */
export default function useApi(path, params) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const key = JSON.stringify(params || {});
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiGet(path, params)
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((e) => live && setState({ data: null, loading: false, error: errorMessage(e) }));
    return () => { live = false; };
    // eslint-disable-next-line
  }, [path, key, tick]);
  return { ...state, reload };
}
