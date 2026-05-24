'use client';

import { useEffect, useMemo, useState } from 'react';

// "YYYY-MM-DD" -> "YYYY-MM-DD Mon" (local time, avoids UTC-shift surprises).
function formatWithWeekday(iso: string): string {
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    const wd = dt.toLocaleDateString('en-US', { weekday: 'short' });
    return `${iso} ${wd}`;
}

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
    missingToggle: {
        marginTop: '0.4rem',
        fontSize: '0.8rem',
        color: '#C53030',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left' as const,
        font: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
    },
    missingBox: {
        marginTop: '0.5rem',
        padding: '0.6rem 0.75rem',
        border: '1px solid #FCA5A5',
        borderRadius: '6px',
        backgroundColor: '#FEF2F2',
        position: 'relative' as const,
    },
    missingPre: {
        margin: 0,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.75rem',
        lineHeight: 1.5,
        color: '#7F1D1D',
        whiteSpace: 'pre' as const,
        maxHeight: '12rem',
        overflowY: 'auto' as const,
        userSelect: 'text' as const,
    },
    copyButton: {
        position: 'absolute' as const,
        top: '0.35rem',
        right: '0.35rem',
        padding: '0.2rem 0.55rem',
        fontSize: '0.7rem',
        fontWeight: 500,
        border: '1px solid #FCA5A5',
        borderRadius: '4px',
        backgroundColor: 'white',
        color: '#C53030',
        cursor: 'pointer',
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
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const missingText = useMemo(() => {
        if (!data) return '';
        return data.missing_dates.map(formatWithWeekday).join('\n');
    }, [data]);

    if (!data) {
        return (
            <div style={styles.cell}>
                <p style={styles.cellTitle}>{label}</p>
                <p style={styles.empty}>No data uploaded yet.</p>
            </div>
        );
    }

    const truncated = data.missing_count > data.missing_dates.length;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(missingText);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard might be unavailable (insecure context); the user can
            // still select the text manually.
        }
    };

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
                <>
                    <button
                        type="button"
                        style={styles.missingToggle}
                        onClick={() => setExpanded((v: boolean) => !v)}
                        aria-expanded={expanded}
                    >
                        <span>⚠ Missing {data.missing_count} business day{data.missing_count === 1 ? '' : 's'}</span>
                        <span>{expanded ? '▾' : '▸'}</span>
                    </button>
                    {expanded && (
                        <div style={styles.missingBox}>
                            <button
                                type="button"
                                style={styles.copyButton}
                                onClick={handleCopy}
                                title="Copy all missing dates to clipboard"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                            <pre style={styles.missingPre}>{missingText}</pre>
                            {truncated && (
                                <p style={{ marginTop: '0.4rem', marginBottom: 0, fontSize: '0.7rem', color: '#9B2C2C' }}>
                                    Showing first {data.missing_dates.length} of {data.missing_count}.
                                </p>
                            )}
                        </div>
                    )}
                </>
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
