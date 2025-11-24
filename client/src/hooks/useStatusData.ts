import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface StatusUpdate {
  id: number;
  userId: number;
  username: string;
  content: string;
  createdAt: string;
  media: string | null;
  mediaType: string | null;
  musicUrl: string | null;
  duration: number;
  backgroundColor: string | null;
}

export interface ViewedStatusIdsResponse {
  viewedStatusIds: number[];
}

export function useStatusData() {
  const { user } = useAuth();

  const { data: viewedStatusIds = [] } = useQuery<ViewedStatusIdsResponse, Error, number[]>({
    queryKey: ['/api/status/my-views'],
    select: (data) => data.viewedStatusIds || [],
    enabled: !!user,
    staleTime: 0,
  });

  const { data: myStatuses = [] } = useQuery<StatusUpdate[]>({
    queryKey: ['/api/status/mine'],
    enabled: !!user,
    staleTime: 10 * 1000,
  });

  const { data: activeStatuses = [], isLoading: isLoadingStatuses } = useQuery<StatusUpdate[]>({
    queryKey: ['/api/status'],
    staleTime: 10 * 1000,
  });

  return {
    viewedStatusIds,
    myStatuses,
    activeStatuses,
    isLoadingStatuses,
  };
}
