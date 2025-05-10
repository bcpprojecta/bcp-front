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

// Define the initial state for the form items
const initialItems: UsdExposureItem[] = [
  { id: 'usd_total_assets', code: 'totalAssets', description: 'Total Assets', value: '' },
  { id: 'usd_total_liabilities', code: 'totalLiabilities', description: 'Total Liabilities', value: '' },
  { id: 'usd_total_capital', code: 'totalCapital', description: 'Total Capital', value: '' },
];

export default function UsdExposurePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [reportingDate, setReportingDate] = useState<string>('');
  const [items, setItems] = useState<UsdExposureItem[]>(initialItems);
  const [results, setResults] = useState<{ 
    reportingDate: string; 
    usdExposure: string; 
  } | null>(null); // Changed any to a specific type

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    } else {
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

  const handleValueChange = (id: string, newValue: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, value: newValue } : item
      )
    );
  };

  const handlePasteValues = (event: ClipboardEvent<HTMLInputElement>, itemId: string) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text/plain');
    const pastedValues = pastedText
      .split(/\r\n|\n|\r|\t/)
      .map(v => v.trim())
      .map(v => v.replace(/,/g, ''))
      .filter(v => v !== '' && !isNaN(parseFloat(v)));

    if (pastedValues.length === 0) return;

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
    if (!reportingDate) {
      alert('Please enter the Reporting Date.');
      return;
    }
    const dataToSubmit = {
      reportingDate,
      values: items.reduce((acc, item) => {
        const numericValue = parseFloat(item.value);
        acc[item.code] = isNaN(numericValue) ? 0 : numericValue;
        return acc;
      }, {} as Record<string, number>),
    };

    const { totalAssets, totalLiabilities, totalCapital } = dataToSubmit.values;
    const usdExposure = (totalAssets || 0) + (totalLiabilities || 0) + (totalCapital || 0);

    setResults({
      reportingDate: dataToSubmit.reportingDate,
      usdExposure: usdExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
                  type="number"
                  id={item.id}
                  step="any"
                  value={item.value}
                  onChange={(e) => handleValueChange(item.id, e.target.value)}
                  onPaste={(e) => handlePasteValues(e, item.id)}
                  onWheel={(event) => { event.currentTarget.blur(); }}
                  onKeyDown={(event) => {
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
              Calculate USD Exposure
            </button>
          </div>
        </form>
      </div>

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
            <p className="mt-1 text-2xl font-semibold text-sky-600">{results.usdExposure}</p>
          </div>
        </div>
      )}
    </div>
  );
} 