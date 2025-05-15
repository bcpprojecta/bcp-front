'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Import Chart components
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
    TimeScale, 
    Filler,
    TooltipItem // Import TooltipItem
} from 'chart.js';
import 'chartjs-adapter-date-fns'; 
// Import Recharts for USD Summary Chart
import { LineChart, Line as RechartsLine, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import React from 'react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale, 
    Filler
);

// Define interfaces for the data we expect later
interface ForecastDataRow {
    Date: string;
    'Forecasted Amount': number;
    'Forecasted Cash Balance': number;
    'Actual Cash Balance'?: number | null;
}

interface LiquidityRatioResult {
    // Define fields based on stuff/app/schemas/liquidity_ratio.py LiquidityRatioResult
    id: string;
    user_id: string;
    reporting_date: string;
    statutory_ratio: number;
    core_ratio: number;
    total_ratio: number;
    // Add input fields if they are part of the result schema and needed
    created_at: string; 
}

interface UsdExposureResult {
     // Define fields based on stuff/app/schemas/usd_exposure.py UsdExposureResult
    id: string;
    user_id: string;
    reporting_date: string;
    usd_exposure: number;
    // Add input fields if they are part of the result schema and needed
    created_at: string;
}

interface UsdSummaryItem {
    id: number; 
    user_id: string;
    "Reporting Date": string; 
    "Previous Balance": number; 
    "Opening Balance": number; 
    "Net Activity": number; 
    "Closing Balance": number; 
    currency: string | null;
    created_at: string;
    upload_metadata_id?: string; // Add if present in API response and needed
}

// Add interface for Recharts data points
interface UsdRechartDataPoint {
  date: string;
  balance: number | null;
}

