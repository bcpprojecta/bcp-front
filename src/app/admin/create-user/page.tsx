'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar'; // Assuming you have or will create this

// A simple, clean font stack
const fontStack = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

interface User {
    id: string;
    email: string;
    user_metadata?: {
        role?: string;
        [key: string]: any;
    } | null;
}

export default function CreateUserPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading, true = admin, false = not admin

    useEffect(() => {
        const checkAdminStatus = async () => {
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
                    router.push('/login');
                    return;
                }

                const userData: User = await response.json();
                if (userData.user_metadata?.role === 'admin') {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    router.push('/dashboard'); // Redirect non-admins
                }
            } catch (err) {
                console.error("Error verifying admin status:", err);
                localStorage.removeItem('accessToken');
                router.push('/login');
            }
        };

        checkAdminStatus();
    }, [router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        const token = localStorage.getItem('accessToken');

        if (!token) {
            setError("Authentication token not found. Please log in again.");
            setIsLoading(false);
            router.push('/login');
            return;
        }

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiBaseUrl}/admin/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    user_metadata: { role: 'user' } // Automatically set role to 'user'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorDetail = data.detail || `Failed to create user: ${response.statusText} (Status: ${response.status})`;
                throw new Error(errorDetail);
            }

            setSuccessMessage(`User ${data.email} created successfully!`);
            setEmail(''); // Clear form
            setPassword('');

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while creating the user.');
            console.error("Create user error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isAdmin === null) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: fontStack }}>
                Loading admin verification...
            </div>
        );
    }

    if (!isAdmin) {
        // This should ideally not be reached if redirection in useEffect works,
        // but it's a fallback.
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: fontStack }}>
                Access Denied. Redirecting...
            </div>
        );
    }

    return (
        <>
            <AdminNavbar />
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: '#f0f2f5',
                fontFamily: fontStack,
                paddingTop: '2rem', // Add some padding at the top
            }}>
                <div style={{
                    padding: '2.5rem 3rem',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 30, 80, 0.12)',
                    width: '100%',
                    maxWidth: '500px',
                }}>
                    <h1 style={{
                        textAlign: 'center',
                        marginBottom: '2rem',
                        color: '#0A2540',
                        fontSize: '1.75rem',
                        fontWeight: 600,
                    }}>
                        Admin - Create New User
                    </h1>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label
                                htmlFor="email"
                                style={{ display: 'block', marginBottom: '0.5rem', color: '#4A5568', fontWeight: 500 }}
                            >
                                User Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="new.user@example.com"
                                style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '6px',
                                    border: `1px solid ${error ? '#E53E3E' : '#D1D5DB'}`,
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    fontSize: '1rem',
                                    color: '#1A202C',
                                }}
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="password"
                                style={{ display: 'block', marginBottom: '0.5rem', color: '#4A5568', fontWeight: 500 }}
                            >
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Choose a strong password"
                                minLength={6} // Basic password policy
                                style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '6px',
                                    border: `1px solid ${error ? '#E53E3E' : '#D1D5DB'}`,
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    fontSize: '1rem',
                                    color: '#1A202C',
                                }}
                            />
                        </div>
                        {error && (
                            <p style={{ color: '#C53030', backgroundColor: '#FED7D7', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', margin: '0.5rem 0' }}>
                                {error}
                            </p>
                        )}
                        {successMessage && (
                            <p style={{ color: '#2F855A', backgroundColor: '#C6F6D5', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', margin: '0.5rem 0' }}>
                                {successMessage}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                padding: '0.875rem 1.5rem',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: isLoading ? '#A0AEC0' : '#2A4365', // Using theme color from login
                                color: 'white',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                                fontWeight: 600,
                                transition: 'background-color 0.2s ease-in-out',
                                marginTop: '0.5rem' // Add some space before button
                            }}
                            onMouseOver={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = '#1E3A5F'); }} // Darken on hover
                            onMouseOut={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = '#2A4365'); }} // Revert on mouse out
                        >
                            {isLoading ? 'Creating User...' : 'Create User'}
                        </button>
                    </form>
                </div>
                 <footer style={{ marginTop: '3rem', color: '#718096', fontSize: '0.875rem', paddingBottom: '1rem' }}>
                    © {new Date().getFullYear()} BCP Solutions. All rights reserved.
                </footer>
            </div>
        </>
    );
} 