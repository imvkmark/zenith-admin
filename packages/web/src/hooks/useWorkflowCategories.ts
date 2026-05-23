import { useCallback, useEffect, useState } from 'react';
import type { WorkflowCategory } from '@zenith/shared';
import { request } from '@/utils/request';

export function useWorkflowCategories() {
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get<WorkflowCategory[]>('/api/workflows/categories/all');
      if (res.code === 0 && res.data) setCategories(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { categories, loading, refetch };
}