// Function to fetch all pages of USD Summary data
async function fetchPaginatedUsdSummary(token: string, apiBaseUrl: string): Promise<UsdSummaryItem[]> {
    let allFetchedItems: UsdSummaryItem[] = [];
    let pageToFetch = 0;
    let moreDataExists = true;
    const ITEMS_PER_PAGE = 100; // Fetch in larger chunks if possible
    console.log("[fetchPaginatedUsdSummary] Starting fetch loop...");

    while (moreDataExists) {
        const skip = pageToFetch * ITEMS_PER_PAGE;
        try {
            const response = await fetch(`${apiBaseUrl}/summary-output/usd?skip=${skip}&limit=${ITEMS_PER_PAGE}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                let errorDetail = `Failed on page ${pageToFetch}. Status: ${response.status}`;
                try { errorDetail = (await response.json()).detail || errorDetail; } catch { /* ignore */ }
                throw new Error(`Failed to fetch USD summary data: ${errorDetail}`);
            }

            const fetchedPageData: UsdSummaryItem[] = await response.json();
            allFetchedItems = [...allFetchedItems, ...fetchedPageData];
            console.log(`[fetchPaginatedUsdSummary] Fetched page ${pageToFetch}, got ${fetchedPageData.length} items. Total now: ${allFetchedItems.length}`);

            if (fetchedPageData.length < ITEMS_PER_PAGE) {
                moreDataExists = false;
            } else {
                pageToFetch++;
            }
        } catch (error) {
            console.error(`[fetchPaginatedUsdSummary] Error during fetch loop (page ${pageToFetch}):`, error);
            throw error; // Re-throw to be caught by the caller
        }
    }
    console.log(`[fetchPaginatedUsdSummary] Finished fetch loop. Total items: ${allFetchedItems.length}`);
    return allFetchedItems;
}

export default function ReportPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for fetched data
    const [forecastData, setForecastData] = useState<ForecastDataRow[]>([]);
    const [liquidityResult, setLiquidityResult] = useState<LiquidityRatioResult | null>(null);
    const [exposureResult, setExposureResult] = useState<UsdExposureResult | null>(null);
    const [usdSummaryData, setUsdSummaryData] = useState<UsdSummaryItem[]>([]);
    const [usdRechartData, setUsdRechartData] = useState<UsdRechartDataPoint[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        const fetchAllReportData = async (token: string) => {
            setIsLoading(true);
            setError(null);
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
            const headers = { 'Authorization': `Bearer ${token}` };

            try {
                // Fetch first 3 items concurrently
                const firstThreePromises = Promise.allSettled([
                    fetch(`${apiBaseUrl}/files/forecast/latest?currency=cad`, { headers }),
                    fetch(`${apiBaseUrl}/liquidity-ratios/latest`, { headers }),
                    fetch(`${apiBaseUrl}/usd-exposure/latest`, { headers })
                ]);

                // Fetch USD summary data (paginated) concurrently with the first three
                const usdSummaryPromise = fetchPaginatedUsdSummary(token, apiBaseUrl);

                // Wait for all fetches to complete
                const [firstThreeResults, usdSummaryResult] = await Promise.all([
                    firstThreePromises,
                    usdSummaryPromise.catch(err => ({ status: 'error', error: err })) // Catch error specifically for summary fetch
                ]);

                let fetchError = false;
                const errorMessages: string[] = [];

                // Process Forecast Data (index 0)
                if (firstThreeResults[0].status === 'fulfilled' && firstThreeResults[0].value.ok) {
                    const data = await firstThreeResults[0].value.json();
                    setForecastData(data);
                } else {
                    fetchError = true;
                    const reason = firstThreeResults[0].status === 'rejected' ? firstThreeResults[0].reason : `HTTP ${firstThreeResults[0].value.status}`;
                    errorMessages.push(`Failed to fetch CAD forecast: ${reason}`);
                    setForecastData([]);
                }

                // Process Liquidity Ratio (index 1)
                if (firstThreeResults[1].status === 'fulfilled' && firstThreeResults[1].value.ok) {
                    const data = await firstThreeResults[1].value.json();
                    setLiquidityResult(data);
                } else {
                     if (firstThreeResults[1].status === 'fulfilled' && firstThreeResults[1].value.status === 404) {
                        setLiquidityResult(null); 
                    } else {
                        fetchError = true;
                        const reason = firstThreeResults[1].status === 'rejected' ? firstThreeResults[1].reason : `HTTP ${firstThreeResults[1].value.status}`;
                        errorMessages.push(`Failed to fetch liquidity ratio: ${reason}`);
                        setLiquidityResult(null); 
                    }
                }

                // Process USD Exposure (index 2)
                if (firstThreeResults[2].status === 'fulfilled' && firstThreeResults[2].value.ok) {
                    const data = await firstThreeResults[2].value.json();
                    setExposureResult(data);
                } else {
                     if (firstThreeResults[2].status === 'fulfilled' && firstThreeResults[2].value.status === 404) {
                        setExposureResult(null); 
                    } else {
                        fetchError = true;
                        const reason = firstThreeResults[2].status === 'rejected' ? firstThreeResults[2].reason : `HTTP ${firstThreeResults[2].value.status}`;
                        errorMessages.push(`Failed to fetch USD exposure: ${reason}`);
                        setExposureResult(null);
                    }
                }

                // Process USD Summary Data (from paginated fetch)
                // Type guard to check if it's the error object
                if (usdSummaryResult && typeof usdSummaryResult === 'object' && 'status' in usdSummaryResult && usdSummaryResult.status === 'error') {
                    fetchError = true;
                    const reason = usdSummaryResult.error?.message || "Unknown error during paginated fetch";
                    errorMessages.push(`Failed to fetch all USD summary data: ${reason}`);
                    console.error("Failed to fetch all USD summary data:", usdSummaryResult.error);
                    setUsdSummaryData([]);
                } else if (Array.isArray(usdSummaryResult)) {
                    // It's the successful result (UsdSummaryItem[])
                    const allUsdData = usdSummaryResult;
                    console.log("All Paginated USD Summary Data received:", allUsdData.length, "items");
                    setUsdSummaryData(allUsdData);
                } else {
                     // Should not happen, but handle unexpected case
                    fetchError = true;
                    errorMessages.push(`Unexpected result type for USD summary fetch.`);
                    console.error("Unexpected result type for USD summary fetch:", usdSummaryResult);
                    setUsdSummaryData([]);
                }

                if (fetchError) {
                    setError(errorMessages.join('; \n'));
                }

            } catch (err) {
                console.error("Overall error fetching report data:", err);
                setError('An unexpected error occurred while fetching report data.');
                setForecastData([]);
                setLiquidityResult(null);
                setExposureResult(null);
                setUsdSummaryData([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (token) {
            fetchAllReportData(token);
        }
    }, [router]);

    // ADD useEffect to process usdSummaryData for Recharts
    useEffect(() => {
        if (usdSummaryData.length === 0) {
            setUsdRechartData([]);
            return;
        }
        
        const dataWithDates = usdSummaryData
            .map(item => {
                const reportDate = item["Reporting Date"]; 
                const closingBalance = item["Closing Balance"]; 
                
                if (!reportDate || typeof reportDate !== 'string' || typeof closingBalance !== 'number') {
                    return null; 
                }
                try {
                    const dateObj = new Date(reportDate + 'T00:00:00Z'); // Ensure UTC for date part comparison
                    if (isNaN(dateObj.getTime())) {
                        return null; 
                    }
                    return {
                        reportDateObj: dateObj,
                        balanceValue: closingBalance,
                        originalReportDate: reportDate // Keep original string date for chart data key
                    };
                } catch (e) {
                    console.error("Error parsing date:", reportDate, e, "for item:", item);
                    return null;
                }
            })
            .filter(item => item !== null) as ({ reportDateObj: Date; balanceValue: number; originalReportDate: string })[];

        if (dataWithDates.length === 0) {
            setUsdRechartData([]);
            return;
        }

        // Sort by date descending to find the latest date for the 365-day window anchor
        const sortedByDateDesc = [...dataWithDates].sort((a, b) => b.reportDateObj.getTime() - a.reportDateObj.getTime());
        
        const latestDate = sortedByDateDesc[0].reportDateObj;
        const oneYearAgo = new Date(latestDate);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        // oneYearAgo.setDate(oneYearAgo.getDate() + 1); // Optional: to make it exactly 365 days from latestDate, inclusive

        // Filter for the last 365 days
        const filteredForLastYear = sortedByDateDesc.filter(item => 
            item.reportDateObj >= oneYearAgo && item.reportDateObj <= latestDate
        );

        if (filteredForLastYear.length === 0) {
            setUsdRechartData([]);
            return;
        }

        // Sort again by date ascending for the chart display
        const finalChartDataItems = [...filteredForLastYear].sort((a, b) => a.reportDateObj.getTime() - b.reportDateObj.getTime());

        const newChartData = finalChartDataItems.map(item => ({
            date: item.originalReportDate, // Use the original string date (YYYY-MM-DD) for Recharts dataKey
            balance: item.balanceValue,
        }));
        
        console.log("[ReportPage] Processed USD Summary for Recharts (last 365 days). Items:", newChartData.length);
        setUsdRechartData(newChartData);

    }, [usdSummaryData]);

    const handleDownloadPdf = () => {
        console.log("Download PDF clicked - using window.print()");
        // Trigger the browser's print dialog
        window.print(); 
    };

    // --- Chart Configuration ---
    const forecastChartData = {
        labels: forecastData.map(row => row.Date),
        datasets: [
            {
                label: 'Forecasted Cash Balance (CAD)',
                data: forecastData.map(row => row['Forecasted Cash Balance']),
                borderColor: 'rgb(255, 159, 64)', 
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                tension: 0.1,
                fill: false, 
            },
            {
                label: 'Actual Cash Balance (CAD)',
                data: forecastData.map(row => row['Actual Cash Balance']),
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.1,
                fill: false, 
                hidden: !forecastData.some(row => row['Actual Cash Balance'] !== null && row['Actual Cash Balance'] !== undefined) // Hide if no actual data
            },
        ],
    };

    const forecastChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'CAD Cash Balance Forecast vs Actual',
            },
            tooltip: {
                callbacks: {
                    label: function(context: TooltipItem<'line'>) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time' as const, // Use time scale
                time: {
                    unit: 'day' as const, // Display unit
                    tooltipFormat: 'PP' // Format for tooltip (e.g., Sep 21, 2023)
                },
                title: {
                    display: true,
                    text: 'Date',
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Balance (CAD)',
                },
                ticks: {
                    callback: function(value: number | string) {
                        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', notation: 'compact' }).format(typeof value === 'string' ? parseFloat(value) : value);
                    }
                }
            },
        },
    };

    // Helper to format currency
    const formatCurrency = (value: number | null | undefined, currencyCode: string = 'CAD') => {
        if (value === null || value === undefined) return 'N/A';
        return value.toLocaleString('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><p>Loading report data...</p></div>;
    }

    // Separate error display for overall fetch error
    if (error && !forecastData.length && !liquidityResult && !exposureResult && !usdSummaryData.length) {
        return <div className="text-red-600 p-4">{`Error loading report: ${error}`}</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6">Consolidated Report</h1>
            <div className="flex justify-end space-x-2 mb-4">
                <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                    Download PDF
                </button>
            </div>

            {/* Forecast Section */}
            <section className="mb-8 p-4 bg-white rounded shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Latest Forecast (CAD)</h2>
                {/* Chart */}
                <div className="mb-4 h-80 bg-gray-100 rounded p-2"> {/* Increased height */} 
                    {forecastData.length > 0 ? (
                        <Line options={forecastChartOptions} data={forecastChartData} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            {isLoading ? 'Loading Chart...' : 'No forecast data available to display chart.'}
                        </div>
                    )}
                </div> {/* End of CAD Chart div */}

                {/* === INSERTED USD SUMMARY CHART SECTION === */}
                <section className="mb-8 p-4 bg-white rounded shadow">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">USD Summary Chart</h2>
                    <div className="h-80 bg-gray-100 rounded p-2"> 
                        {/* {console.log("[Render] usdRechartData for chart condition:", usdRechartData)} */}
                        {usdRechartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                 <LineChart
                                    data={usdRechartData}
                                    margin={{
                                    top: 5, right: 30, left: 20, bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(value: number) => new Intl.NumberFormat('en-US').format(value)} />
                                    <RechartsTooltip formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value), 'Closing Balance (USD)']} />
                                    <RechartsLegend />
                                    <RechartsLine type="monotone" dataKey="balance" name="Closing Balance (USD)" stroke="#82ca9d" activeDot={{ r: 8 }} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                {/* {console.log("[Render] No data for chart, isLoading:", isLoading)} */}
                                {isLoading ? 'Loading Chart...' : 'No USD summary data available to display chart.'}
                            </div>
                        )}
                    </div>
                </section>

                {/* === INSERTED LIQUIDITY & EXPOSURE GRID === */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <section className="p-4 bg-white rounded shadow">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Latest Liquidity Ratio</h2>
                        <div className="text-gray-700 space-y-2">
                            {liquidityResult ? (
                                <>
                                    <p><strong>Reporting Date:</strong> {liquidityResult.reporting_date}</p>
                                    <p><strong>Statutory Ratio:</strong> {liquidityResult.statutory_ratio?.toFixed(2)}%</p>
                                    <p><strong>Core Ratio:</strong> {liquidityResult.core_ratio?.toFixed(2)}%</p>
                                    <p><strong>Total Ratio:</strong> {liquidityResult.total_ratio?.toFixed(2)}%</p>
                                    <p className="text-xs text-gray-500 pt-2">Calculated on: {new Date(liquidityResult.created_at).toLocaleString()}</p>
                                </>
                            ) : (
                                <p className="text-gray-500">
                                    {isLoading ? 'Loading...' : 'No liquidity ratio data found.'}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="p-4 bg-white rounded shadow">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Latest USD Exposure</h2>
                        <div className="text-gray-700 space-y-2">
                            {exposureResult ? (
                                 <>
                                    <p><strong>Reporting Date:</strong> {exposureResult.reporting_date}</p>
                                    <p><strong>Net USD Exposure:</strong> {formatCurrency(exposureResult.usd_exposure, 'USD')}</p>
                                    <p className="text-xs text-gray-500 pt-2">Calculated on: {new Date(exposureResult.created_at).toLocaleString()}</p>
                                 </>
                            ) : (
                                <p className="text-gray-500">
                                    {isLoading ? 'Loading...' : 'No USD exposure data found.'}
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Table */} 
                <div className="overflow-x-auto">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Forecast Data (CAD)</h2>
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecasted Amount</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecasted Cash Balance</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Cash Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {forecastData.length > 0 ? (
                                forecastData.map((row, index) => (
                                    <React.Fragment key={`${row.Date}-${index}`}>
                                        <tr> 
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{row.Date}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(row['Forecasted Amount'])}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(row['Forecasted Cash Balance'])}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(row['Actual Cash Balance'])}</td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-4 text-gray-500">
                                        {isLoading ? 'Loading data...' : 'No forecast data available.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section> {/* End of the main Forecast section that now includes the others */}
        </div>
    );
} 