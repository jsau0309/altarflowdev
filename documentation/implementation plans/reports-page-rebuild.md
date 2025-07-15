# Reports Page Rebuild Implementation Plan

## Overview
Complete rebuild of the reports page to provide clean, performant, and user-friendly financial reporting for churches using Chart.js for visualizations.

## Requirements Summary

### Functional Requirements
1. **Two Report Types**:
   - Donation Reports
   - Expense Reports
   - (Campaign Reports removed from scope)

2. **Visualizations** (Display only, not in exports):
   - Bar Chart: YTD month-to-month comparison (January to current month)
   - Pie Chart: Category breakdown
     - Donations: Offering, Tithe
     - Expenses: Utilities, Supplies, Maintenance, Salaries, Events, Other

3. **Filtering**:
   - Date range picker for custom time periods
   - Apply filters only on user action (not real-time)

4. **Export Functionality**:
   - PDF export with charts and summary
   - CSV export of raw data

5. **Performance**:
   - No unnecessary data fetching
   - Efficient state management
   - Clear loading states

### Non-Functional Requirements
- Clean, maintainable code structure
- Responsive design
- Internationalization support
- Accessibility compliance

## Technical Architecture

### Technology Stack
- **Charts**: Chart.js (replacing Recharts)
- **PDF Generation**: jsPDF with html2canvas for charts
- **CSV Export**: Existing implementation
- **State Management**: React hooks with proper separation of concerns
- **Data Fetching**: Server actions with proper caching

### Component Structure
```
components/
├── reports/
│   ├── reports-page.tsx (main container)
│   ├── report-filters.tsx (date range picker)
│   ├── report-summary.tsx (cards with totals)
│   ├── charts/
│   │   ├── monthly-bar-chart.tsx
│   │   └── category-pie-chart.tsx
│   └── export/
│       ├── pdf-exporter.tsx
│       └── csv-exporter.tsx
```

## Implementation Steps

### Phase 1: Setup and Data Layer (Day 1)
1. **Create new component structure**
   - Move existing reports-content.tsx to reports-content.old.tsx for reference
   - Create new clean component structure
   
2. **Install Chart.js**
   ```bash
   npm install chart.js react-chartjs-2
   npm install jspdf html2canvas
   ```

3. **Create data fetching utilities**
   - Separate API calls from UI components
   - Create proper TypeScript interfaces
   - Implement efficient caching strategy

### Phase 2: Core Components (Day 1-2)
1. **Report Filters Component**
   - Date range picker with temp state
   - Apply/Reset buttons
   - Clean UI with proper feedback

2. **Summary Cards**
   - Total Amount
   - Average Amount  
   - Count (donations) or Net Income (expenses)

3. **Tab Navigation**
   - Donations tab
   - Expenses tab
   - Proper state management

### Phase 3: Chart Implementation (Day 2)
1. **Monthly Bar Chart**
   - Dynamic months based on date range
   - Proper month labels
   - Currency formatting
   - Responsive design

2. **Category Pie Chart**
   - Fixed categories per type
   - Percentage display
   - Color coding
   - Legend

### Phase 4: Export Functionality (Day 3)
1. **CSV Export**
   - Include summary section at top
   - Full transaction details below
   - Proper date range in filename
   - Headers: Date, Description/Vendor, Category, Amount

2. **PDF Export**
   - Header with church name and date range
   - Summary statistics section
   - Full transaction table (no charts)
   - Professional layout with proper formatting
   - Page numbers and timestamps

### Phase 5: Testing and Polish (Day 3)
1. **Performance optimization**
   - Memoization where needed
   - Proper loading states
   - Error handling

2. **UI/UX polish**
   - Animations
   - Empty states
   - Mobile responsiveness

## Data Flow

```
User Action → Filter State → Apply Filter → Fetch Data → Update Charts → Display
                    ↓
              Export Action → Generate PDF/CSV → Download
```

## API Endpoints Needed

### Existing (to be optimized):
- `getDonationTransactions` - Add aggregation by month
- `getExpenses` - Create new server action

### New Server Actions:
```typescript
// Get monthly aggregated data
getMonthlySummary({
  type: 'donations' | 'expenses',
  startDate: Date,
  endDate: Date,
  churchId: string
})

// Get category breakdown
getCategorySummary({
  type: 'donations' | 'expenses',
  startDate: Date,
  endDate: Date,
  churchId: string
})
```

## State Management

```typescript
interface ReportsState {
  // Filter state
  activeTab: 'donations' | 'expenses'
  dateRange: { from: Date | null, to: Date | null }
  tempDateRange: { from: Date | null, to: Date | null }
  
  // Data state
  monthlyData: MonthlyData[]
  categoryData: CategoryData[]
  summary: SummaryStats
  
  // UI state
  isLoading: boolean
  error: string | null
}
```

## Performance Considerations

1. **Data Fetching**
   - Fetch only on filter apply
   - Cache results for session
   - Aggregate on server side

2. **Chart Rendering**
   - Use React.memo for chart components
   - Destroy charts on unmount
   - Limit data points for performance

3. **Export Generation**
   - Generate in web worker if possible
   - Show progress for large exports
   - Optimize PDF file size

## Migration Strategy

1. Keep old component available during development
2. Implement feature flag to switch between versions
3. Gradual rollout to test with real data
4. Remove old implementation after validation

## Success Criteria

- [ ] Page loads in under 1 second
- [ ] Charts render smoothly with up to 24 months of data
- [ ] Exports complete in under 3 seconds
- [ ] No unnecessary re-renders or data fetches
- [ ] Works on mobile devices
- [ ] Supports English and Spanish

## PM Decisions

1. **Default date range**: Current month
2. **PDF/CSV exports**: Include summary and all transaction details (no charts in exports)
3. **Bar chart range**: Show from January of current year to current month (YTD view)
4. **Expense categories**: Fixed categories (Utilities, Supplies, Maintenance, Salaries, Events, Other)
5. **Real-time updates**: Not required

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feature/reports-page-rebuild`
3. Start with Phase 1 implementation
4. Daily progress updates
5. Deploy to staging for testing

---

**Timeline**: 3 days of focused development
**Risk**: Minimal as we're keeping the old version during development
**Dependencies**: Chart.js library, existing API endpoints