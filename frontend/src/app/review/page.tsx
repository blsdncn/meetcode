"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import ReviewForm from "./review-form"

function ReviewContent() {
  const searchParams = useSearchParams()
  
  // Read match information from URL search params
  // Expected URL format: /review?matchId=xxx&hostId=xxx&guestId=xxx&problemUrl=xxx
  const matchId = searchParams.get("matchId")
  const hostId = searchParams.get("hostId")
  const guestId = searchParams.get("guestId")
  const problemUrl = searchParams.get("problemUrl") || "https://leetcode.com/problems/"
  
  // Validate required params
  if (!matchId || !hostId || !guestId) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-md mx-auto p-6 border border-red-200 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Missing Match Information</h2>
          <p className="text-red-600 text-sm">
            This page requires match information to be passed via URL parameters.
          </p>
          <p className="text-red-500 text-xs mt-2">
            Required params: matchId, hostId, guestId
          </p>
        </div>
      </div>
    )
  }
  
  const externalLink = {
    url: problemUrl,
    label: "View problem on LeetCode",
  }
  
  return (
    <div className="container mx-auto py-10 px-4">
      <ReviewForm
        externalLink={externalLink}
        hostId={hostId}
        guestId={guestId}
        matchId={matchId}
      />
    </div>
  )
}

function ReviewLoading() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-md mx-auto p-6 border border-gray-200 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewLoading />}>
      <ReviewContent />
    </Suspense>
  )
}
