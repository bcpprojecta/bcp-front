'use client';

import { useState, useEffect, useCallback } from 'react'; // Removed Fragment
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Import Recharts components

// Define User interface
interface User {
  id: string;
  email: string;
}

// Define the structure for a summary row (adjust based on your actual table columns)
interface SummaryRow {
  id: number;
  "Reporting Date"?: string | null;
  "Previous Balance"?: number | null;
  "Opening Balance"?: number | null;
  "Net Activity"?: number | null;
  "Closing Balance"?: number | null; // API sends "Closing Balance"
  currency?: string | null; // This one matches
  created_at?: string | null; // Keep if needed, ensure API sends it or handle if not
  user_id?: string | null;
  upload_metadata_id?: string | null;
}

interface ChartDataPoint {
  date: string;
  balance: number | null;
}

export default function UsdSummaryOutputPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [anchorDateForChart, setAnchorDateForChart] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // Keep true initially
  const [dataError, setDataError] = useState<string | null>(null);
  const ITEMS_PER_LOAD = 10;
  const [displayedItemsCount, setDisplayedItemsCount] = useState<number>(ITEMS_PER_LOAD);

  const fetchUser = useCallback(async (token: string | null) => {
    if (!token) return false;
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const userResponse = await fetch(`${apiBaseUrl}/auth/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!userResponse.ok) {
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        setCurrentUser(null);
        router.push('/login');
        throw new Error('Session expired or invalid.');
      }
      const userData: User = await userResponse.json();
      setCurrentUser(userData);
      return true;
    } catch (error: unknown) {
      console.error("Error fetching user:", error);
      if (error instanceof Error) {
      setDataError(error.message || 'Failed to load user data.');
      } else {
        setDataError('An unknown error occurred while fetching user data.');
      }
      setIsLoadingData(false);
      return false;
    }
  }, [router]);

  const fetchAllSummaryData = useCallback(async (token: string | null) => {
    if (!token) return;
    setIsLoadingData(true);
    setDataError(null);
    let allFetchedItems: SummaryRow[] = [];
    let pageToFetch = 0;
    let moreDataExists = true;
    console.log("Starting to fetch all summary data for USD...");

    try {
      while (moreDataExists) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
        const skip = pageToFetch * ITEMS_PER_LOAD;
        const response = await fetch(`${apiBaseUrl}/summary-output/usd?skip=${skip}&limit=${ITEMS_PER_LOAD}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          let errorDetail = `Failed to fetch summary data (page ${pageToFetch}). Status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
          } catch {
            // Ignore if parsing errorData itself fails, original errorDetail is kept
          }
          throw new Error(errorDetail);
        }

        const fetchedPageData: SummaryRow[] = await response.json();
        allFetchedItems = [...allFetchedItems, ...fetchedPageData];

        if (fetchedPageData.length < ITEMS_PER_LOAD) {
          moreDataExists = false;
        } else {
          pageToFetch++;
        }
      }
      
      // --- NEW: Filter for the last 365 days --- 
      if (allFetchedItems.length > 0) {
        const itemsWithDates = allFetchedItems
          .map(item => {
            const reportDateStr = item["Reporting Date"];
            if (!reportDateStr) return null; // Skip items without a reporting date
            return { ...item, reportDateObj: new Date(reportDateStr + 'T00:00:00Z') }; // Ensure UTC for date part comparison
          })
          .filter(item => item !== null) as (SummaryRow & { reportDateObj: Date })[];

        if (itemsWithDates.length > 0) {
          itemsWithDates.sort((a, b) => b.reportDateObj.getTime() - a.reportDateObj.getTime()); // Sort descending to find latest
          
          const latestDate = itemsWithDates[0].reportDateObj;
          const oneYearAgo = new Date(latestDate);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          // oneYearAgo.setDate(oneYearAgo.getDate() + 1); // To make it exactly 365 days from latestDate inclusive of oneYearAgo date

          const filteredData = itemsWithDates.filter(item => 
            item.reportDateObj >= oneYearAgo && item.reportDateObj <= latestDate
          );

          setSummaryData(filteredData.map(({ reportDateObj: _reportDateObj, ...rest }) => rest)); // Remove temporary reportDateObj before setting state
          setDisplayedItemsCount(Math.min(ITEMS_PER_LOAD, filteredData.length));
          console.log(`Fetched all USD data, then filtered for last 365 days. Displaying: ${filteredData.length} items.`);
        } else {
          setSummaryData([]);
          setDisplayedItemsCount(0);
          console.log("No valid dates in fetched USD summary data to perform 365-day filter.");
        }
      } else {
        setSummaryData([]);
        setDisplayedItemsCount(0);
        console.log("No USD summary data fetched.");
      }
      // --- END NEW FILTERING LOGIC ---

    } catch (error: unknown) {
      console.error("Error fetching all summary data:", error);
      if (error instanceof Error) {
      setDataError(error.message || 'Failed to load all summary data.');
      } else {
        setDataError('An unknown error occurred while fetching all summary data.');
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [ITEMS_PER_LOAD]);

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem('accessToken');
    if (!tokenFromStorage) {
      router.push('/login');
      return;
    }
    setAccessToken(tokenFromStorage);

    const initLoad = async () => {
        const userFetched = await fetchUser(tokenFromStorage);
        if (userFetched && tokenFromStorage) { 
            await fetchAllSummaryData(tokenFromStorage); 
        } else if (!userFetched) {
             // setIsLoadingData(false); // fetchUser handles this on failure
        }
    };

    initLoad();
  }, [router, fetchUser, fetchAllSummaryData]);

  // Prepare chart data whenever summaryData changes
  useEffect(() => {
    if (summaryData.length === 0) {
      setChartData([]);
      setAnchorDateForChart(null);
      return;
    }

    // Convert string dates to Date objects and ensure "Closing Balance" is a number
    const dataWithDates = summaryData
      .map(item => {
        const reportDate = item["Reporting Date"];
        const closingBalance = item["Closing Balance"];
        if (!reportDate || typeof closingBalance !== 'number') {
          return null; // Skip items with invalid data for chart
        }
        return {
          ...item,
          reportDateObj: new Date(reportDate + 'T00:00:00Z'), // Use UTC to avoid timezone issues with date parts
          balanceValue: closingBalance,
        };
      })
      .filter(item => item !== null) as ({ reportDateObj: Date; balanceValue: number; "Reporting Date": string })[];

    if (dataWithDates.length === 0) {
        setChartData([]);
        setAnchorDateForChart(null);
        return;
    }
    
    // Sort by date descending to easily find the latest for anchor_date
    dataWithDates.sort((a, b) => b.reportDateObj.getTime() - a.reportDateObj.getTime());
    
    const latestDate = dataWithDates[0].reportDateObj;
    setAnchorDateForChart(latestDate.toLocaleDateString('en-CA')); // YYYY-MM-DD

    // No longer filtering for 1 year, use all data
    // const oneYearAgo = new Date(latestDate);
    // oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // const filteredForChart = dataWithDates.filter(item =>
    //   item.reportDateObj >= oneYearAgo && item.reportDateObj <= latestDate
    // );

    // Sort again by date ascending for the chart (dataWithDates is already sorted descending, so we reverse it or sort ascending)
    const allDataForChart = [...dataWithDates].sort((a, b) => a.reportDateObj.getTime() - b.reportDateObj.getTime());

    const newChartData = allDataForChart.map(item => ({
      date: item.reportDateObj.toLocaleDateString('en-CA'), // YYYY-MM-DD format
      balance: item.balanceValue,
    }));
    
    setChartData(newChartData);

  }, [summaryData]);

  const handleLoadMore = () => {
    setDisplayedItemsCount(prevCount => 
      Math.min(prevCount + ITEMS_PER_LOAD, summaryData.length)
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setCurrentUser(null);
    setAccessToken(null);
    router.push('/login');
    setSummaryData([]);
    setDisplayedItemsCount(ITEMS_PER_LOAD);
    setDataError(null);
    setIsLoadingData(true); 
  };

  if (!accessToken && !currentUser) { 
    // This state could be brief while useEffect runs and either sets accessToken or redirects.
    // Or if useEffect fails to set token (e.g. no token in localStorage).
    // To avoid flashing content or showing loading when redirecting.
    return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-slate-700 text-lg">Initializing...</p>
        </div>
      );
  }
  
  if (isLoadingData && summaryData.length === 0 && !dataError) { // Show initial loading only when no data and no error
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-slate-700 text-lg">Loading summary data...</p>
      </div>
    );
  }
  
  // If user fetch failed and resulted in redirect, currentUser might be null
  // accessToken might also be cleared if session was invalid.
  // The initial check for !tokenFromStorage in useEffect handles redirect.

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="bg-white p-6 sm:p-8 shadow-xl rounded-lg max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">USD Summary Output</h1>
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-sm text-slate-600">
                Logged in as: <span className="font-bold text-slate-700">{currentUser.email}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="py-2 px-4 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Chart Section */}
        {chartData.length > 0 && (
          <div className="mb-8 p-4 border rounded-lg shadow">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center">
              USD Cash Position (Up to {anchorDateForChart || 'Latest Data'})
            </h2>
            {/* Reminder to install recharts: npm install recharts or yarn add recharts */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value: number) => new Intl.NumberFormat('en-US').format(value)} />
                <Tooltip formatter={(value: number, name: string) => [new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value), name]} />
                <Legend />
                <Line type="monotone" dataKey="balance" name="Closing Balance (USD)" stroke="#82ca9d" activeDot={{ r: 8 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* More specific loading state for subsequent loads (e.g. Load More) */}
        {isLoadingData && summaryData.length > 0 && <p className="text-slate-600 text-center py-4">Loading more data...</p>}
        {dataError && <p className="text-red-600 bg-red-100 p-4 rounded-md text-center">Error: {dataError}</p>}
        
        {!isLoadingData && !dataError && summaryData.length === 0 && (
          <p className="text-slate-600 text-center py-10">No summary data found.</p>
        )}

        {summaryData.length > 0 && ( // Render table only if there's data
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Reporting Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Previous Balance
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Opening Balance
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Net Activity
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Closing Balance (USD)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {summaryData.slice(0, displayedItemsCount).map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {(row["Reporting Date"])
                        ? new Date(row["Reporting Date"] + 'T00:00:00').toLocaleDateString('en-CA')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                      {(row["Previous Balance"] !== undefined && row["Previous Balance"] !== null)
                        ? row["Previous Balance"].toLocaleString(undefined, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                      {(row["Opening Balance"] !== undefined && row["Opening Balance"] !== null)
                        ? row["Opening Balance"].toLocaleString(undefined, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                      {(row["Net Activity"] !== undefined && row["Net Activity"] !== null)
                        ? row["Net Activity"].toLocaleString(undefined, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                      {(row["Closing Balance"] !== undefined && row["Closing Balance"] !== null)
                        ? row["Closing Balance"].toLocaleString(undefined, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayedItemsCount < summaryData.length && !isLoadingData && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  className="py-2 px-4 rounded-md border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors"
                  disabled={isLoadingData} 
                >
                  {isLoadingData ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 