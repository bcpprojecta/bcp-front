'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// Reusing styles from dashboard for consistency (can be refactored later)
const styles = { 
    container: {
        padding: '2rem',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
        maxWidth: '800px',
        margin: '2rem auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e2e8f0',
    },
     navLinks: {
        display: 'flex',
        gap: '1rem',
    },
    navLink: {
        textDecoration: 'none',
        color: '#2A4365',
        fontWeight: 500,
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        transition: 'background-color 0.2s ease-in-out',
    } as React.CSSProperties,
    userInfo: {
        fontSize: '0.95rem',
        color: '#4A5568',
    },
    logoutButton: {
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        border: '1px solid #D1D5DB',
        backgroundColor: 'white',
        color: '#2A4365',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 500,
        transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
    } as React.CSSProperties,
    heading: {
        color: '#0A2540',
        marginBottom: '1.5rem',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '2rem',
    } as React.CSSProperties,
    th: {
        borderBottom: '2px solid #e2e8f0',
        padding: '0.75rem 1rem',
        textAlign: 'left',
        color: '#2A4365',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
    } as React.CSSProperties,
    td: {
        borderBottom: '1px solid #edf2f7',
        padding: '0.75rem 1rem',
        color: '#4A5568',
        fontSize: '0.95rem',
    } as React.CSSProperties,
    errorMessage: {
        padding: '1rem',
        borderRadius: '6px',
        marginBottom: '1rem',
        textAlign: 'center' as const,
        backgroundColor: '#FED7D7', 
        color: '#C53030',
    }
};

// Changed from Job to UploadedFileMetadataItem
interface UploadedFileMetadataItem {
    id: string; // uuid.UUID from backend
    user_id: string; // uuid.UUID from backend
    original_filename: string;
    storage_path: string;
    file_type?: string | null; // FileTypeEnum as string
    currency?: string | null;
    file_size_bytes?: number | null;
    content_type?: string | null;
    upload_timestamp: string; // datetime as ISO string
    processing_status?: string | null;
    processing_message?: string | null;
    forecast_date?: string | null; // datetime as ISO string
}

interface User {
    id: string;
    email: string;
}


