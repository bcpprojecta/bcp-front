'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar'; // Import AdminNavbar

interface User {
    id: string;
    email: string;
    user_metadata?: {
        role?: string;
        [key: string]: unknown;
    } | null;
}

// A simple, clean font stack
const fontStack = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

export default function AdminDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyAdmin = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
                const response = await fetch(`${apiBaseUrl}/auth/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    localStorage.removeItem('accessToken');
                    router.push('/login'); // Redirect if cannot fetch user or token is invalid
                    return;
                }

                const userData: User = await response.json();
                setUser(userData);

                if (userData.user_metadata?.role !== 'admin') {
                    router.push('/dashboard'); // Redirect to user dashboard if not admin
                } else {
                    setIsLoading(false); // Admin verified
                }
            } catch (error) {
                console.error('Failed to verify admin status', error);
                localStorage.removeItem('accessToken');
                router.push('/login');
            }
        };

        verifyAdmin();
    }, [router]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: fontStack }}>
                Verifying admin access...
            </div>
        );
    }

    // If not loading and user role is confirmed admin (or user is set)
    return (
        <>
            <AdminNavbar />
            <div style={{
                fontFamily: fontStack,
                padding: '2rem',
                backgroundColor: '#f0f2f5',
                minHeight: 'calc(100vh - 60px)', // Adjust based on Navbar height
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    width: '100%',
                    maxWidth: '960px',
                }}>
                    <h1 style={{
                        color: '#0A2540',
                        marginBottom: '1.5rem',
                        fontSize: '2rem',
                        fontWeight: 600,
                        borderBottom: '2px solid #e2e8f0',
                        paddingBottom: '0.5rem',
                    }}>
                        Admin Dashboard
                    </h1>
                    {user && (
                        <p style={{ fontSize: '1.1rem', color: '#4A5568', marginBottom: '2rem' }}>
                            Welcome, <strong style={{ color: '#0A2540' }}>{user.email}</strong> (Administrator).
                        </p>
                    )}
                    
                    <div style={{ marginTop: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#0A2540', marginBottom: '1rem' }}>Quick Actions</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <button 
                                onClick={() => router.push('/admin/create-user')}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: '#2A4365',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    textAlign: 'center',
                                }}
                            >
                                Create New User
                            </button>
                            {/* Add more quick action buttons here */}
                            {/* Example: 
                            <button style={{...}}>Manage Users</button>
                            <button style={{...}}>System Settings</button> 
                            */}
                        </div>
                    </div>

                    {/* Placeholder for more dashboard content */}
                    <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#0A2540', marginBottom: '1rem' }}>Dashboard Overview</h3>
                        <p style={{ color: '#4A5568' }}>
                            This area can be used to display key metrics, recent activities, or other relevant information for administrators.
                            For example, you could show:
                        </p>
                        <ul style={{ listStyleType: 'disc', marginLeft: '20px', color: '#4A5568' }}>
                            <li>Total number of users</li>
                            <li>Recent file uploads</li>
                            <li>System health status</li>
                            <li>Pending forecast jobs</li>
                        </ul>
                        <p style={{ color: '#4A5568', marginTop: '1rem' }}>
                            Further development can include charts, tables, and more interactive elements here.
                        </p>
                    </div>
                </div>
                 <footer style={{ marginTop: 'auto', paddingTop: '2rem', color: '#718096', fontSize: '0.875rem', textAlign: 'center' }}>
                    © {new Date().getFullYear()} BCP Solutions. All rights reserved.
                </footer>
            </div>
        </>
    );
} 