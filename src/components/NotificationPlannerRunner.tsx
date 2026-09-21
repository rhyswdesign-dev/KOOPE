/**
 * NOTIFICATION PLANNER RUNNER
 *
 * Renders nothing. Its only job is to run the frequency governor at the two
 * moments the Notification Playbook (§3 Phase A, step 2) specifies: every app
 * open, and every return to foreground. It lives inside AuthProvider so the
 * planner gets the real user id — `made_events` is what tells the Friday maker
 * prompt whether the user has already made something this week.
 *
 * Mounting this more than once is harmless: the planner is re-entrant-guarded
 * and cancel-and-reschedules its own window.
 */

import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { notificationPlanner } from '../services/notificationPlanner';

export default function NotificationPlannerRunner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  React.useEffect(() => {
    notificationPlanner.run({ userId, reason: 'app_open' }).catch(() => {});

    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        notificationPlanner.run({ userId, reason: 'foreground' }).catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [userId]);

  return null;
}
