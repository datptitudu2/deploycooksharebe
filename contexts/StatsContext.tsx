import React, { createContext, useContext, useState, useCallback } from 'react';
import { achievementService } from '@/services';

interface Stats {
  level: number;
  points: number;
  currentStreak: number;
  longestStreak: number;
  totalMealsCooked: number;
  totalRecipesCreated: number;
  totalViews: number;
  totalLikes: number;
  averageRating: number;
  badgesCount: number;
}

interface StatsContextType {
  stats: Stats | null;
  loadStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const response = await achievementService.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  return (
    <StatsContext.Provider value={{ stats, loadStats, refreshStats }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
}

