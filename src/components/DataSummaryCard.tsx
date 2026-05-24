'use client';

import { useEffect, useState } from 'react';

export interface CurrencyDataSummary {
    earliest: string;
    latest: string;
    record_count: number;
    expected_business_days: number;
    missing_count: number;
    missing_dates: string[];
}

export interface DataSummary {
    cad: CurrencyDataSummary | null;
    usd: CurrencyDataSummary | null;
}

interface Props {
    accessToken: string | null;
    onLoaded?: (summary: DataSummary) => void;
    refreshKey?: number;
}

const styles = {
    wrapper: {
        marginBottom: '1.5rem',
        padding: '1.25rem 1.5rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
    } as React.CSSProperties,
    title: {
        margin: 0,
        marginBottom: '0.75rem',
        fontSize: '1rem',
        fontWeight: 600,
        color: '#0A2540',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
    } as React.CSSProperties,
    cell: {
        padding: '0.9rem 1rem',
        borderRadius: '6px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
    } as React.CSSProperties,
    cellTitle: {
        margin: 0,
        marginBottom: '0.4rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: '#2A4365',
        textTransform: 'uppercase' as const,
    },
    dateRange: {
        fontSize: '0.95rem',
        color: '#1A202C',
        fontWeight: 500,
    },
    meta: {
        marginTop: '0.4rem',
        fontSize: '0.8rem',
        color: '#4A5568',
    },
    missing: {
        marginTop: '0.4rem',
        fontSize: '0.8rem',
        color: '#C53030',
    },
    missingNone: {
        marginTop: '0.4rem',
        fontSize: '0.8rem',
        color: '#2F855A',
    },
    empty: {
        fontSize: '0.9rem',
        color: '#718096',
    },
    error: {
        fontSize: '0.85rem',
        color: '#C53030',
    },
};

function CurrencyCell({ label, data }: { label: string; data: CurrencyDataSummary | null }) {
    if (!data) {
        return (
            <div style={styles.cell}>
                <p style={styles.cellTitle}>{label}</p>
                <p style={styles.empty}>No data uploaded yet.</p>
            </div>
        );
    }
    return (
        <div style={styles.cell}>
            <p style={styles.cellTitle}>{label}</p>
            <div style={styles.dateRange}>
                {data.earliest} → {data.latest}
            </div>
            <div style={styles.meta}>
                {data.record_count} records over {data.expected_business_days} business days
            </div>
            {data.missing_count > 0 ? (
                <div
                    style={styles.missing}
                    title={data.missing_dates.length ? `First missing dates: ${data.missing_dates.join(', ')}${data.missing_count > data.missing_dates.length ? '...' : ''}` : undefined}
                >
                    ⚠ Missing {data.missing_count} business day{data.missing_count === 1 ? '' : 's'}
                </div>
            ) : (
                <div style={styles.missingNone}>✓ No missing business days</div>
            )}
        </div>
    );
}

export default function DataSummaryCard({ accessToken, onLoaded, refreshKey }: Props) {
    const [summary, setSummary] = useState<DataSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;
        let cancelled = false;
        const fetchSummary = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
                const res = await fetch(`${apiBaseUrl}/files/data-summary`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ detail: 'Failed to load data summary.' }));
                    throw new Error(err.detail || 'Failed to load data summary.');
                }
                const data: DataSummary = await res.json();
                if (cancelled) return;
                setSummary(data);
                onLoaded?.(data);
            } catch (e: unknown) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'Failed to load data summary.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        fetchSummary();
        return () => {
            cancelled = true;
        };
    }, [accessToken, refreshKey, onLoaded]);

    return (
        <div style={styles.wrapper}>
            <h3 style={styles.title}>📊 Your Uploaded Data</h3>
            {isLoading && <p style={styles.empty}>Loading data summary...</p>}
            {error && <p style={styles.error}>{error}</p>}
            {!isLoading && !error && summary && (
                <div style={styles.grid}>
                    <CurrencyCell label="CAD" data={summary.cad} />
                    <CurrencyCell label="USD" data={summary.usd} />
                </div>
            )}
        </div>
    );
}
