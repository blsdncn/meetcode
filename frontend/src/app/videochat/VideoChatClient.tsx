"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VideoWindow from '../../../features/webrtc/components/video-window';

export default function VideoChatClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [matchData, setMatchData] = useState<{
    matchId: string;
    peerId: string;
    role: string;
    soloMode: boolean;
  } | null>(null);

  useEffect(() => {
    const matchId = searchParams.get('match_id');
    const peerId = searchParams.get('peer_id');
    const role = searchParams.get('role');
    const mode = searchParams.get('mode');
    const soloMode = mode === 'solo';

    // Solo mode only needs match_id
    if (soloMode && matchId) {
      setMatchData({ matchId, peerId: '', role: 'host', soloMode: true });
      setReady(true);
      return;
    }

    // Normal mode needs all params
    if (!matchId || !peerId || !role) {
      console.error('Missing match data in URL, redirecting...');
      router.push('/matchmaking');
      return;
    }

    setMatchData({ matchId, peerId, role, soloMode: false });
    setReady(true);
  }, [searchParams, router]);

  if (!ready || !matchData) return <p className="text-white">Loading...</p>;

  return (
    <main className="min-h-[calc(100vh-80px)] p-4">
      <VideoWindow
        matchId={matchData.matchId}
        peerId={matchData.peerId}
        role={matchData.role}
        soloMode={matchData.soloMode}
      />
    </main>
  );
}
