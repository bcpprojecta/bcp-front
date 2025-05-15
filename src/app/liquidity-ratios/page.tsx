'use client';

import { useState, useEffect, FormEvent } from 'react';
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

// Helper function to format number string with commas for display
const formatNumberWithCommas = (value: string | null | undefined): string => {
    if (value === null || value === undefined || value.trim() === '') return '';
    // Pass through intermediate input states like just a minus or a decimal point
    if (value === '-' || value === '.' || value === '-.') return value;

    const parts = value.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts.slice(1).join('') : '';

    // Avoid formatting if integer part is empty or just a minus (e.g. for ".5" or "-.5")
    // The actual value stored in state for ".5" would be ".5" or "0.5" based on handleValueChange
    if (integerPart === '' || integerPart === '-') {
        return value; 
    }

    const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedIntegerPart + decimalPart;
};

export default function LiquidityRatiosPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null); // Added to store token

  const [reportingDate, setReportingDate] = useState<string>('');
  const [items, setItems] = useState<LiquidityItem[]>(initialItems);
  const [results, setResults] = useState<{ 
    reportingDate: string; 
    statutoryRatio: string; 
    coreRatio: string; 
    totalRatio: string; 
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For loading state on submit
  const [submitError, setSubmitError] = useState<string | null>(null); // For API errors

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem('accessToken');
    if (!tokenFromStorage) {
      router.push('/login');
    } else {
      setAccessToken(tokenFromStorage); // Store token
      const fetchUser = async () => {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
          const response = await fetch(`${apiBaseUrl}/auth/users/me`, {
            headers: {
              'Authorization': `Bearer ${tokenFromStorage}`,
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
    router.push('/login');
  };

  const handleValueChange = (id: string, inputValueFromDisplay: string) => {
    // inputValueFromDisplay is what user typed/sees in the formatted input
    // Convert it back to a raw numeric string to store in state
    let rawNumericString = inputValueFromDisplay.replace(/,/g, ''); // Remove commas

    // Validate and allow only valid characters for a number string
    // (e.g., digits, one decimal, optional leading minus)
    // Regex allows: empty, "-", "123", "123.", ".5", "-123", "-123.", "-.5"
    if (
        rawNumericString === '' ||
        rawNumericString === '-' ||
        /^-?\d*\.?\d*$/.test(rawNumericString)
    ) {
        setItems(prevItems =>
            prevItems.map(item =>
                item.id === id ? { ...item, value: rawNumericString } : item
            )
        );
    }
    // If input is invalid after stripping commas (e.g., "1.2.3" or "abc"), 
    // do nothing, keeping the previous valid state.
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
      // Filter for valid numeric strings, allowing empty for clearing or partials like "."
      .filter(v => v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v) ); 
    console.log("Processed pasted values (after split, trim, comma removal, regex filter):", pastedValues);

    if (pastedValues.length === 0 && pastedText.trim() !== '') { // Check if pastedText was not empty but resulted in no valid values
      console.log("No valid values to paste after processing from non-empty input.");
      // Optionally, provide feedback to the user here if needed.
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
          // The pastedValue is already a cleaned, unformatted numeric string
          console.log(`Attempting to set item at index ${targetIndex} (id: ${newItems[targetIndex].id}) to value: '${pastedValue}'`);
          newItems[targetIndex] = { ...newItems[targetIndex], value: pastedValue };
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
    setSubmitError(null); // Reset error on new submission

    if (!reportingDate) {
      alert('Please enter the Reporting Date.');
      return;
    }
    // Frontend calculation for immediate UI update (same as before)
    const dataToSubmitForUI = {
      reportingDate,
      values: items.reduce((acc, item) => {
        const numericValue = parseFloat(item.value);
        acc[item.code] = isNaN(numericValue) ? 0 : numericValue;
        return acc;
      }, {} as Record<string, number>),
    };

    const values = dataToSubmitForUI.values;
    const statutory_liquidity_codes = ['1010', '1040', '1060', '1078', '1079'];
    const deposit_and_debt_codes = ['2180', '2050', '2255', '2295'];
    const core_cash_codes = ['1100'];
    const borrowings_codes = ['2050'];
    const member_deposits_codes = ['2180'];

    const sumValues = (codes: string[]) => codes.reduce((sum, code) => sum + (values[code] || 0), 0);
    const liquidity_available = sumValues(statutory_liquidity_codes);
    const deposits_and_debt = sumValues(deposit_and_debt_codes);
    const total_cash_liquid = sumValues(core_cash_codes);
    const borrowings = sumValues(borrowings_codes);
    const member_deposits = sumValues(member_deposits_codes);

    const statutory_ratio_calc = deposits_and_debt !== 0 ? (liquidity_available / deposits_and_debt) : 0;
    const core_ratio_calc = member_deposits !== 0 ? ((total_cash_liquid - borrowings) / member_deposits) : 0;
    const total_ratio_calc = member_deposits !== 0 ? (total_cash_liquid / member_deposits) : 0;

    setResults({
      reportingDate: dataToSubmitForUI.reportingDate,
      statutoryRatio: statutory_ratio_calc !== 0 ? (statutory_ratio_calc * 100).toFixed(2) + '%' : 'N/A',
      coreRatio: core_ratio_calc !== 0 ? (core_ratio_calc * 100).toFixed(2) + '%' : 'N/A',
      totalRatio: total_ratio_calc !== 0 ? (total_ratio_calc * 100).toFixed(2) + '%' : 'N/A',
    });

    // --- API Call to save data ---
    setIsSubmitting(true);
    const payloadForApi: { [key: string]: number | null | string } = {
      reporting_date: reportingDate, // YYYY-MM-DD format from input type="date"
    };
    items.forEach(item => {
      // Use item.code as key for API, matching Pydantic aliases
      const numericValue = parseFloat(item.value);
      payloadForApi[item.code] = isNaN(numericValue) ? null : numericValue; // Send null for empty/invalid so backend can handle default or skip
    });

    try {
      if (!accessToken) {
        throw new Error("Access token not available. Please login again.");
      }
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBaseUrl}/liquidity-ratios/`, { // Note the trailing slash if your FastAPI router needs it
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payloadForApi),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to save data. Please try again." }));
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }

      const savedData = await response.json();
      console.log('Successfully saved liquidity ratios:', savedData);
      // Optionally, you can show a success message to the user
      // alert('Ratios calculated and saved successfully!');

    } catch (error) {
      let errorMessage = "An unexpected error occurred while saving.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      console.error("Error saving liquidity ratios:", error);
      setSubmitError(errorMessage);
      // alert(`Error saving data: ${errorMessage}`); // Or display error more gracefully
    } finally {
      setIsSubmitting(false);
    }
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
                <label
                  htmlFor={item.id}
                  className="block text-sm font-medium text-slate-700 mb-1 md:hidden" // Show on mobile
                >
                  {item.description || `Code ${item.code}`}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id={item.id}
                  value={formatNumberWithCommas(item.value)}
                  onChange={(e) => handleValueChange(item.id, e.target.value)}
                  onPaste={(e) => handlePasteValues(e, item.id)}
                  className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm w-full text-slate-900 text-right tabular-nums"
                  placeholder="Enter value"
                />
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              className="inline-flex justify-center rounded-md py-3 px-5 text-base font-medium text-white bg-[#2A4365] hover:bg-[#223550] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors duration-200 ease-in-out"
              disabled={isSubmitting} // Disable button while submitting
            >
              {isSubmitting ? 'Saving...' : 'Calculate Ratios'} 
            </button>
          </div>
        </form>
      </div>

      {/* Display API submission error if any */}
      {submitError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative max-w-[800px] mx-auto mt-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{submitError}</span>
        </div>
      )}

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