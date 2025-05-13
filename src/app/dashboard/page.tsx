'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Import usePathname
import Link from 'next/link'; // Import Link for navigation

// Simple styling for now, can be replaced with Tailwind/CSS Modules
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
    section: {
        marginBottom: '2rem',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
    },
    sectionTitle: {
        fontSize: '1.25rem',
        color: '#2A4365',
        marginBottom: '1rem',
    },
    formGroup: {
        marginBottom: '1rem',
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        color: '#4A5568',
        fontWeight: 500,
    },
    input: {
        padding: '0.65rem 0.9rem',
        borderRadius: '6px',
        border: '1px solid #D1D5DB',
        width: '100%',
        boxSizing: 'border-box',
        fontSize: '0.95rem',
        color: '#1A202C',
    } as React.CSSProperties, // Added type assertion for 'as'
    select: {
        padding: '0.65rem 0.9rem',
        borderRadius: '6px',
        border: '1px solid #D1D5DB',
        width: '100%',
        boxSizing: 'border-box',
        fontSize: '0.95rem',
        color: '#1A202C',
        backgroundColor: 'white', // Ensure select background is white
    } as React.CSSProperties,
    button: {
        padding: '0.75rem 1.25rem',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: '#2A4365',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 500,
        transition: 'background-color 0.2s ease-in-out',
    } as React.CSSProperties,
    buttonDisabled: {
        backgroundColor: '#A0AEC0',
        cursor: 'not-allowed',
    } as React.CSSProperties,
    message: {
        padding: '1rem',
        borderRadius: '6px',
        marginBottom: '1rem',
        textAlign: 'center' as const, // Changed to as const
    },
    successMessage: {
        backgroundColor: '#C6F6D5', // Green
        color: '#22543D',
    },
    errorMessage: {
        backgroundColor: '#FED7D7', // Red
        color: '#C53030',
    }
};

interface User {
    id: string;
    email: string;
    // Ensure this matches the Pydantic User model from your backend (/auth/users/me)
}

