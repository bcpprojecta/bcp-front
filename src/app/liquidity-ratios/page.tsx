'use client';

import { useState, useEffect, FormEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';

// Define the structure for each liquidity item
interface LiquidityItem {
  id: string; // Unique identifier for each row
  code: string;
  description: string;
  value: string; // Store as string to handle empty input, convert to number on submission
}

// Define User interface (mirroring dashboard/page.tsx)
interface User {
  id: string;
  email: string;
}

// Define the initial state for the form items with unique entries per code
const initialItems: LiquidityItem[] = [
  { id: 'code_1010', code: '1010', description: 'Cash', value: '' },
  { id: 'code_1040', code: '1040', description: 'MLP Deposits HQLA1 Govt Bonds', value: '' },
  { id: 'code_1060', code: '1060', description: 'SDebt Security Instruments', value: '' },
  { id: 'code_1078', code: '1078', description: 'MLP Deposits HQLA1 CMB/MBS', value: '' },
  { id: 'code_1079', code: '1079', description: 'MLP Deposits HQLA2B', value: '' },
  { id: 'code_1100', code: '1100', description: 'Total Assets', value: '' },
  { id: 'code_2050', code: '2050', description: 'Borrowings', value: '' },
  { id: 'code_2180', code: '2180', description: 'Member Deposits', value: '' },
  { id: 'code_2255', code: '2255', description: '', value: '' },
  { id: 'code_2295', code: '2295', description: '', value: '' },
];

export default function LiquidityRatiosPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [reportingDate, setReportingDate] = useState<string>('');
  const [items, setItems] = useState<LiquidityItem[]>(initialItems);
  const [results, setResults] = useState<any>(null); // To store calculation results

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
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
            // Optionally, throw an error or set an error state
            console.error('Session expired or invalid. Please login again.');
            return; // Stop further execution in this path
          }
          const userData: User = await response.json();
          setCurrentUser(userData);
        } catch (error) {
          console.error("Error fetching user:", error);
          localStorage.removeItem('accessToken');
          router.push('/login');
        }
      };
      fetchUser();
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setCurrentUser(null);
    setAccessToken(null);
    router.push('/login');
  };

  const handleValueChange = (id: string, newValue: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, value: newValue } : item
      )
    );
  };

  const handlePasteValues = (event: React.ClipboardEvent<HTMLInputElement>, itemId: string) => {
    event.preventDefault();
    console.log("handlePasteValues triggered for itemId:", itemId);
    const pastedText = event.clipboardData.getData('text/plain');
    console.log("Raw Pasted text:", JSON.stringify(pastedText)); // Log with JSON.stringify to see hidden chars

    const pastedValues = pastedText
      .split(/\r\n|\n|\r|\t/) // Split by newlines OR TABS
      .map(v => v.trim())     // Trim whitespace
      .map(v => v.replace(/,/g, '')) // Remove commas from numbers
      .filter(v => v !== '' && !isNaN(parseFloat(v))); // Remove empty strings and ensure it's a number-like string
    console.log("Processed pasted values (after split, trim, comma removal, NaN filter):", pastedValues);

    if (pastedValues.length === 0) {
      console.log("No valid values to paste after processing.");
      return;
    }

    setItems(currentItems => {
      console.log("Current items before paste:", currentItems);
      const newItems = [...currentItems];
      const startIndex = newItems.findIndex(item => item.id === itemId);
      console.log("Start index for pasting:", startIndex);

      if (startIndex === -1) {
        console.error("Error: Could not find start item with id:", itemId);
        return currentItems; // Should not happen
      }

      pastedValues.forEach((pastedValue, i) => {
        const targetIndex = startIndex + i;
        if (targetIndex < newItems.length) {
          // Ensure the value is a plain number string for the input field
          const cleanedValue = pastedValue; // Already cleaned by .map(v => v.replace(/,/g, ''))
          console.log(`Attempting to set item at index ${targetIndex} (id: ${newItems[targetIndex].id}) to value: '${cleanedValue}'`);
          newItems[targetIndex] = { ...newItems[targetIndex], value: cleanedValue };
        } else {
          console.log(`Skipping paste for index ${targetIndex}, out of bounds.`);
        }
      });
      console.log("New items after paste logic:", newItems);
      return newItems;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Basic validation
    if (!reportingDate) {
      alert('Please enter the Reporting Date.');
      return;
    }
    const dataToSubmit = {
      reportingDate,
      values: items.reduce((acc, item) => {
        // Convert value to number, default to 0 if empty or invalid
        const numericValue = parseFloat(item.value);
        acc[item.code] = isNaN(numericValue) ? 0 : numericValue;
        return acc;
      }, {} as Record<string, number>),
    };

    console.log('Submitting data:', dataToSubmit);

    const values = dataToSubmit.values;

    const statutory_liquidity_codes = ['1010', '1040', '1060', '1078', '1079'];
    const deposit_and_debt_codes = ['2180', '2050', '2255', '2295'];
    const core_cash_codes = ['1100'];
    const borrowings_codes = ['2050']; // From Python: ['2050']
    const member_deposits_codes = ['2180']; // From Python: ['2180']

    const sumValues = (codes: string[]) => codes.reduce((sum, code) => sum + (values[code] || 0), 0);

    const liquidity_available = sumValues(statutory_liquidity_codes);
    const deposits_and_debt = sumValues(deposit_and_debt_codes);
    const total_cash_liquid = sumValues(core_cash_codes);
    const borrowings = sumValues(borrowings_codes);
    const member_deposits = sumValues(member_deposits_codes);

    const statutory_ratio = deposits_and_debt !== 0 ? (liquidity_available / deposits_and_debt) : 0;
    const core_ratio = member_deposits !== 0 ? ((total_cash_liquid - borrowings) / member_deposits) : 0;
    const total_ratio = member_deposits !== 0 ? (total_cash_liquid / member_deposits) : 0;

    setResults({
      reportingDate: dataToSubmit.reportingDate,
      statutoryRatio: statutory_ratio !== 0 ? (statutory_ratio * 100).toFixed(2) + '%' : 'N/A',
      coreRatio: core_ratio !== 0 ? (core_ratio * 100).toFixed(2) + '%' : 'N/A',
      totalRatio: total_ratio !== 0 ? (total_ratio * 100).toFixed(2) + '%' : 'N/A',
    });
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-slate-700 text-lg">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Page Title - Restored and styled */}
      <h1 className="text-xl font-bold text-center mb-8">Liquidity Ratios</h1>

      {/* Main content white box for Data Input */}
      <div className="bg-white p-6 sm:p-8 shadow-xl rounded-lg max-w-[800px] mx-auto">
        {/* Header section for user info and logout - Adjusted for right alignment and styling */}
        <div className="flex justify-end items-center mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Logged in as: <span className="font-bold text-slate-700">{currentUser.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="py-2 px-4 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Original content of the data input box starts here */}
        <h2 className="text-xl font-semibold mb-6 text-slate-800">Liquidity Data Input</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="reportingDate" className="block text-sm font-medium text-slate-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="reportingDate"
              value={reportingDate}
              onChange={(e) => setReportingDate(e.target.value)}
              className="mt-1 block w-full max-w-xs rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-2 text-slate-900"
              required
            />
          </div>

          <div className="space-y-2 pt-4">
            {/* Header for the input list */}
            <div className="grid grid-cols-[100px_300px_200px] gap-x-4 items-center pb-2 border-b border-slate-200 md:grid">
              <span className="font-semibold text-slate-700 text-sm">Code</span>
              <span className="font-semibold text-slate-700 text-sm">Description</span>
              <span className="font-semibold text-slate-700 text-sm">Value</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-[100px_300px_200px] gap-x-4 gap-y-1 items-center">
                <label htmlFor={item.id} className="text-sm font-medium text-slate-700 md:hidden">
                  {item.description} ({item.code})
                </label>
                 <span className="text-sm font-medium text-slate-700 hidden md:block">{item.code}</span>
                 <span className="text-sm text-slate-600 hidden md:block">{item.description}</span>
                <input
                  type="number"
                  id={item.id}
                  step="any" // Allows decimals
                  value={item.value}
                  onChange={(e) => handleValueChange(item.id, e.target.value)}
                  onPaste={(e) => handlePasteValues(e, item.id)}
                  onWheel={(event) => {
                    // Prevent mouse wheel from changing the number
                    event.currentTarget.blur(); // Or (event.target as HTMLInputElement).blur();
                    // As an alternative, for some browsers, you might need to preventDefault if blur isn't enough or preferred:
                    // event.preventDefault(); 
                  }}
                  onKeyDown={(event) => {
                    // Prevent ArrowUp and ArrowDown from changing the number
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Enter value"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-2 text-slate-900"
                />
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              className="inline-flex justify-center rounded-md py-3 px-5 text-base font-medium text-white bg-[#2A4365] hover:bg-[#223550] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors duration-200 ease-in-out"
            >
              Calculate Ratios
            </button>
          </div>
        </form>
      </div>

      {results && (
        <div className="bg-white p-6 sm:p-8 shadow-xl rounded-lg max-w-[800px] mx-auto mt-6">
          <h2 className="text-xl font-semibold mb-2 text-slate-800">Calculated Ratios</h2>
          {results.reportingDate && (
            <p className="text-sm text-slate-600 mb-6">
              For Reporting Date: <span className="font-semibold">{new Date(results.reportingDate + 'T00:00:00').toLocaleDateString('en-CA')}</span>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-md shadow">
              <h3 className="text-sm font-medium text-slate-500">Statutory Liquidity Ratio</h3>
              <p className="mt-1 text-2xl font-semibold text-sky-600">{results.statutoryRatio}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-md shadow">
              <h3 className="text-sm font-medium text-slate-500">Core Liquidity Ratio</h3>
              <p className="mt-1 text-2xl font-semibold text-sky-600">{results.coreRatio}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-md shadow">
              <h3 className="text-sm font-medium text-slate-500">Total Liquidity Ratio</h3>
              <p className="mt-1 text-2xl font-semibold text-sky-600">{results.totalRatio}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 