'use client';

import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "@/lib/api";

export default function useDashboardData(user_id: string, accessToken: string) {
  const [streak, setStreak] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ name: string; value: number }[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [streakRes, catRes, historyRes] = await Promise.all([
          api.get(`data/users/${user_id}/dashboard`),
          api.get(`data/users/${user_id}/match-categories-count`),
          api.get(`match/history/${user_id}`),
        ]);
        console.log("Streak data:", streakRes.data);
        console.log("Categories data:", catRes.data);
        console.log("Match History data:", historyRes.data);
        setStreak(streakRes.data.streaks?.current_streak ?? 0);
        const catData = Object.entries(catRes.data || {}).map(([key, val]) => ({
          name: key,
          value: val as number,
        }));
        setCategories(catData);
        setMatchHistory(historyRes.data || []);
      } catch (err: unknown) {
        const errorMessage = getApiErrorMessage(err);
        setError(`Failed to load dashboard data: ${errorMessage}`);
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user_id && accessToken) fetchData();
  }, [user_id, accessToken]);

  return { streak, categories, matchHistory, loading, error };
}