export default function HistoryPage() {
    // const [jobs, setJobs] = useState<Job[]>([]); // Old state
    const [fileHistory, setFileHistory] = useState<UploadedFileMetadataItem[]>([]); // New state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const pathname = usePathname(); // Get current pathname

    // Renamed from fetchUserAndJobs to fetchUserAndFileHistory
    const fetchUserAndFileHistory = useCallback(async (token: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
            
            // Fetch user info first
            const userResponse = await fetch(`${apiBaseUrl}/auth/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!userResponse.ok) {
                 localStorage.removeItem('accessToken');
                 router.push('/login');
                 throw new Error('Session expired or invalid. Please login again.');
            }
            const userData: User = await userResponse.json();
            setCurrentUser(userData);

            // Then fetch file history - API endpoint changed
            const historyResponse = await fetch(`${apiBaseUrl}/files/history`, { 
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!historyResponse.ok) {
                const errorData = await historyResponse.json().catch(() => ({detail: "Failed to fetch file history and could not parse error."}));
                throw new Error(errorData.detail || 'Failed to fetch file upload history.');
            } 
            const historyData: UploadedFileMetadataItem[] = await historyResponse.json();
            console.log("Fetched File History Data:", historyData);
            // Sort by upload_timestamp (newest first)
            setFileHistory(historyData.sort((a,b) => new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime())); 
            
        } catch (err: unknown) {
            if (err instanceof Error) {
            setError(err.message || 'An error occurred.');
            } else {
                setError('An unexpected error occurred.');
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [router, setIsLoading, setError, setCurrentUser, setFileHistory]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
        } else {
            setAccessToken(token);
            fetchUserAndFileHistory(token); // Call renamed function
        }
    }, [router, fetchUserAndFileHistory, setAccessToken]);
    
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        setCurrentUser(null);
        setAccessToken(null);
        router.push('/login');
    };

    if (isLoading) {
        return <p style={{textAlign: 'center', marginTop: '3rem', fontFamily: styles.container.fontFamily}}>Loading history...</p>;
    }


    return (
        <div style={styles.container}>
             <div style={styles.header}>
                 <div style={styles.navLinks}>
                    <Link href="/dashboard" style={{...styles.navLink, backgroundColor: pathname === '/dashboard' ? '#edf2f7' : 'transparent'}} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = pathname === '/dashboard' ? '#edf2f7' : 'transparent'}>Dashboard</Link>
                    <Link href="/forecasts/view/CAD" style={{...styles.navLink, backgroundColor: pathname === '/forecasts/view/CAD' ? '#edf2f7' : 'transparent' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = pathname === '/forecasts/view/CAD' ? '#edf2f7' : 'transparent'}>Latest Forecast</Link>
                    <Link href="/history" style={{...styles.navLink, backgroundColor: pathname === '/history' ? '#edf2f7' : 'transparent'}}>History</Link>
                 </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={styles.userInfo}>
                        {currentUser ? `Logged in as: ${currentUser.email}` : 'Loading user...'}
                    </div>
                     <button onClick={handleLogout} style={styles.logoutButton}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#edf2f7'; e.currentTarget.style.color = '#1A202C';}}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#2A4365';}} >
                        Logout
                    </button>
                </div>
            </div>
            <h1 style={styles.heading}>File Upload History</h1>
            
            {error && <p style={{...styles.errorMessage}}>{error}</p>}

            <button 
                onClick={() => accessToken && fetchUserAndFileHistory(accessToken)}
                disabled={isLoading}
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: isLoading ? '#E2E8F0' : '#2A4365',
                    color: isLoading ? '#A0AEC0' : 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    marginBottom: '1rem',
                    float: 'right' as const,
                }}
                onMouseOver={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#1E3A5F'; }}
                onMouseOut={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#2A4365'; }}
            >
                {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>

            {fileHistory.length === 0 && !error && !isLoading && <p>No file upload history found.</p>} 
            
            {fileHistory.length > 0 && (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Filename</th>
                            {/* <th style={styles.th}>File Type</th> */}
                            <th style={styles.th}>Currency</th>
                            <th style={styles.th}>Upload Time</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Forecast Date</th>
                            {/* <th style={styles.th}>Actions</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {fileHistory.map((file) => (
                            <tr key={file.id}>
                                <td style={styles.td} title={file.original_filename}>
                                    {file.original_filename.length > 25 ? `${file.original_filename.substring(0, 22)}...` : file.original_filename}
                                </td>
                                {/* <td style={styles.td}>{file.file_type || 'N/A'}</td> */}
                                <td style={styles.td}>{file.currency || 'N/A'}</td>
                                <td style={styles.td}>{new Date(file.upload_timestamp).toLocaleString()}</td>
                                <td style={styles.td}>
                                    <span style={{
                                        padding: '0.25em 0.6em',
                                        fontSize: '0.85em',
                                        fontWeight: 500,
                                        borderRadius: '4px',
                                        color: 'white',
                                        backgroundColor: 
                                            file.processing_status === 'completed' ? '#38A169' : // Green
                                            file.processing_status === 'failed' ? '#E53E3E' :    // Red
                                            file.processing_status === 'processing' ? '#3182CE' : // Blue
                                            file.processing_status === 'pending' ? '#A0AEC0' : // Gray for pending
                                            '#718096', // Darker Gray for other/null states
                                    }}>
                                        {file.processing_status 
                                            ? file.processing_status.charAt(0).toUpperCase() + file.processing_status.slice(1)
                                            : 'Unknown'}
                                    </span>
                                </td>
                                <td style={styles.td}>
                                    {file.forecast_date ? new Date(file.forecast_date).toLocaleDateString() : 'N/A'}
                                </td>
                                {/* <td style={styles.td}>
                                    {file.processing_status === 'completed' && (file.file_type === 'CAD_SUMMARY_RAW' || file.file_type === 'USD_SUMMARY_RAW') && file.currency &&
                                        <Link href={`/forecasts/view/${file.currency.toLowerCase()}`} 
                                              style={{color: '#2B6CB0', textDecoration: 'underline', fontWeight: '500'}}>
                                            View Forecast
                                        </Link>
                                    }
                                    {file.processing_status === 'failed' && file.processing_message && 
                                        <span title={file.processing_message} style={{cursor: 'help', color: '#C53030'}}>
                                            Error (hover)
                                        </span>
                                    }
                                </td> */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
} 