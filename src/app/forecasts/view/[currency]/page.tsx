'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale, // For time series data on X-axis
    Filler, // Optional: for filling area under line
    TooltipItem // Import TooltipItem
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Adapter for date/time scale

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale, // Register TimeScale
    Filler
);

// Define the structure of a single forecast result row
interface ForecastResultRow {
    Date: string; // Assuming date is string like YYYY-MM-DD
    "Forecasted Amount": number;
    "Forecasted Cash Balance": number; // Updated: space added
    "Actual Cash Balance"?: number | null; // Updated: space added and capital C
    // Add other fields if your API returns more, e.g., job_id, user_id, Currency, forecast_run_timestamp
}

// Basic styles (can be shared or customized later)
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
    heading: {
        color: '#0A2540',
        fontSize: '1.75rem',
        fontWeight: 600,
    },
    backLink: {
        color: '#2A4365',
        textDecoration: 'none',
        fontWeight: 500,
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        border: '1px solid #D1D5DB',
        transition: 'background-color 0.2s ease-in-out',
    } as React.CSSProperties,
    chartContainer: {
        marginTop: '2rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        height: '400px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '1rem',
    } as React.CSSProperties,
    th: {
        borderBottom: '2px solid #e2e8f0',
        padding: '0.75rem 1rem',
        textAlign: 'left',
        color: '#2A4365',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        backgroundColor: '#f9fafb',
    } as React.CSSProperties,
    td: {
        borderBottom: '1px solid #edf2f7',
        padding: '0.75rem 1rem',
        color: '#4A5568',
        fontSize: '0.95rem',
        textAlign: 'right' as const, // Align numbers to the right
    } as React.CSSProperties,
    tdDate: {
        borderBottom: '1px solid #edf2f7',
        padding: '0.75rem 1rem',
        color: '#4A5568',
        fontSize: '0.95rem',
        textAlign: 'left' as const, 
    } as React.CSSProperties,
    errorMessage: {
        padding: '1rem',
        borderRadius: '6px',
        marginTop: '1rem',
        textAlign: 'center' as const,
        backgroundColor: '#FED7D7', 
        color: '#C53030',
    },
    downloadButton: {
        padding: '0.75rem 1.5rem',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: '#2A4365',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
        transition: 'background-color 0.2s ease-in-out',
        // marginTop: '1.5rem', // Removed to place it beside table title or similar
        // float: 'right' as 'right',
    } as React.CSSProperties,
    tableHeaderContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '2rem',
        marginBottom: '1rem',
    },
    tableTitle: {
        fontSize: '1.25rem',
        fontWeight: 500,
        color: '#0A2540',
    }
};

export default function ForecastResultsPage() {
    const params = useParams();
    const router = useRouter();
    const currency = params.currency as string; // Added currency from params

    const [results, setResults] = useState<ForecastResultRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageTitle, setPageTitle] = useState<string>('Forecast Results'); // For dynamic title

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        if (currency) {
            setPageTitle(`Forecast Results for ${currency.toUpperCase()}`); // Set dynamic title
            const fetchResults = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
                    
                    const response = await fetch(`${apiBaseUrl}/files/forecast/latest?currency=${currency.toLowerCase()}`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch forecast results.'}));
                        throw new Error(errorData.detail || 'Failed to fetch forecast results.');
                    }
                    const data: ForecastResultRow[] = await response.json();
                    setResults(data);
                    if (data.length === 0) {
                        setError("No forecast data found for the selected currency. Please generate a forecast first.");
                    }
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        setError(err.message || 'An error occurred while fetching results.');
                    } else {
                        setError('An unexpected error occurred while fetching results.');
                    }
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchResults();
        } else {
            setError("Currency parameter is missing.");
            setIsLoading(false);
        }
    }, [currency, router]); // Dependency array updated to currency

    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return 'N/A';
        return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleDownloadCSV = () => {
        if (results.length === 0) return;
        const headers = ["Date", "Forecasted Amount", "Forecasted Cash Balance", "Actual Cash Balance"];
        const csvRows = [
            headers.join(','), 
            ...results.map(row => [
                row.Date,
                row["Forecasted Amount"],
                row["Forecasted Cash Balance"],
                row["Actual Cash Balance"] ?? ''
            ].join(','))
        ];
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forecast_results_${currency?.toLowerCase()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const chartData = {
        labels: results.map(row => row.Date),
        datasets: [
            {
                label: 'Forecasted Cash Balance',
                data: results.map(row => row["Forecasted Cash Balance"]),
                borderColor: 'rgb(255, 159, 64)', // Orange
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                tension: 0.1,
                fill: false, 
            },
            {
                label: 'Actual Cash Balance',
                data: results.map(row => row["Actual Cash Balance"]),
                borderColor: 'rgb(54, 162, 235)', // Blue
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.1,
                fill: false,
                // Show this line only if there's actual data
                hidden: results.every(row => row["Actual Cash Balance"] === null || row["Actual Cash Balance"] === undefined)
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, // Important for controlling chart size via container
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: `Cash Position Forecast (Currency: ${currency?.toUpperCase()})`,
                font: { size: 16 }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    label: function(context: TooltipItem<'line'>) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatCurrency(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time' as const,
                time: {
                    unit: 'day' as const,
                    tooltipFormat: 'MMM d, yyyy', // e.g., Jan 1, 2023
                    displayFormats: {
                        day: 'MMM d' // e.g. Jan 1
                    }
                },
                title: {
                    display: true,
                    text: 'Date'
                },
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 15,
                    padding: 10
                }
            },
            y: {
                title: {
                    display: true,
                    text: currency ? `Balance (${currency})` : 'Balance'
                },
                ticks: {
                    callback: function(value: number | string) {
                        if (typeof value === 'number') {
                            return value.toLocaleString(undefined, {notation: 'compact', compactDisplay: 'short'});
                        }
                        return value;
                    }
                }
            }
        }
    };

    if (isLoading) {
        return <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '1.2rem' }}>Loading forecast data...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.heading}>{pageTitle}</h1>
                <Link href="/dashboard" style={styles.backLink}>
                    Back to Dashboard
                </Link>
            </div>

            {error && !results.length && (
                <div style={styles.errorMessage}>{error}</div>
            )}
            
            {results.length > 0 && (
                <>
                    <div style={styles.chartContainer}>
                        <Line data={chartData} options={chartOptions} />
                    </div>

                    <div style={styles.tableHeaderContainer}>
                        <h2 style={styles.tableTitle}>Forecast Data Table</h2>
                        <button onClick={handleDownloadCSV} style={styles.downloadButton} disabled={results.length === 0}>
                            Download CSV
                        </button>
                    </div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Forecasted Amount</th>
                                <th style={styles.th}>Forecasted Cash Balance</th>
                                <th style={styles.th}>Actual Cash Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((row, index) => (
                                <tr key={index}>
                                    <td style={styles.tdDate}>{new Date(row.Date).toLocaleDateString()}</td>
                                    <td style={styles.td}>{formatCurrency(row["Forecasted Amount"])}</td>
                                    <td style={styles.td}>{formatCurrency(row["Forecasted Cash Balance"])}</td>
                                    <td style={styles.td}>{formatCurrency(row["Actual Cash Balance"])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {!isLoading && !error && results.length === 0 && (
                 <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '1.1rem' }}>
                    No forecast data available for {currency?.toUpperCase()}. 
                    Please try generating a new forecast.
                 </div>
            )}
        </div>
    );
} 