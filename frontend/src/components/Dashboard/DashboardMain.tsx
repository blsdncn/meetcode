"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Streak from "@/components/Dashboard/Streak";
import CategoryChart from "@/components/Dashboard/CategoryChart";
import MatchHistory from "@/components/Dashboard/MatchHistory";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import useDashboardData from "@/hooks/useDashboardData";
import api, { getApiErrorMessage } from "@/lib/api";

export default function DashboardMain() {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserId() {
      if (session?.accessToken) {
        try {
          const response = await api.get('user-auth/users/me');
          console.log("User data:", response.data);
          setUserId(response.data.id);
          setUsername(response.data.username);
        } catch (error: unknown) {
          console.error("Failed to fetch user ID:", getApiErrorMessage(error));
        }
      }
    }
    fetchUserId();
  }, [session?.accessToken]);

  const { streak, categories, matchHistory, loading } = useDashboardData(
    userId || "",
    session?.accessToken || ""
  );

  if (status === "loading") {
    return <p className="text-foreground text-center mt-10">Loading...</p>;
  }

  if (status === "unauthenticated") {
    return (
      <p className="text-destructive text-center mt-10">
        Please sign in to view your dashboard.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-foreground text-center mt-10">Loading dashboard...</p>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-6">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center md:text-left">
          Welcome, <span className="text-accent">{username || 'User'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-6 md:col-span-2">
            <Streak streak={streak ?? 0} />
            <CategoryChart categories={categories} />
          </div>

          <div className="flex flex-col gap-6 max-h-[500px]">
            <div className="overflow-y-auto flex-1">
              <MatchHistory matchHistory={matchHistory as { match_id: string; problem?: { problem_id?: string; categories?: string[] }; status: boolean; }[]} />
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-10 mb-20 sticky bottom-24">
          <Link href="/matchmaking">
            <Button
              size="lg"
              className="text-3xl font-extrabold px-20 py-8 rounded-2xl"
            >
              Find Match
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
