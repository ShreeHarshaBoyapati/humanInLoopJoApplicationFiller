import { axiosInstance } from '../utils/axios.ts';
import type {
  ApiResponse,
  DashboardResponse,
  DashboardRange,
  OnboardingResponse,
  UpdateWeeklyGoalInput,
  WeeklyGoalResponse,
} from '@repo/shared-types';

export const getOnboarding = async (): Promise<OnboardingResponse> => {
  const response =
    await axiosInstance.get<ApiResponse<OnboardingResponse>>('/dashboard/onboarding');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to fetch onboarding status');
  }
  return response.data.data;
};

export interface DashboardQueryParams {
  range: DashboardRange;
  topAtsLimit?: number;
  eventsLimit?: number;
}

export const getDashboard = async (params: DashboardQueryParams): Promise<DashboardResponse> => {
  const response = await axiosInstance.get<ApiResponse<DashboardResponse>>('/dashboard', {
    params: {
      range: params.range,
      topAtsLimit: params.topAtsLimit ?? 5,
      eventsLimit: params.eventsLimit ?? 5,
    },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to fetch dashboard');
  }
  return response.data.data;
};

export const getWeeklyGoal = async (): Promise<WeeklyGoalResponse> => {
  const response = await axiosInstance.get<ApiResponse<WeeklyGoalResponse>>('/weekly-goal');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to fetch weekly goal');
  }
  return response.data.data;
};

export const updateWeeklyGoal = async (
  input: UpdateWeeklyGoalInput
): Promise<WeeklyGoalResponse> => {
  const response = await axiosInstance.put<ApiResponse<WeeklyGoalResponse>>('/weekly-goal', input);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to update weekly goal');
  }
  return response.data.data;
};
