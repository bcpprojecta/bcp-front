'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar'; // Import AdminNavbar

// Original User interface from the component
interface User {
    id: string;
    email: string;
    user_metadata?: {
        role?: string;
        [key: string]: unknown; // Retain this for flexibility
    } | null;
    // Add fields that might come from /auth/users/me if different from AdminUserDisplay
}

// Interface for user data displayed in the admin table
interface AdminUserDisplay {
    id: string; // Assuming UUID from backend is string here
    email: string;
    created_at: string; // ISO string format
    last_sign_in_at?: string | null; // ISO string format, optional
    user_metadata?: { // Keep user_metadata for potential future use (e.g., display role in table)
        role?: string;
        [key: string]: unknown;
    } | null;
}

// A simple, clean font stack
const fontStack = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

// Table styles (can be moved to a separate styles object or CSS module)
const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderRadius: '6px',
    overflow: 'hidden', // For rounded corners on table
};

const thStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    color: '#4A5568',
    padding: '12px 15px',
    textAlign: 'left',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
    padding: '12px 15px',
    borderBottom: '1px solid #edf2f7',
    color: '#2D3748',
    fontSize: '0.95rem',
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null); // For the logged-in admin user
    const [isLoading, setIsLoading] = useState(true); // For initial admin verification

    // States for the list of all users
    const [allUsers, setAllUsers] = useState<AdminUserDisplay[]>([]);
    const [usersLoading, setUsersLoading] = useState(true); // For loading the user list
    const [usersError, setUsersError] = useState<string | null>(null);

    useEffect(() => {
        const verifyAdminAndFetchData = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            let isAdmin = false;
            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
                const response = await fetch(`${apiBaseUrl}/auth/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    localStorage.removeItem('accessToken');
                    router.push('/login');
                    return;
                }

                const userData: User = await response.json();
                setUser(userData);

                if (userData.user_metadata?.role === 'admin') {
                    isAdmin = true;
                    setIsLoading(false); // Admin verified
                } else {
                    router.push('/dashboard'); // Redirect if not admin
                    return; // Stop further execution if not admin
                }
            } catch (error) {
                console.error('Failed to verify admin status', error);
                localStorage.removeItem('accessToken');
                router.push('/login');
                return; // Stop further execution on error
            }

            // If admin, fetch the list of all users
            if (isAdmin) {
                setUsersLoading(true);
                setUsersError(null);
                try {
                    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
                    const usersResponse = await fetch(`${apiBaseUrl}/admin/users`, { // New endpoint
                        headers: { 'Authorization': `Bearer ${token}` },
                    });

                    if (!usersResponse.ok) {
                        const errorData = await usersResponse.json().catch(() => ({ detail: "Failed to fetch users and parse error details."}));
                        throw new Error(errorData.detail || 'Failed to fetch users list.');
                    }
                    const usersData: AdminUserDisplay[] = await usersResponse.json();
                    setAllUsers(usersData);
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        setUsersError(err.message);
                    } else {
                        setUsersError('An unknown error occurred while fetching users.');
                    }
                    console.error('Failed to fetch users:', err);
                } finally {
                    setUsersLoading(false);
                }
            }
        };

        verifyAdminAndFetchData();
    }, [router]);

    if (isLoading) { // This is for the initial admin check
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: fontStack }}>
                Verifying admin access...
            </div>
        );
    }

    return (
        <>
            <AdminNavbar />
            <div style={{
                fontFamily: fontStack,
                padding: '2rem',
                backgroundColor: '#f0f2f5',
                minHeight: 'calc(100vh - 60px)',
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
                                    textAlign: 'center' as const,
                                }}
                            >
                                Create New User
                            </button>
                        </div>
                    </div>

                    {/* User Management Table Section */}
                    <div style={{ marginTop: '3rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#0A2540', marginBottom: '1rem' }}>User Accounts</h3>
                        {usersLoading && (
                            <p style={{ color: '#4A5568', textAlign: 'center' as const }}>Loading user accounts...</p>
                        )}
                        {usersError && (
                            <div style={{ backgroundColor: '#FFF5F5', color: '#C53030', padding: '1rem', borderRadius: '6px', border: '1px solid #FC8181'}}>
                                <p style={{fontWeight: 'bold'}}>Error loading users:</p>
                                <p>{usersError}</p>
                            </div>
                        )}
                        {!usersLoading && !usersError && allUsers.length === 0 && (
                            <p style={{ color: '#4A5568', textAlign: 'center' as const }}>No user accounts found.</p>
                        )}
                        {!usersLoading && !usersError && allUsers.length > 0 && (
                            <div style={{ overflowX: 'auto'}}> {/* For responsiveness on small screens */}
                                <table style={tableStyle}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Email</th>
                                            <th style={thStyle}>Created At</th>
                                            <th style={thStyle}>Last Sign In At</th>
                                            {/* Add more columns if needed, e.g., Role */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allUsers.map((u) => (
                                            <tr key={u.id}>
                                                <td style={tdStyle}>{u.email}</td>
                                                <td style={tdStyle}>{new Date(u.created_at).toLocaleString()}</td>
                                                <td style={tdStyle}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
} 