// lib/chart-utils.ts

// Define basic interfaces (consider moving to a shared types file)
interface DataPoint {
  date: string | Date;
  amount: number;
  category?: string;
  method?: string;
  // Add other potential fields
}

interface TimeSeriesDataPoint {
  label: string; // e.g., 'Jan', 'Feb', 'Mon', 'Tue'
  donations: number;
  expenses: number;
}

interface CategoryDataPoint {
  label: string; // e.g., 'Cash', 'Credit Card', 'Building Fund'
  value: number;
}

/**
 * Processes raw data (e.g., donations or expenses) for simple charts.
 * Groups data by a specified key (like 'date') and aggregates another key (like 'amount').
 *
 * @param data - Array of data points (e.g., Donation[] or Expense[]).
 * @param groupByKey - The key to group data by (e.g., 'date').
 * @param aggregateKey - The key to aggregate (e.g., 'amount').
 * @returns An array of objects suitable for charts (e.g., { date: '2024-01', amount: 500 }).
 */
export function processDataForChart(
  data: DataPoint[],
  groupByKey: keyof DataPoint,
  aggregateKey: keyof DataPoint,
): { [key: string]: string | number | Date }[] { // More specific return type
  // TODO: Implement processDataForChart
  // Placeholder implementation - return empty array or basic structure
  // Example: Group by month and sum amount
  return [];
}

/**
 * Processes donation and expense data into a time series format.
 *
 * @param donations - Array of donation data points.
 * @param expenses - Array of expense data points.
 * @returns An array of TimeSeriesDataPoint suitable for line/bar charts showing trends.
 */
export function processTimeSeriesData(
  donations: DataPoint[],
  expenses: DataPoint[],
): TimeSeriesDataPoint[] {
  // TODO: Implement processTimeSeriesData
  // Placeholder implementation - needs logic to group by time period (day, week, month)
  // and sum donations/expenses for each period.
  return [
    // { label: 'Jan', donations: 1200, expenses: 800 },
    // { label: 'Feb', donations: 1500, expenses: 950 },
  ];
}

/**
 * Processes data to group by a specific category.
 *
 * @param data - Array of data points.
 * @param categoryKey - The key representing the category (e.g., 'method' for donations, 'category' for expenses).
 * @returns An array of CategoryDataPoint suitable for pie/doughnut charts.
 */
export function processCategoryData(
  data: DataPoint[],
  categoryKey: keyof DataPoint,
): CategoryDataPoint[] {
  // TODO: Implement processCategoryData
  // Placeholder implementation - needs logic to group by the categoryKey and sum amounts.
  return [
    // { label: 'Cash', value: 500 },
    // { label: 'Credit Card', value: 750 },
  ];
} 