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
  // Queue for ICE candidates that arrive before remote description is set
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([])
  const hasRemoteDescriptionRef = useRef(false)
  // Track if we've explicitly closed to prevent reconnection attempts
  const isClosedRef = useRef(false)
  // Track if WebSocket connection has been initialized
  const initializedRef = useRef(false)

  // Store callbacks in refs so they don't trigger effect re-runs
  const createOfferRef = useRef(createOffer)
  const createAnswerRef = useRef(createAnswer)
  const setRemoteDescriptionRef = useRef(setRemoteDescription)
  const addIceCandidateRef = useRef(addIceCandidate)
  const onMatchEndedRef = useRef(onMatchEnded)

  // Update refs when props change
  useEffect(() => {
    createOfferRef.current = createOffer
    createAnswerRef.current = createAnswer
    setRemoteDescriptionRef.current = setRemoteDescription
    addIceCandidateRef.current = addIceCandidate
    onMatchEndedRef.current = onMatchEnded
  }, [createOffer, createAnswer, setRemoteDescription, addIceCandidate, onMatchEnded])

  // Send end match signal to peer
  const sendEndMatch = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "end_match" }))
    }
  }, [])

  useEffect(() => {
    // Only initialize once when all required props are available
    if (!enabled || !matchId || !peerId || !peerConnection) return
    if (initializedRef.current) return // Prevent double initialization
    
    initializedRef.current = true

    // Reset state for new connection
    isClosedRef.current = false
    hasRemoteDescriptionRef.current = false
    iceCandidateQueueRef.current = []

    // Derive WebSocket URL
    // In development (local npm run dev), use nginx at wss://localhost
    // In production (Docker), use current location
    let socketUrl: string
    if (process.env.NODE_ENV === 'development') {
      // Local dev: connect through nginx
      socketUrl = `wss://localhost/ws/signaling/match/${matchId}`
    } else {
      // Production: use current location
      const { protocol, host } = window.location
      const wsBase = protocol === "https:" ? "wss" : "ws"
      socketUrl = `${wsBase}://${host}/ws/signaling/match/${matchId}`
    }

    const socket = new WebSocket(socketUrl)
    socketRef.current = socket

    // Helper to safely send WebSocket messages
    const safeSend = (data: object) => {
      if (socket.readyState === WebSocket.OPEN && !isClosedRef.current) {
        socket.send(JSON.stringify(data))
      }
    }

    // Process queued ICE candidates after remote description is set
    const processIceCandidateQueue = async () => {
      const queue = [...iceCandidateQueueRef.current]
      iceCandidateQueueRef.current = []
      
      for (const candidate of queue) {
        try {
          await addIceCandidateRef.current(candidate)
        } catch (err) {
          console.warn("Failed to add queued ICE candidate:", err)
        }
      }
    }

    socket.onopen = () => {
      if (isClosedRef.current) return
      safeSend({
        event: "client_ready",
        peerId,
        role,
      })
    }

    socket.onmessage = async (event) => {
      if (isClosedRef.current) return
      
      try {
        const data = JSON.parse(event.data)

        if (data.event === "room_ready") {
          if (role === "host") {
            const offer = await createOfferRef.current()
            safeSend({ type: "offer", sdp: offer.sdp })
          }
          return
        }

        // Handle match ended by peer
        if (data.event === "match_ended") {
          onMatchEndedRef.current?.(data.reason || "peer_ended")
          return
        }

        if (data.type === "offer" && role === "guest") {
          await setRemoteDescriptionRef.current({ type: "offer", sdp: data.sdp })
          hasRemoteDescriptionRef.current = true
          // Process any queued ICE candidates
          await processIceCandidateQueue()
          const answer = await createAnswerRef.current({ type: "offer", sdp: data.sdp })
          safeSend({ type: "answer", sdp: answer.sdp })
        }

        if (data.type === "answer" && role === "host") {
          await setRemoteDescriptionRef.current({ type: "answer", sdp: data.sdp })
          hasRemoteDescriptionRef.current = true
          // Process any queued ICE candidates
          await processIceCandidateQueue()
        }

        if (data.type === "ice-candidate") {
          // Queue ICE candidates if remote description hasn't been set yet
          if (!hasRemoteDescriptionRef.current) {
            iceCandidateQueueRef.current.push(data.candidate)
          } else {
            try {
              await addIceCandidateRef.current(data.candidate)
            } catch (err) {
              console.warn("Failed to add ICE candidate:", err)
            }
          }
        }
      } catch (err) {
        console.error("Failed to process signaling message:", err)
      }
    }

    socket.onerror = (error) => {
      console.error("WebSocket signaling error:", error)
    }

    socket.onclose = () => {
      socketRef.current = null
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && !isClosedRef.current) {
        safeSend({
          type: "ice-candidate",
          candidate: event.candidate,
        })
      }
    }

    return () => {
      isClosedRef.current = true
      initializedRef.current = false
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
      socketRef.current = null
    }
  }, [enabled, matchId, peerId, role, peerConnection])

  return { sendEndMatch }
}
