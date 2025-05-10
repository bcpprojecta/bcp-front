'use client'; // Mark as a Client Component

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// A simple, clean font stack
const fontStack = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

// Add the User interface here as well to type the response from /users/me
interface User {
    id: string;
    email: string;
    user_metadata?: { 
        role?: string; 
        [key: string]: unknown;
    } | null; 
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        let token = null; // Variable to hold the token

        try {
            // --- Step 1: Login to get token --- 
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
            const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: email,
                    password: password,
                }),
            });

            const loginData = await loginResponse.json();

            if (!loginResponse.ok) {
                const errorDetail = loginData.detail || `Login failed with status: ${loginResponse.status}`;
                throw new Error(errorDetail);
            }

            if (loginData.access_token) {
                token = loginData.access_token;
                localStorage.setItem('accessToken', token); 
            } else {
                throw new Error('Access token not found in login response');
            }

            // --- Step 2: Fetch user data to check role --- 
            if (token) {
                const userResponse = await fetch(`${apiBaseUrl}/auth/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (!userResponse.ok) {
                    // If fetching user fails, still log them in as a regular user for now
                    // but log an error. Or could throw and prevent login.
                    console.error("Failed to fetch user details after login, proceeding as standard user.");
                    router.push('/dashboard'); // Default redirect
                } else {
                    const userData: User = await userResponse.json();
                    // Check role and redirect accordingly
                    if (userData.user_metadata?.role === 'admin') {
                        router.push('/admin/dashboard');
                    } else {
                        router.push('/dashboard');
                    }
                }
            } else {
                 // Should not happen if token logic above is correct, but handle defensively
                 throw new Error('Token was not set, cannot fetch user details.');
            }

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'An unexpected error occurred.');
            } else {
                setError('An unexpected error occurred.');
            }
            localStorage.removeItem('accessToken'); // Clear token on error
            console.error("Login/User Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f0f2f5', 
            fontFamily: fontStack,
        }}>
            <div style={{
                padding: '2.5rem 3rem',
                backgroundColor: 'white',
                borderRadius: '12px', 
                boxShadow: '0 8px 24px rgba(0, 30, 80, 0.12)',
                width: '100%',
                maxWidth: '400px', 
            }}>
                <h1 style={{
                    textAlign: 'center',
                    marginBottom: '2rem', 
                    color: '#0A2540', 
                    fontSize: '1.75rem',
                    fontWeight: 600,
                }}>
                    BCP Login
                </h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label
                            htmlFor="email"
                            style={{ display: 'block', marginBottom: '0.5rem', color: '#4A5568', fontWeight: 500 }}
                        >
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
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
                            placeholder="••••••••"
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
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '0.875rem 1.5rem',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isLoading ? '#A0AEC0' : '#2A4365',
                            color: 'white',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                            transition: 'background-color 0.2s ease-in-out',
                        }}
                        onMouseOver={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = '#1E3A5F'); }}
                        onMouseOut={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = '#2A4365'); }}
                    >
                        {isLoading ? 'Verifying...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
} 