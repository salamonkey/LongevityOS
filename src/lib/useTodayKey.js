import { useEffect, useState } from 'react';

// A string that changes exactly once per calendar day (local time zone).
// Use it as an extra dependency on any useMemo/useEffect that derives
// due/soon/overdue buckets from "today" (dashboard sections, the body map,
// timeline rails, Gantt columns, ...). Without it, those memos only
// recompute when their own data changes -- a screen left mounted overnight
// (a backgrounded PWA tab, a laptop that slept and woke up) keeps showing
// yesterday's bucketing until something unrelated forces a re-render.
export function useTodayKey() {
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());

  useEffect(() => {
    const checkForNewDay = () => {
      const key = new Date().toDateString();
      setTodayKey((previous) => (previous === key ? previous : key));
    };

    // The interval alone won't fire while the tab/device is asleep, so also
    // re-check the moment it wakes up or regains focus -- the actual moment
    // a stale "today" would otherwise get noticed.
    const intervalId = setInterval(checkForNewDay, 60000);
    document.addEventListener('visibilitychange', checkForNewDay);
    window.addEventListener('focus', checkForNewDay);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', checkForNewDay);
      window.removeEventListener('focus', checkForNewDay);
    };
  }, []);

  return todayKey;
}
