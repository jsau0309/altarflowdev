/**
 * Recharts type definitions for custom tooltip and label components
 * These types properly type the props passed to custom Recharts components
 */

import type { TooltipProps } from 'recharts';
import type { ValueType, NameType, Payload } from 'recharts/types/component/DefaultTooltipContent';

// Re-export the standard Recharts tooltip props
export type CustomTooltipProps = TooltipProps<ValueType, NameType>;

// Payload entry type for tooltip data - matches recharts Payload type structure
export interface TooltipPayloadEntry {
  name?: string;
  value: number;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

// Props for custom tooltip components used in line/bar charts
export interface LineChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Props for custom tooltip components used in pie charts
export interface PieChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      percentage: number;
      [key: string]: unknown;
    };
  }>;
}

// Props for custom pie chart label rendering
export interface PieCustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index?: number;
  name?: string;
  value?: number;
}

// Props for Legend formatter callback entry - matches recharts LegendPayload
export interface LegendPayloadEntry {
  value: string;
  id?: string;
  type?: string;
  color?: string;
  payload?: {
    name?: string;
    value?: number;
    strokeDasharray?: string | number;
    [key: string]: unknown;
  };
}

// Generic tooltip payload type for flexible use
export type GenericTooltipPayload = Payload<ValueType, NameType>;