export default function DashboardPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileUploadMessage, setFileUploadMessage] = useState<string | null>(null);
    const [fileUploadError, setFileUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // States for single forecast generation
    const [anchorDate, setAnchorDate] = useState<string>(''); // YYYY-MM-DD
    const [forecastMessage, setForecastMessage] = useState<string | null>(null);
    const [forecastError, setForecastError] = useState<string | null>(null);
    const [isForecasting, setIsForecasting] = useState(false);

    // States for Bulk Historical Upload
    const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
    const [bulkCurrency, setBulkCurrency] = useState<'CAD' | 'USD' | '' >(''); // User selects CAD or USD
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkUploadMessage, setBulkUploadMessage] = useState<string | null>(null);
    const [bulkUploadProgress, setBulkUploadProgress] = useState<string | null>(null); // For showing progress like "File 2 of 10..."
    const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);

    // State for controlling collapsible section
    const [isBulkUploadSectionOpen, setIsBulkUploadSectionOpen] = useState(true); // Default to open

    const router = useRouter();
    const pathname = usePathname(); // Get current pathname
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login'); // Redirect to login if no token
        } else {
            setAccessToken(token);
            const fetchUser = async () => {
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
                        throw new Error('Session expired or invalid. Please login again.');
                    }
                    const userData: User = await response.json();
                    setCurrentUser(userData);
                } catch (error) {
                    console.error("Error fetching user:", error);
                    localStorage.removeItem('accessToken'); // Clear token on error too
                    router.push('/login');
                }
            };
            fetchUser();
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        setCurrentUser(null); 
        setAccessToken(null); // Clear access token state
        router.push('/login');
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setFileUploadMessage(null);
            setFileUploadError(null);
        }
    };

    const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedFile || !accessToken) return;

        setIsUploading(true);
        setFileUploadMessage(null);
        setFileUploadError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        // Add file_type and currency for daily .041 uploads
        // Assuming daily uploads are primarily for CAD and contain both summary and raw transactions
        formData.append('file_type', 'CAD_SUMMARY_RAW'); 
        formData.append('currency', 'CAD');

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiBaseUrl}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `File upload failed with status: ${response.status}`);
            }
            setFileUploadMessage(`File '${selectedFile.name}' uploaded successfully. Processing queued. File ID: ${data.file_id}`);
            setSelectedFile(null); // Clear selection
            const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
            if(fileInput) fileInput.value = ''; // Reset file input
        } catch (err: unknown) {
            if (err instanceof Error) {
            setFileUploadError(err.message || 'An unexpected error occurred during file upload.');
            } else {
                setFileUploadError('An unexpected error occurred during file upload.');
            }
            console.error("File upload error:", err);
        } finally {
            setIsUploading(false);
        }
    };

    // New handler for bulk file selection
    const handleBulkFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setBulkFiles(event.target.files);
            setBulkUploadMessage(null);
            setBulkUploadError(null);
            setBulkUploadProgress(null);
        }
    };

    // New handler for bulk file upload submission
    const handleBulkFileUpload = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!bulkFiles || bulkFiles.length === 0 || !bulkCurrency || !accessToken) {
            setBulkUploadError("Please select currency and at least one file.");
            return;
        }

        setIsBulkUploading(true);
        setBulkUploadMessage("Starting bulk upload...");
        setBulkUploadError(null);
        let successCount = 0;
        let errorCount = 0;

        const totalFiles = bulkFiles.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = bulkFiles[i];
            setBulkUploadProgress(`Processing file ${i + 1} of ${totalFiles}: ${file.name}`);
            
            const formData = new FormData();
            formData.append('file', file);
            // Determine file_type based on bulkCurrency selected by user for .041/.txt files
            // Backend logic will handle parsing both summary and transactions from this type
            const fileTypeForApi = bulkCurrency === 'CAD' ? 'CAD_SUMMARY_RAW' : 'USD_SUMMARY_RAW';
            formData.append('file_type', fileTypeForApi); 
            formData.append('currency', bulkCurrency); 

            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
                const response = await fetch(`${apiBaseUrl}/files/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: formData,
                });
                const data = await response.json();
                if (!response.ok) {
                    errorCount++;
                    console.error(`Error uploading ${file.name}:`, data.detail || response.statusText);
                    // Optionally, collect individual file errors: 
                    // setBulkUploadError(prev => prev ? `${prev}\nFailed: ${file.name} - ${data.detail || response.statusText}` : `Failed: ${file.name} - ${data.detail || response.statusText}`);
                } else {
                    successCount++;
                }
            } catch (err: unknown) {
                errorCount++;
                console.error(`Exception during upload of ${file.name}:`, err);
                // Optionally, collect individual file errors
                if (err instanceof Error) {
                    // Example: append to a list of errors displayed to the user
                    // setBulkUploadError(prev => prev ? `${prev}\n${file.name}: ${err.message}` : `${file.name}: ${err.message}`);
                }
            }
        }

        setBulkUploadMessage(`Bulk upload finished. Successful: ${successCount}, Failed: ${errorCount}.`);
        setBulkUploadProgress(null);
        setIsBulkUploading(false);
        // Clear file input after processing
        const bulkFileInput = document.getElementById('bulkFileUpload') as HTMLInputElement;
        if(bulkFileInput) bulkFileInput.value = '';
        setBulkFiles(null);
        // setBulkCurrency(''); // Optionally reset currency
    };

    const handleStartForecast = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!accessToken) {
            setForecastError("Authentication token not found. Please re-login.");
            return;
        }
        // Basic validation for anchorDate if needed
        if (!anchorDate) {
            setForecastError("Please select a forecast anchor date.");
            return;
        }

        setIsForecasting(true);
        setForecastMessage(null);
        setForecastError(null);

        const payload = {
            currency: "CAD", // Hardcoded to CAD, forecastCurrency state is no longer used here
            forecast_anchor_date: anchorDate,
            // training_window_days and forecast_horizon_days can be added here if configurable
            // For now, using backend defaults or hardcoded values if needed
        };

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiBaseUrl}/files/forecast/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.detail || 'Failed to start forecast generation.');
            }
            setForecastMessage(responseData.message || `Forecast generation started for ${payload.currency}.`);
            setAnchorDate('');

        } catch (err: unknown) {
            if (err instanceof Error) {
            setForecastError(err.message || 'An unexpected error occurred while starting forecast.');
            } else {
                setForecastError('An unexpected error occurred while starting forecast.');
            }
            console.error("Forecast error:", err);
        } finally {
            setIsForecasting(false);
        }
    };
    
    if (!currentUser) {
        return <p style={{textAlign: 'center', marginTop: '3rem', fontFamily: styles.container.fontFamily}}>Loading user data...</p>; 
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.navLinks}>
                    <Link href="/dashboard" style={{...styles.navLink, backgroundColor: pathname === '/dashboard' ? '#edf2f7' : 'transparent'}} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = pathname === '/dashboard' ? '#edf2f7' : 'transparent'}>Dashboard</Link>
                    <Link href="/forecasts/view/CAD" style={{...styles.navLink, backgroundColor: pathname === '/forecasts/view/CAD' ? '#edf2f7' : 'transparent' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = pathname === '/forecasts/view/CAD' ? '#edf2f7' : 'transparent'}>Latest Forecast</Link>
                    <Link href="/history" style={{...styles.navLink, backgroundColor: pathname === '/history' ? '#edf2f7' : 'transparent' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = pathname === '/history' ? '#edf2f7' : 'transparent'}>History</Link>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={styles.userInfo}>Logged in as: <strong>{currentUser.email}</strong></div>
                    <button onClick={handleLogout} style={styles.logoutButton} 
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#edf2f7'; e.currentTarget.style.color = '#1A202C';}}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#2A4365';}} >
                        Logout
                    </button>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-6 text-slate-800">Forecasting Dashboard</h2>
            <p style={{ marginBottom: '1.5rem', color: '#4A5568' }}>Welcome, {currentUser.email}! Manage your CAD cash flow forecasts here.</p>

            {/* Initial Bulk Upload Section */}
            <div style={styles.section}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => setIsBulkUploadSectionOpen(!isBulkUploadSectionOpen)}>
                    <h2 style={styles.sectionTitle}>Initial Bulk Upload (Historical .041 Files)</h2>
                    <button style={{background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#2A4365'}}>
                        {isBulkUploadSectionOpen ? '\u25B2' : '\u25BC'} {/* Up arrow / Down arrow */}
                    </button>
                </div>
                
                {isBulkUploadSectionOpen && (
                    <>
                        <p style={{fontSize: '0.9rem', color: '#4A5568', marginBottom: '1rem'}}>
                            Upload your historical .041 transaction files (e.g., for the past 2 years) to populate initial data for forecasting.
                        </p>
                        <form onSubmit={handleBulkFileUpload}>
                            <div style={styles.formGroup}>
                                <label htmlFor="bulkCurrency" style={styles.label}>Currency for this batch:</label>
                                <select 
                                    id="bulkCurrency" 
                                    value={bulkCurrency} 
                                    onChange={(e) => setBulkCurrency(e.target.value as 'CAD' | 'USD' | '')} 
                                    required 
                                    style={styles.select}
                                >
                                    <option value="" disabled>Select Currency</option>
                                    <option value="CAD">CAD</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label htmlFor="bulkFileUpload" style={styles.label}>Select .041 Files (Multiple):</label>
                                <input
                                    type="file"
                                    id="bulkFileUpload"
                                    onChange={handleBulkFileChange}
                                    accept=".041,.txt"
                                    required
                                    multiple
                                    style={styles.input}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!bulkFiles || bulkFiles.length === 0 || !bulkCurrency || isBulkUploading}
                                style={{
                                    ...styles.button,
                                    ...( (!bulkFiles || bulkFiles.length === 0 || !bulkCurrency || isBulkUploading) ? styles.buttonDisabled : {})
                                }}
                            >
                                {isBulkUploading ? (bulkUploadProgress || 'Uploading...') : 'Upload Historical Files'}
                            </button>
                            {bulkUploadMessage && <p style={{...styles.message, ...(bulkUploadError ? styles.errorMessage : styles.successMessage), marginTop: '1rem'}}>{bulkUploadMessage}</p>}
                            {bulkUploadError && !bulkUploadMessage && <p style={{...styles.message, ...styles.errorMessage, marginTop: '1rem'}}>{bulkUploadError}</p>} {/* Show general error if no message */}
                             {isBulkUploading && bulkUploadProgress && <p style={{marginTop: '0.5rem', color: '#2A4365', fontSize: '0.9rem'}}>{bulkUploadProgress}</p>}
                        </form>
                    </>
                )}
            </div>

            {/* Regular File Upload Section - Now Combined with Forecast */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Daily Operations: CAD File Upload &amp; Forecast</h2>
                
                {/* Upload Daily Transaction File Form */}
                <form onSubmit={handleFileUpload} style={{ marginBottom: '2rem' }}> {/* Added margin for spacing */}
                    <div style={styles.formGroup}>
                        <label htmlFor="fileUpload" style={styles.label}>Select .041 or .txt File:</label>
                        <input
                            type="file"
                            id="fileUpload"
                            onChange={handleFileChange}
                            accept=".041,.txt"
                            required
                            style={styles.input}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!selectedFile || isUploading}
                        style={{
                            ...styles.button,
                            ...( (!selectedFile || isUploading) ? styles.buttonDisabled : {})
                        }}
                    >
                        {isUploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    {fileUploadMessage && <p style={{...styles.message, ...styles.successMessage, marginTop: '1rem'}}>{fileUploadMessage}</p>}
                    {fileUploadError && <p style={{...styles.message, ...styles.errorMessage, marginTop: '1rem'}}>{fileUploadError}</p>}
                </form>

                {/* Start New Forecast Form - Now in the same section */}
                <h2 style={styles.sectionTitle}>Start New CAD Forecast</h2> {/* Kept a sub-heading for clarity */}
                <form onSubmit={handleStartForecast}>
                    <div style={styles.formGroup}>
                        <label htmlFor="anchorDate" style={styles.label}>Forecast Anchor Date (Optional):</label>
                        <input
                            type="date"
                            id="anchorDate"
                            value={anchorDate}
                            onChange={(e) => setAnchorDate(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    {/* Training Window Days (Optional) */}
                    {/* Horizon Days (Optional) */}                    
                    <button type="submit" style={isForecasting ? {...styles.button, ...styles.buttonDisabled} : styles.button} disabled={isForecasting}>
                        {isForecasting ? 'Generating Forecast...' : 'Start New Forecast'}
                    </button>
                    {forecastMessage && <p style={{...styles.message, ...styles.successMessage, marginTop: '1rem'}}>{forecastMessage}</p>}
                    {forecastError && <p style={{...styles.message, ...styles.errorMessage, marginTop: '1rem'}}>{forecastError}</p>}
                </form>
            </div>
        </div>
    );
} 