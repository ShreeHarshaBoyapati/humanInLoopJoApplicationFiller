import initializeDataSource from '../data-source.js';
import WeeklyGoal from '../entities/weekly-goal.js';

export default function getWeeklyGoalRepository() {
  return initializeDataSource().getRepository(WeeklyGoal);
}
