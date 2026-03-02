import { useState, useEffect, useCallback } from 'react';
import { FirestoreService } from '../services/firestore.service';

export interface UseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (data: Partial<Omit<T, 'id'>>) => Promise<void>;
}

export function useDocument<T extends { id?: string }>(
  collectionName: string,
  documentId: string | null
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const service = new FirestoreService<T>(collectionName);

  const fetchData = useCallback(async () => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const doc = await service.getById(documentId);
      setData(doc);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching document ${documentId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const update = useCallback(async (updateData: Partial<Omit<T, 'id'>>) => {
    if (!documentId) throw new Error('No document ID provided');
    await service.update(documentId, updateData);
    await fetchData(); // Refresh data
  }, [service, documentId, fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    update,
  };
}

