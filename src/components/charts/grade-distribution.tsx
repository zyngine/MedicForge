"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface GradeDistributionProps {
  data: Array<{
    range: string;
    count: number;
    percentage?: number;
  }>;
  className?: string;
  showPercentage?: boolean;
  height?: number;
  colors?: {
    A: string;
    B: string;
    C: string;
    D: string;
    F: string;
  };
}

const DEFAULT_COLORS = {
  A: "#22c55e", // green-500
  B: "#84cc16", // lime-500
  C: "#eab308", // yellow-500
  D: "#f97316", // orange-500
  F: "#ef4444", // red-500
};

export function GradeDistribution({
  data,
  className,
  showPercentage = true,
  height = 300,
  colors = DEFAULT_COLORS,
}: GradeDistributionProps) {
  const getBarColor = (range: string) => {
    if (range.startsWith("A") || range.includes("90")) return colors.A;
    if (range.startsWith("B") || range.includes("80")) return colors.B;
    if (range.startsWith("C") || range.includes("70")) return colors.C;
    if (range.startsWith("D") || range.includes("60")) return colors.D;
    return colors.F;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-muted-foreground">
            {item.count} student{item.count !== 1 ? "s" : ""}
            {showPercentage && item.percentage !== undefined && (
              <span> ({item.percentage.toFixed(1)}%)</span>
            )}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="range"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.range)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Create grade distribution data from scores
export function calculateGradeDistribution(
  scores: number[],
  maxScore: number
): Array<{ range: string; count: number; percentage: number }> {
  const ranges = [
    { label: "90-100% (A)", min: 90, max: 100 },
    { label: "80-89% (B)", min: 80, max: 89 },
    { label: "70-79% (C)", min: 70, max: 79 },
    { label: "60-69% (D)", min: 60, max: 69 },
    { label: "0-59% (F)", min: 0, max: 59 },
  ];

  const total = scores.length;
  const percentages = scores.map((score) => (score / maxScore) * 100);

  return ranges.map((range) => {
    const count = percentages.filter(
      (p) => p >= range.min && p <= range.max
    ).length;
    return {
      range: range.label,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

// Statistics summary component
export function GradeStatistics({
  scores,
  maxScore,
  className,
}: {
  scores: number[];
  maxScore: number;
  className?: string;
}) {
  const percentages = scores.map((score) => (score / maxScore) * 100);
  const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
  const sorted = [...percentages].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Calculate standard deviation
  const variance =
    percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
    percentages.length;
  const stdDev = Math.sqrt(variance);

  const stats = [
    { label: "Mean", value: `${mean.toFixed(1)}%` },
    { label: "Median", value: `${median.toFixed(1)}%` },
    { label: "High", value: `${max.toFixed(1)}%` },
    { label: "Low", value: `${min.toFixed(1)}%` },
    { label: "Std Dev", value: stdDev.toFixed(1) },
    { label: "Count", value: scores.length.toString() },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-4", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <div className="text-2xl font-bold">{stat.value}</div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
