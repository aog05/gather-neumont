import { useState, useEffect, useCallback } from 'react';
import { FirestoreService, QueryOptions } from '../services/firestore.service';

export interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (item: Omit<T, 'id'>) => Promise<string>;
  update: (id: string, item: Partial<Omit<T, 'id'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCollection<T extends { id?: string }>(
  collectionName: string,
  options?: QueryOptions
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const service = new FirestoreService<T>(collectionName);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await service.getAll(options);
      setData(items);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching ${collectionName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = useCallback(async (item: Omit<T, 'id'>) => {
    const id = await service.create(item);
    await fetchData(); // Refresh data
    return id;
  }, [service, fetchData]);

  const update = useCallback(async (id: string, item: Partial<Omit<T, 'id'>>) => {
    await service.update(id, item);
    await fetchData(); // Refresh data
  }, [service, fetchData]);

  const remove = useCallback(async (id: string) => {
    await service.delete(id);
    await fetchData(); // Refresh data
  }, [service, fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    create,
    update,
    remove,
  };
}

