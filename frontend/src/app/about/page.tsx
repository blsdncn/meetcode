'use client';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Navigation buttons */}
      <div className="w-full max-w-6xl mb-8 flex gap-4">
        <Link href="/">
          <Button variant="outline" size="lg">
            ← Home
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button size="lg">
            Go to Dashboard →
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-6xl w-full">
        {/* Left: Logo Animation Placeholder (video to be updated) */}
        <div className="w-full aspect-video flex items-center justify-center bg-muted rounded-lg shadow-lg">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4 animate-spin-slow">
              <Image
                src="/meet2code.png"
                alt="MeetCode Logo"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-muted-foreground">Demo video coming soon</p>
          </div>
        </div>

        {/* Right: Heading and Paragraph */}
        <div className="w-full">
          <h1 className="text-4xl font-bold mb-4">About Us</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Meet2Code is a collaborative platform that allows users to practice solving LeetCode problems together.
            Create an account, select preferences, and start matchmaking to improve at coding in real time!
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground mt-4">
            Features include real-time video chat, collaborative code editing, and curated problem selection based on your preferences.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;