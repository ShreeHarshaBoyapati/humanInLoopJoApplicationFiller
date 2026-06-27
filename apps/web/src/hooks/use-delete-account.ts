import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
import type { ApiResponse } from '@repo/shared-types';

export const useDeleteAccount = () => {
  return useMutation<ApiResponse, Error, undefined>({
    mutationFn: async () => {
      const response = await axiosInstance.delete<ApiResponse>('/user');
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete account');
      }
      return response.data;
    },
  });
};
