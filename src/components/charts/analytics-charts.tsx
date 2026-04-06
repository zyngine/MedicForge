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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

// Engagement metrics chart (bar + line combo)
interface EngagementChartProps {
  data: Array<{
    date: string;
    logins: number;
    submissions: number;
    timeSpent: number;
  }>;
  className?: string;
  height?: number;
}

export function EngagementChart({
  data,
  className,
  height = 350,
}: EngagementChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="logins"
            name="Logins"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="submissions"
            name="Submissions"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="timeSpent"
            name="Time (min)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Skill proficiency radar chart
interface SkillRadarChartProps {
  data: Array<{
    skill: string;
    proficiency: number;
    target?: number;
  }>;
  className?: string;
  size?: number;
}

export function SkillRadarChart({
  data,
  className,
  size = 300,
}: SkillRadarChartProps) {
  return (
    <div className={cn("w-full flex justify-center", className)}>
      <ResponsiveContainer width={size} height={size}>
        <RadarChart data={data}>
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "currentColor", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "currentColor", fontSize: 10 }}
          />
          {data[0]?.target !== undefined && (
            <Radar
              name="Target"
              dataKey="target"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.1}
              strokeDasharray="3 3"
            />
          )}
          <Radar
            name="Proficiency"
            dataKey="proficiency"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Horizontal bar chart for comparisons
interface HorizontalBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  className?: string;
  height?: number;
  maxValue?: number;
  showValues?: boolean;
}

export function HorizontalBarChart({
  data,
  className,
  height,
  maxValue,
  showValues: _showValues = true,
}: HorizontalBarChartProps) {
  const chartHeight = height || Math.max(200, data.length * 40);
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, max]}
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Time distribution chart (stacked area)
interface TimeDistributionChartProps {
  data: Array<{
    period: string;
    lectures: number;
    assignments: number;
    clinical: number;
    other?: number;
  }>;
  className?: string;
  height?: number;
}

export function TimeDistributionChart({
  data,
  className,
  height = 300,
}: TimeDistributionChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorLectures" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorAssignments" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorClinical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="period"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={{ stroke: "currentColor" }}
            tickFormatter={(value) => `${value}h`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value) => [`${value} hours`, ""]}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="lectures"
            name="Lectures"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorLectures)"
          />
          <Area
            type="monotone"
            dataKey="assignments"
            name="Assignments"
            stackId="1"
            stroke="#22c55e"
            fill="url(#colorAssignments)"
          />
          <Area
            type="monotone"
            dataKey="clinical"
            name="Clinical"
            stackId="1"
            stroke="#f59e0b"
            fill="url(#colorClinical)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Course completion leaderboard
interface LeaderboardProps {
  data: Array<{
    rank: number;
    name: string;
    avatar?: string;
    score: number;
    change?: number;
  }>;
  className?: string;
  showChange?: boolean;
}

export function Leaderboard({
  data,
  className,
  showChange = true,
}: LeaderboardProps) {
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case 2:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400";
      case 3:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((item) => (
        <div
          key={item.rank}
          className="flex items-center gap-3 p-3 rounded-lg bg-card border"
        >
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
              getRankStyle(item.rank)
            )}
          >
            {item.rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{item.score}</p>
            {showChange && item.change !== undefined && (
              <p
                className={cn(
                  "text-xs",
                  item.change > 0 && "text-green-600 dark:text-green-400",
                  item.change < 0 && "text-red-600 dark:text-red-400",
                  item.change === 0 && "text-muted-foreground"
                )}
              >
                {item.change > 0 ? "+" : ""}
                {item.change}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Activity heatmap (like GitHub contributions)
interface HeatmapProps {
  data: Array<{
    date: string;
    count: number;
  }>;
  className?: string;
  weeks?: number;
}

export function ActivityHeatmap({
  data,
  className,
  weeks = 12,
}: HeatmapProps) {
  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count <= 2) return "bg-green-200 dark:bg-green-900";
    if (count <= 5) return "bg-green-400 dark:bg-green-700";
    if (count <= 8) return "bg-green-600 dark:bg-green-500";
    return "bg-green-800 dark:bg-green-400";
  };

  // Group data by weeks
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - weeks * 7);

  const grid: Array<Array<{ date: string; count: number }>> = [];
  let currentWeek: Array<{ date: string; count: number }> = [];

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayData = data.find((d) => d.date === dateStr) || { date: dateStr, count: 0 };

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      grid.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(dayData);
  }
  if (currentWeek.length > 0) {
    grid.push(currentWeek);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1">
        {grid.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "w-3 h-3 rounded-sm",
                  getIntensity(day.count)
                )}
                title={`${day.date}: ${day.count} activities`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
          <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
          <div className="w-3 h-3 rounded-sm bg-green-800 dark:bg-green-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
