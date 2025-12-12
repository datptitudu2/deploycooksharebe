import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Redirect to the tab version of meal planning
 * This file exists to handle navigation from notifications/push notifications
 * that use the /meal-planning route, redirecting to the tab version
 */
export default function MealPlanningRedirect() {
  const params = useLocalSearchParams();
  
  useEffect(() => {
    // Redirect to tab version with any params
    router.replace({
      pathname: '/(tabs)/meal-planning',
      params: params as any,
    });
  }, []);

  return null;
}
