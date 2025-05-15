'use client';

import { useState, useEffect, FormEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';

// Define the structure for each item
interface UsdExposureItem {
  id: string; // Unique identifier for each row
  code: string; // Internal code, e.g., 'totalAsset', 'totalLiabilities'
  description: string;
  value: string; // Store as string to handle empty input, convert to number on submission
}

// Define User interface
interface User {
  id: string;
  email: string;
}

// Define the structure for the calculated results to be displayed
interface CalculatedExposureDisplayResult {
  reportingDate: string;
  usdExposureValue: number; // Raw numeric value for logic
  usdExposureDisplay: string; // Formatted string for display
  usdExposureType: 'Short' | 'Long' | ''; // Text indication: Short, Long, or empty for zero
  textColorClassName: string; // Tailwind CSS class for color
}

// Define the initial state for the form items
const initialItems: UsdExposureItem[] = [
  { id: 'usd_total_assets', code: 'totalAssets', description: 'Total Assets', value: '' },
  { id: 'usd_total_liabilities', code: 'totalLiabilities', description: 'Total Liabilities', value: '' },
  { id: 'usd_total_capital', code: 'totalCapital', description: 'Total Capital', value: '' },
];

// Helper function to format number string with commas for display
const formatNumberWithCommas = (value: string | null | undefined): string => {
    if (value === null || value === undefined || value.trim() === '') return '';
    // Pass through intermediate input states like just a minus or a decimal point
    if (value === '-' || value === '.' || value === '-.') return value;

    const parts = value.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts.slice(1).join('') : '';

    // Avoid formatting if integer part is empty or just a minus
    if (integerPart === '' || integerPart === '-') {
        return value; 
    }

    const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedIntegerPart + decimalPart;
};

export default function UsdExposurePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null); // Added to store token

  const [reportingDate, setReportingDate] = useState<string>('');
  const [items, setItems] = useState<UsdExposureItem[]>(initialItems);
  const [results, setResults] = useState<CalculatedExposureDisplayResult | null>(null); 
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
            console.error('Session expired or invalid. Please login again.');
            return;
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
    let rawNumericString = inputValueFromDisplay.replace(/,/g, ''); 

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
  };

  const handlePasteValues = (event: ClipboardEvent<HTMLInputElement>, itemId: string) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text/plain');
    const pastedValues = pastedText
      .split(/\r\n|\n|\r|\t/)
      .map(v => v.trim())
      .map(v => v.replace(/,/g, ''))
      // Filter for valid numeric strings, allowing empty for clearing or partials like "."
      .filter(v => v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v));

    if (pastedValues.length === 0 && pastedText.trim() !== '') { 
        // No valid values from non-empty paste, do nothing or provide feedback
        return;
    }

    setItems(currentItems => {
      const newItems = [...currentItems];
      const startIndex = newItems.findIndex(item => item.id === itemId);
      if (startIndex === -1) return currentItems;

      pastedValues.forEach((pastedValue, i) => {
        const targetIndex = startIndex + i;
        if (targetIndex < newItems.length) {
          newItems[targetIndex] = { ...newItems[targetIndex], value: pastedValue };
        }
      });
      return newItems;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null); // Reset error

    if (!reportingDate) {
      alert('Please enter the Reporting Date.');
      return;
    }
    // Prepare data for UI and API
    const dataToSubmit = {
      reportingDate,
      values: items.reduce((acc, item) => {
        const numericValue = parseFloat(item.value);
        acc[item.code] = isNaN(numericValue) ? 0 : numericValue; // Use code for internal logic
        return acc;
      }, {} as Record<string, number>),
    };

    // Calculate for immediate UI update
    const { totalAssets, totalLiabilities, totalCapital } = dataToSubmit.values;
    // Apply Math.abs to each component before calculation
    const absTotalAssets = Math.abs(totalAssets || 0);
    const absTotalLiabilities = Math.abs(totalLiabilities || 0);
    const absTotalCapital = Math.abs(totalCapital || 0);

    const usdExposureCalc = absTotalAssets - absTotalLiabilities - absTotalCapital;
    
    let exposureType: 'Short' | 'Long' | '' = '';
    let textColor = 'text-slate-800'; // Default color for zero

    if (usdExposureCalc > 0) {
      exposureType = 'Long';
      textColor = 'text-green-600';
    } else if (usdExposureCalc < 0) {
      exposureType = 'Short';
      textColor = 'text-red-600';
    }

    setResults({
      reportingDate: dataToSubmit.reportingDate,
      usdExposureValue: usdExposureCalc,
      usdExposureDisplay: usdExposureCalc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      usdExposureType: exposureType,
      textColorClassName: textColor,
    });

    // --- API Call to save data --- 
    setIsSubmitting(true);
    const payloadForApi: { [key: string]: string | number | null } = {
        reporting_date: reportingDate,
    };
    items.forEach(item => {
      // Use item.code (e.g., 'totalAssets') as key for API, matching Pydantic aliases
      const numericValue = parseFloat(item.value);
      payloadForApi[item.code] = isNaN(numericValue) ? null : numericValue;
    });

    try {
      if (!accessToken) {
        throw new Error("Access token not available. Please login again.");
      }
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBaseUrl}/usd-exposure/`, { // Note the trailing slash
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
      console.log('Successfully saved USD exposure:', savedData);
      // alert('USD Exposure calculated and saved successfully!'); 

    } catch (error) {
      let errorMessage = "An unexpected error occurred while saving.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      console.error("Error saving USD exposure:", error);
      setSubmitError(errorMessage);
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

      <div className="bg-white p-6 sm:p-8 shadow-xl rounded-lg max-w-[800px] mx-auto">
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

        <h2 className="text-xl font-semibold mb-6 text-slate-800">USD Exposure Data Input</h2>

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
            <div className="grid grid-cols-[100px_1fr_200px] md:grid-cols-[auto_1fr_200px] gap-x-4 items-center pb-2 border-b border-slate-200 ">
              {/* Adjusted grid for Name, Value, Date structure requested for display if needed, but using Description, Value as per original */}
              {/* For USD Exposure, we only have Description and Value for input */}
              <span className="font-semibold text-slate-700 text-sm hidden md:block">Item</span>
              <span className="font-semibold text-slate-700 text-sm hidden md:block"></span> {/* Placeholder for potential Name column */}
              <span className="font-semibold text-slate-700 text-sm text-right md:text-left">Value</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-x-4 gap-y-1 items-center">
                <label htmlFor={item.id} className="text-sm font-medium text-slate-700">
                  {item.description}
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
              disabled={isSubmitting} // Disable button
            >
              {isSubmitting ? 'Saving...' : 'Calculate USD Exposure'}
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
          <h2 className="text-xl font-semibold mb-2 text-slate-800">Calculated USD Exposure</h2>
          {results.reportingDate && (
            <p className="text-sm text-slate-600 mb-6">
              For Reporting Date: <span className="font-semibold">{new Date(results.reportingDate + 'T00:00:00').toLocaleDateString('en-CA')}</span>
            </p>
          )}
          <div className="bg-slate-50 p-4 rounded-md shadow">
            <h3 className="text-sm font-medium text-slate-500">USD Exposure</h3>
            <div className="mt-1 flex items-baseline">
              <p className={`text-2xl font-semibold ${results.textColorClassName}`}>
                {results.usdExposureDisplay}
              </p>
              {results.usdExposureType && (
                <span className={`ml-2 text-sm font-medium ${results.textColorClassName}`}>
                  ({results.usdExposureType})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 