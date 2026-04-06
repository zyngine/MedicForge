"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// Progress ring component (circular progress indicator)
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  className,
  showLabel = true,
  color = "hsl(var(--primary))",
  backgroundColor = "hsl(var(--muted))",
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  color?: string;
  backgroundColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}

// Line chart for progress over time
interface ProgressOverTimeProps {
  data: Array<{
    date: string;
    value: number;
    label?: string;
  }>;
  className?: string;
  height?: number;
  color?: string;
  showArea?: boolean;
  yAxisLabel?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProgressTooltip({ active, payload, label, yAxisLabel }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">
          {payload[0].value}
          {yAxisLabel === "%" ? "%" : ""}
        </p>
      </div>
    );
  }
  return null;
}

export function ProgressOverTime({
  data,
  className,
  height = 300,
  color = "#2563eb",
  showArea = true,
  yAxisLabel,
}: ProgressOverTimeProps) {
  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}${yAxisLabel || ""}`}
          />
          <Tooltip content={<ProgressTooltip yAxisLabel={yAxisLabel} />} />
          {showArea ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#progressGradient)"
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// Competency completion chart (donut)
interface CompetencyChartProps {
  completed: number;
  inProgress: number;
  notStarted: number;
  className?: string;
  size?: number;
}

export function CompetencyChart({
  completed,
  inProgress,
  notStarted,
  className,
  size = 200,
}: CompetencyChartProps) {
  const data = [
    { name: "Completed", value: completed, color: "#22c55e" },
    { name: "In Progress", value: inProgress, color: "#eab308" },
    { name: "Not Started", value: notStarted, color: "#e5e7eb" },
  ].filter((d) => d.value > 0);

  const total = completed + inProgress + notStarted;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        <ResponsiveContainer width={size} height={size}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.3}
              outerRadius={size * 0.4}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{completed}</span>
          <span className="text-sm text-muted-foreground">of {total}</span>
        </div>
      </div>
      <div className="flex gap-4 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
            <span className="text-muted-foreground">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Multi-line comparison chart
interface ComparisonChartProps {
  data: Array<{
    label: string;
    [key: string]: string | number;
  }>;
  lines: Array<{
    dataKey: string;
    color: string;
    name: string;
  }>;
  className?: string;
  height?: number;
}

export function ComparisonChart({
  data,
  lines,
  className,
  height = 300,
}: ComparisonChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              name={line.name}
              dot={{ fill: line.color, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Simple stat card for dashboards
export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className={cn("bg-card rounded-lg border p-4", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <p
              className={cn(
                "text-sm mt-1",
                isPositive && "text-green-600 dark:text-green-400",
                isNegative && "text-red-600 dark:text-red-400",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              {isPositive && "+"}
              {change}% {changeLabel || "from last period"}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Mini sparkline for inline charts
export function Sparkline({
  data,
  color = "#2563eb",
  height = 40,
  width = 100,
  className,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  className?: string;
}) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className={cn("inline-block", className)}>
      <ResponsiveContainer width={width} height={height}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sparkline-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
