'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ContactPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to about page since contact form is disabled
    router.replace('/about');
  }, [router]);

  return (
    <section className="w-full min-h-screen flex items-center justify-center bg-background py-12">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </section>
  );
}