"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { format } from "date-fns" // Unused
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  // Bar, // Unused
  // BarChart, // Unused
  Tooltip as ChartTooltipRecharts,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useTranslation } from "react-i18next"
import { DonationTransactionFE as Donation, Campaign } from "@/lib/types"
import { 
  getYear,
  getMonth, // 0-indexed month
  startOfYear,
  endOfYear,
  subYears,
  isWithinInterval,
  format // For formatting month names
} from 'date-fns';
import { enUS, es } from 'date-fns/locale'; // Import locales for month names

interface DonationChartsProps {
  donations: Donation[];
  campaigns: Campaign[];
  startDate?: Date;
  endDate?: Date;
}

export function DonationCharts({ donations, campaigns, startDate, endDate }: DonationChartsProps) {
  // Load charts namespace
  const { t, i18n } = useTranslation();

  // Filter donations based on date range from props (this is the global filter)
  const globallyFilteredDonations = donations.filter((donation: Donation) => {
    if (!startDate && !endDate) return true;
    const donationDate = new Date(donation.transactionDate);
    if (startDate && endDate) {
      return donationDate >= startDate && donationDate <= endDate;
    } else if (startDate) {
      return donationDate >= startDate;
    } else if (endDate) {
      return donationDate <= endDate;
    }
    return true;
  });

  const today = new Date();
  const currentYear = getYear(today);
  const previousYear = currentYear - 1;

  // Helper to aggregate donations by year-month key
  const aggregateByYearMonth = (donationsToAggregate: Donation[]) => {
    return donationsToAggregate.reduce((acc: { [key: string]: number }, donation: Donation) => {
      const date = new Date(donation.transactionDate);
      const year = getYear(date);
      const month = getMonth(date); // 0 for Jan, 1 for Feb, etc.
      const key = `${year}-${month}`;
      
      // Parse amount - it should be a string from the API
      const amount = parseFloat(donation.amount) || 0;
      
      acc[key] = (acc[key] || 0) + amount;
      return acc;
    }, {});
  };

  // Determine the data sets and labels for the trend chart
  const { currentPeriodDonations, previousPeriodDonations, currentLabel, previousLabel } = (() => {
    if (startDate && endDate) {
      // Date range is selected, so we use the globally filtered donations for the current period
      const prevStartDate = subYears(startDate, 1);
      const prevEndDate = subYears(endDate, 1);
      const previousDonations = donations.filter(d =>
        isWithinInterval(new Date(d.transactionDate), { start: prevStartDate, end: prevEndDate })
      );
      
      return {
        currentPeriodDonations: globallyFilteredDonations, // Use the already filtered data
        previousPeriodDonations: previousDonations,
        currentLabel: t('charts.donationCharts.currentPeriodLabel', 'Current Period'),
        previousLabel: t('charts.donationCharts.previousPeriodLabel', 'Previous Period'),
      };
    } else {
      // No date range, default to full current year vs full previous year
      const currentYearStart = startOfYear(today);
      const currentYearEnd = endOfYear(today);
      const currentDonations = globallyFilteredDonations.filter(d =>
        isWithinInterval(new Date(d.transactionDate), { start: currentYearStart, end: currentYearEnd })
      );

      const previousYearRefDate = subYears(today, 1);
      const previousYearStart = startOfYear(previousYearRefDate);
      const previousYearEnd = endOfYear(previousYearRefDate);
      const previousDonations = donations.filter(d =>
        isWithinInterval(new Date(d.transactionDate), { start: previousYearStart, end: previousYearEnd })
      );

      return {
        currentPeriodDonations: currentDonations,
        previousPeriodDonations: previousDonations,
        currentLabel: t('charts.donationCharts.currentYearLabel', { year: currentYear }),
        previousLabel: t('charts.donationCharts.previousYearLabel', { year: previousYear }),
      };
    }
  })();

  const aggregatedCurrentPeriod = aggregateByYearMonth(currentPeriodDonations);
  const aggregatedPreviousPeriod = aggregateByYearMonth(previousPeriodDonations);

  // Get locale for month formatting
  const dLocale = i18n.language === 'es' ? es : enUS;

  // Prepare data for the line chart
  const trendChartData = (() => {
    if (startDate && endDate) {
      // When date range is selected, only show months within that range
      const months = [];
      const currentDate = new Date(startDate);
      
      // Iterate through each month in the range
      while (currentDate <= endDate) {
        const year = getYear(currentDate);
        const month = getMonth(currentDate);
        const currentKey = `${year}-${month}`;
        
        // For previous period, subtract 1 year
        const prevYear = year - 1;
        const prevKey = `${prevYear}-${month}`;
        
        // Only show year if the range spans multiple years
        const showYear = getYear(startDate) !== getYear(endDate);
        const monthFormat = showYear ? 'MMM yyyy' : 'MMM';
        
        months.push({
          month: format(currentDate, monthFormat, { locale: dLocale }),
          currentYearAmount: aggregatedCurrentPeriod[currentKey] || 0,
          previousYearAmount: aggregatedPreviousPeriod[prevKey] || 0,
        });
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      return months;
    } else {
      // No date range selected, show months from January to current month
      const currentMonth = getMonth(today);
      return Array.from({ length: currentMonth + 1 }, (_, i) => {
        const monthDate = new Date(currentYear, i, 1);
        const currentKey = `${currentYear}-${i}`;
        const prevKey = `${previousYear}-${i}`;
        
        return {
          month: format(monthDate, 'MMM', { locale: dLocale }),
          currentYearAmount: aggregatedCurrentPeriod[currentKey] || 0,
          previousYearAmount: aggregatedPreviousPeriod[prevKey] || 0,
        };
      });
    }
  })();

  // --- Original aggregations for Pie chart (Donations by Fund) ---
  const getFundNameForChart = (fundNameFromData: string | null | undefined) => {
    return fundNameFromData || t('charts.donationCharts.unknownFund', 'Unknown Fund');
  }

  // Aggregate data for charts
  const donationByFund = globallyFilteredDonations.reduce((acc: { [key: string]: number }, donation: Donation) => {
    const fundName = getFundNameForChart(donation.donationTypeName);
    acc[fundName] = (acc[fundName] || 0) + 1;
    return acc;
  }, {});

  // Format data for charts
  const pieChartData = Object.entries(donationByFund).map(([name, value]) => ({ name, value }));

  const lineChartConfig = {
    currentYearAmount: {
      label: currentLabel,
      color: "hsl(var(--chart-1))",
    },
    previousYearAmount: {
      label: previousLabel,
      color: "hsl(var(--chart-2))",
    },
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCurrencyTooltip = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">{t('charts.donationCharts.trendsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={lineChartConfig} 
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart accessibilityLayer data={trendChartData} margin={{ left: 12, right: 12, top: 5, bottom: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickFormatter={formatCurrency} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return formatCurrencyTooltip(value);
                    }
                    return value;
                  }}
                />
                <Line
                  dataKey="currentYearAmount"
                  type="monotone"
                  stroke="var(--color-currentYearAmount, hsl(var(--chart-1)))" 
                  name={lineChartConfig.currentYearAmount.label} 
                  strokeWidth={2}
                  dot={{
                    fill: "var(--color-currentYearAmount, hsl(var(--chart-1)))", 
                  }}
                  activeDot={{
                    r: 6,
                    fill: "var(--color-currentYearAmount, hsl(var(--chart-1)))", 
                    stroke: "hsl(var(--background))", 
                    strokeWidth: 2
                  }}
                />
                <Line
                  dataKey="previousYearAmount"
                  type="monotone"
                  stroke="var(--color-previousYearAmount, hsl(var(--chart-2)))" 
                  name={lineChartConfig.previousYearAmount.label} 
                  strokeWidth={2}
                  dot={{
                    fill: "var(--color-previousYearAmount, hsl(var(--chart-2)))", 
                  }}
                  activeDot={{
                    r: 6,
                    fill: "var(--color-previousYearAmount, hsl(var(--chart-2)))", 
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">{t('charts.donationCharts.donationsByFundTitle', 'Donations by Fund')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer
            config={{
              value: {
                label: t('charts.donationCharts.amountLabel'),
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="45%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      {/* Optional: Bar chart for donation methods if desired */}
      {/* <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-md">Donations by Method (Bar)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <ChartContainer config={{ amount: { label: "Amount", color: "hsl(var(--chart-3))" }}} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card> */}
    </div>
  )
}
