import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
import type {
  Persona,
  CreatePersonaInput,
  UpdatePersonaInput,
  DeletePersonaInput,
} from '@repo/shared-types';
import type { ApiResponse } from '@repo/shared-types';

const PERSONA_KEYS = {
  all: ['personas'] as const,
  lists: () => [...PERSONA_KEYS.all, 'list'] as const,
};

export interface PaginatedPersonaResponse {
  items: Persona[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const usePersonas = (limit: number = 10, searchQuery: string = '') => {
  return useInfiniteQuery({
    queryKey: [...PERSONA_KEYS.lists(), { search: searchQuery }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<PaginatedPersonaResponse>>('/persona', {
        params: { page: pageParam, limit, search: searchQuery || undefined },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch personas');
      }
      return response.data.data;
    },
    getNextPageParam: (lastPage: PaginatedPersonaResponse) => {
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
    getPreviousPageParam: (firstPage: PaginatedPersonaResponse) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
  });
};

export const useCreatePersona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePersonaInput) => {
      const response = await axiosInstance.post<ApiResponse<Persona>>('/persona', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to create persona');
      }
      return response.data.data;
    },
    onSuccess: (newPersona: Persona) => {
      // Get all cached persona list queries to check their search parameters
      const cachedQueries = queryClient.getQueriesData({
        queryKey: PERSONA_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on whether the new persona matches its search
      cachedQueries.forEach(([queryKey, data]) => {
        if (!data || typeof data !== 'object') return;

        const cacheData = data as { pages?: PaginatedPersonaResponse[] };
        if (!cacheData.pages || cacheData.pages.length === 0) return;

        const firstPage = cacheData.pages[0];
        if (!firstPage) return;

        const searchParams = queryKey[queryKey.length - 1] as { search?: string } | undefined;
        const searchQuery = searchParams?.search ?? '';

        // Check if persona matches the search query
        const matchesSearch =
          !searchQuery || newPersona.title.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return;

        const limit = firstPage.limit;

        // Collect all items from all pages
        const allItems = cacheData.pages.flatMap((page) => page.items);

        let updatedItems: Persona[];
        if (searchQuery) {
          // If there's a search query, add new persona at the front
          updatedItems = [newPersona, ...allItems];
        } else {
          // If no search query, add new persona after the active persona
          const activeIndex = allItems.findIndex((p) => p.active);
          if (activeIndex === -1) {
            updatedItems = [newPersona, ...allItems];
          } else {
            const newItems = [...allItems];
            newItems.splice(activeIndex + 1, 0, newPersona);
            updatedItems = newItems;
          }
        }

        // Calculate new total and totalPages
        const newTotal = firstPage.total + 1;
        const newTotalPages = Math.ceil(newTotal / limit) || 1;

        // Re-paginate the items
        const newPages: PaginatedPersonaResponse[] = [];
        for (let pageNum = 1; pageNum <= newTotalPages; pageNum++) {
          const start = (pageNum - 1) * limit;
          const end = start + limit;
          const pageItems = updatedItems.slice(start, end);

          newPages.push({
            ...firstPage,
            page: pageNum,
            items: pageItems,
            total: newTotal,
            totalPages: newTotalPages,
          });
        }

        queryClient.setQueryData(queryKey, {
          pages: newPages,
          pageParams: newPages.map((_, index) => index + 1),
        });
      });
    },
  });
};

export const useUpdatePersona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePersonaInput) => {
      const response = await axiosInstance.put<ApiResponse<Persona>>('/persona', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to update persona');
      }
      return response.data.data;
    },
    onSuccess: (updatedPersona: Persona) => {
      queryClient.setQueriesData(
        { queryKey: PERSONA_KEYS.lists() },
        (oldData: { pages: PaginatedPersonaResponse[]; pageParams?: number[] } | undefined) => {
          if (!oldData?.pages) return oldData;
          const updatedPages = oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((p) =>
              p.id === updatedPersona.id ? { ...p, ...updatedPersona } : p
            ),
          }));
          return {
            pages: updatedPages,
            pageParams: oldData.pageParams || updatedPages.map((_, index) => index + 1),
          };
        }
      );
    },
  });
};

export const useDeletePersona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeletePersonaInput) => {
      const response = await axiosInstance.delete('/persona', { data });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete persona');
      }
      return data.id;
    },
    onSuccess: (deletedId: string) => {
      queryClient.setQueriesData(
        { queryKey: PERSONA_KEYS.lists() },
        (oldData: { pages: PaginatedPersonaResponse[]; pageParams?: number[] } | undefined) => {
          if (!oldData?.pages || oldData.pages.length === 0) return oldData;

          const firstPage = oldData.pages[0];
          if (!firstPage) return oldData;

          const limit = firstPage.limit;

          // Collect all items from all pages
          const allItems = oldData.pages.flatMap((page) => page.items);

          // Check if the deleted persona was active
          const deletedWasActive = allItems.some((p) => p.id === deletedId && p.active);

          // Filter out the deleted persona
          const remainingItems = allItems.filter((p) => p.id !== deletedId);

          // Calculate new total and totalPages
          const newTotal = Math.max(0, firstPage.total - 1);
          const newTotalPages = Math.ceil(newTotal / limit) || 1;

          // Re-paginate the remaining items
          const newPages: PaginatedPersonaResponse[] = [];
          for (let pageNum = 1; pageNum <= newTotalPages; pageNum++) {
            const start = (pageNum - 1) * limit;
            const end = start + limit;
            const pageItems = remainingItems.slice(start, end);

            // If this is the first page and deleted was active, set the first item as active
            const updatedPageItems = pageItems.map((item, index) => ({
              ...item,
              active: deletedWasActive && pageNum === 1 && index === 0 ? true : item.active,
            }));

            newPages.push({
              ...firstPage,
              page: pageNum,
              items: updatedPageItems,
              total: newTotal,
              totalPages: newTotalPages,
            });
          }

          return { pages: newPages, pageParams: newPages.map((_, index) => index + 1) };
        }
      );
    },
  });
};

export const useSetActivePersona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.post<ApiResponse<Persona>>('/persona/set-active', {
        id,
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to set active persona');
      }
      return response.data.data;
    },
    onSuccess: (activePersona: Persona) => {
      queryClient.setQueriesData(
        { queryKey: PERSONA_KEYS.lists() },
        (oldData: { pages: PaginatedPersonaResponse[]; pageParams?: number[] } | undefined) => {
          if (!oldData?.pages) return oldData;
          const updatedPages = oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((p) => ({
              ...p,
              active: p.id === activePersona.id,
            })),
          }));
          return {
            pages: updatedPages,
            pageParams: oldData.pageParams || updatedPages.map((_, index) => index + 1),
          };
        }
      );
    },
  });
};
