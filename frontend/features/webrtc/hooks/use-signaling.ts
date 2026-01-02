"use client"

import { useEffect, useRef, useCallback } from "react"

interface UseSignalingProps {
  enabled: boolean
  matchId: string
  peerId: string
  role: string
  peerConnection: RTCPeerConnection | null
  createOffer: () => Promise<RTCSessionDescriptionInit>
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>
  setRemoteDescription: (desc: RTCSessionDescriptionInit) => Promise<void>
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  onMatchEnded?: (reason: string) => void
}

export function useSignaling({
  enabled,
  matchId,
  peerId,
  role,
  peerConnection,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
  onMatchEnded,
}: UseSignalingProps) {
  const socketRef = useRef<WebSocket | null>(null)

  // Send end match signal to peer
  const sendEndMatch = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "end_match" }))
    }
  }, [])

  useEffect(() => {
    if (!enabled || !matchId || !peerId || !peerConnection) return

    // Derive WebSocket URL from current location
    const { protocol, host } = window.location
    const wsBase = protocol === "https:" ? "wss" : "ws"
    const socketUrl = `${wsBase}://${host}/ws/signaling/match/${matchId}`

    const socket = new WebSocket(socketUrl)
    socketRef.current = socket

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          event: "client_ready",
          peerId,
          role,
        }),
      )
    }

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.event === "room_ready") {
          if (role === "host") {
            const offer = await createOffer()
            socket.send(JSON.stringify({ type: "offer", sdp: offer.sdp }))
          }
          return
        }

        // Handle match ended by peer
        if (data.event === "match_ended") {
          onMatchEnded?.(data.reason || "peer_ended")
          return
        }

        if (data.type === "offer" && role === "guest") {
          await setRemoteDescription({ type: "offer", sdp: data.sdp })
          const answer = await createAnswer({ type: "offer", sdp: data.sdp })
          socket.send(JSON.stringify({ type: "answer", sdp: answer.sdp }))
        }

        if (data.type === "answer" && role === "host") {
          await setRemoteDescription({ type: "answer", sdp: data.sdp })
        }

        if (data.type === "ice-candidate") {
          await addIceCandidate(data.candidate)
        }
      } catch (err) {
        console.error("Failed to process signaling message:", err)
      }
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
          }),
        )
      }
    }

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [
    enabled,
    matchId,
    peerId,
    role,
    peerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    onMatchEnded,
  ])

  return { sendEndMatch }
}
