import React, { useState } from "react";
import { Calendar } from "lucide-react";

const DateRangeFilter = ({ onDateChange }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  };

  // Quick filters
  const quickFilters = {
    today: () => {
      const today = getCurrentDate();
      setStartDate(today);
      setEndDate(today);
      handleApply(today, today);
    },
    yesterday: () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
      handleApply(yesterdayStr, yesterdayStr);
    },
    thisWeek: () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startDate = startOfWeek.toISOString().split("T")[0];
      const endDate = getCurrentDate();
      setStartDate(startDate);
      setEndDate(endDate);
      handleApply(startDate, endDate);
    },
    lastWeek: () => {
      const today = new Date();
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      const startDate = startOfLastWeek.toISOString().split("T")[0];
      const endDate = endOfLastWeek.toISOString().split("T")[0];
      setStartDate(startDate);
      setEndDate(endDate);
      handleApply(startDate, endDate);
    },
    reset: () => {
      setStartDate("");
      setEndDate("");
      handleApply("", "");
    },
  };

  const handleApply = (start = startDate, end = endDate) => {
    if (onDateChange) {
      onDateChange({ startDate: start, endDate: end });
    }
    setShowCalendar(false);
  };

  return (
    <div className="relative z-20 flex bg-white rounded-lg shadow-xs p-4">
      <div className="flex items-center gap-4">
        <button
          variant="outline"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition duration-300"
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <Calendar className="w-5 h-5 " />
          <span className="text-sm text-gray-700">
            {startDate || endDate
              ? `${startDate || "..."} - ${endDate || "..."}`
              : "Select Date Range"}
          </span>
        </button>
        {(startDate || endDate) && (
          <button
            onClick={quickFilters.reset}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Reset
          </button>
        )}
      </div>

      {showCalendar && (
        <div className="absolute top-14 left-0 z-50 w-80 bg-white shadow-xs rounded-lg overflow-hidden transition-all duration-300">
          <div className="p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-gray-600">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 transition"
                />
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-gray-600">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  variant="outline"
                  size="sm"
                  onClick={quickFilters.today}
                  className="w-full py-2 rounded-lg border hover:bg-indigo-100 transition"
                >
                  Today
                </button>
                <button
                  variant="outline"
                  size="sm"
                  onClick={quickFilters.yesterday}
                  className="w-full py-2 rounded-lg border hover:bg-indigo-100 transition"
                >
                  Yesterday
                </button>
                <button
                  variant="outline"
                  size="sm"
                  onClick={quickFilters.thisWeek}
                  className="w-full py-2 rounded-lg border hover:bg-indigo-100 transition"
                >
                  This Week
                </button>
                <button
                  variant="outline"
                  size="sm"
                  onClick={quickFilters.lastWeek}
                  className="w-full py-2 rounded-lg border hover:bg-indigo-100 transition"
                >
                  Last Week
                </button>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  variant="outline"
                  onClick={() => setShowCalendar(false)}
                  className="px-6 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 border rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApply()}
                  className="px-6 py-2 text-sm font-semibold rounded text-white bg-primary transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
