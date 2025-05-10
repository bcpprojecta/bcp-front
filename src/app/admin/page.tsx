'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRootPage() {
    const router = useRouter();

    useEffect(() => {
        // Immediately redirect to the admin dashboard
        router.replace('/admin/dashboard');
    }, [router]);

    // Optional: Render a loading state or null while redirecting
    // This content will likely not be seen as redirect should be very fast.
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
            backgroundColor: '#f0f2f5'
        }}>
            Redirecting to Admin Dashboard...
        </div>
    );
} 