'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export default function Home() {
	const { data: session, status } = useSession();
	const isLoggedIn = status === 'authenticated' && !!session;

	return (
		<main className="flex flex-col items-center justify-center text-center min-h-screen px-6">
            <div className="relative w-28 h-28 mb-4 animate-spin-slow">
                <Image
                    src="/meet2code.png"
                    alt="MeetCode Logo"
                    fill
                    className="object-contain"
                />
            </div>

			<h1 className="text-4xl md:text-6xl font-bold mb-4">MeetCode</h1>
            
			<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-6">
                Looking for a pair programmer or technical interview prep?
                <br />
                MeetCode instantly matches you with someone who shares your coding interests so you can share ideas, tackle challenges, and grow together.
			</p>

			<div className="flex gap-4 mb-10">
				<Link href={isLoggedIn ? "/dashboard" : "/signup"}>
					<Button size="lg">{isLoggedIn ? "Go to Dashboard" : "Get Started"}</Button>
				</Link>
				<Link href="/about">
					<Button variant="outline" size="lg">Learn More</Button>
				</Link>
			</div>

			<div className="w-full max-w-4xl rounded-lg border-[3px] border-border p-6 bg-background">
				<h2 className="text-xl font-semibold mb-2">How it works</h2>
				<ul className="text-left text-sm md:text-base space-y-2 list-disc list-inside text-muted-foreground">
					<li>Select your programming language and problem type</li>
					<li>Get instantly paired with someone compatible</li>
					<li>Code together, solve problems, and grow together</li>
				</ul>
			</div>

            <p className="text-sm text-muted-foreground mt-10">Built with Python, Next.js, Tailwind CSS, FastAPI, PostgreSQL, and ❤️</p>
		</main>
	);
}