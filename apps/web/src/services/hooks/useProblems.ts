import { useEffect, useState } from 'react';
import { getProblemBySlug, getProblems } from '../api';

export function useProblems(params:any={}){
  const [data, setData] = useState<{ items: Awaited<ReturnType<typeof getProblems>>; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProblems()
      .then((items) => {
        if (!mounted) return;
        setData({ items, total: items.length });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  return {data, loading}
}

export function useProblem(id?:string){
  const [data, setData] = useState<Awaited<ReturnType<typeof getProblemBySlug>> | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    let mounted = true;
    if (!id) {
      setData(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    getProblemBySlug(id)
      .then((item) => {
        if (!mounted) return;
        setData(item ?? null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  return {data, loading}
}
