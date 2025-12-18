import { useState, useEffect, useMemo } from 'react';
import { useApplications } from './useApplications';
import { apiClient } from '../api/client';

/**
 * Hook to calculate overall progress across ALL applications
 * Progress is calculated based on verified documents only
 */
export function useOverallProgress() {
  const { applications, isLoading: appsLoading } = useApplications({ autoFetch: true });
  const [checklists, setChecklists] = useState<Record<string, any>>({});
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);

  // Fetch checklists for all applications
  useEffect(() => {
    if (appsLoading || applications.length === 0) {
      setChecklists({});
      return;
    }

    const fetchAllChecklists = async () => {
      setIsLoadingChecklists(true);
      const checklistsMap: Record<string, any> = {};

      try {
        await Promise.all(
          applications.map(async (app) => {
            try {
              const response = await apiClient.getDocumentChecklist(app.id);
              if (response.success && response.data) {
                checklistsMap[app.id] = response.data;
              }
            } catch (error) {
              console.error(`Failed to fetch checklist for application ${app.id}:`, error);
            }
          })
        );
        setChecklists(checklistsMap);
      } catch (error) {
        console.error('Error fetching checklists:', error);
      } finally {
        setIsLoadingChecklists(false);
      }
    };

    fetchAllChecklists();
  }, [applications, appsLoading]);

  // Calculate overall progress based on verified documents only
  const overallProgress = useMemo(() => {
    if (applications.length === 0) return 0;

    let totalDocuments = 0;
    let verifiedDocuments = 0;

    applications.forEach((app) => {
      const checklist = checklists[app.id];
      if (checklist?.items && Array.isArray(checklist.items)) {
        const items = checklist.items;
        totalDocuments += items.length;
        verifiedDocuments += items.filter((item: any) => item.status === 'verified').length;
      }
    });

    if (totalDocuments === 0) return 0;
    return Math.round((verifiedDocuments / totalDocuments) * 100);
  }, [applications, checklists]);

  return {
    overallProgress,
    isLoading: appsLoading || isLoadingChecklists,
    totalApplications: applications.length,
  };
}

