'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { SemesterSummary } from '@/types/semester';

const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const LazyComposedChart = dynamic(
  () => import('recharts').then((m) => m.ComposedChart),
  { ssr: false }
);
const LazyArea = dynamic(
  () => import('recharts').then((m) => m.Area),
  { ssr: false }
);
const LazyLine = dynamic(
  () => import('recharts').then((m) => m.Line),
  { ssr: false }
);
const LazyXAxis = dynamic(
  () => import('recharts').then((m) => m.XAxis),
  { ssr: false }
);
const LazyYAxis = dynamic(
  () => import('recharts').then((m) => m.YAxis),
  { ssr: false }
);
const LazyTooltip = dynamic(
  () => import('recharts').then((m) => m.Tooltip),
  { ssr: false }
);
const LazyCartesianGrid = dynamic(
  () => import('recharts').then((m) => m.CartesianGrid),
  { ssr: false }
);
const LazyReferenceArea = dynamic(
  () => import('recharts').then((m) => m.ReferenceArea),
  { ssr: false }
);

interface TrendChartProps {
  semesters: SemesterSummary[];
  metric: 'cgpa' | 'pi' | 'both';
  showForecast?: boolean;
  forecastPoints?: { x: number; cgpa?: number; pi?: number; label: string }[];
}

export function TrendChart({ semesters, metric, showForecast = false, forecastPoints = [] }: TrendChartProps) {
  const shouldReduceMotion = useReducedMotion();

  const data = useMemo(() => {
    // Format historical
    const history = semesters.map((s, idx) => ({
      name: s.label,
      idx,
      cgpa: s.gpa,
      pi: s.pi,
      isForecast: false,
    }));

    // Add forecast if requested
    const forecast = showForecast && forecastPoints.length > 0
      ? forecastPoints.map((f, idx) => ({
          name: f.label,
          idx: history.length + idx,
          cgpa: f.cgpa,
          pi: f.pi,
          isForecast: true,
        }))
      : [];

    return [...history, ...forecast];
  }, [semesters, showForecast, forecastPoints]);

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--acade-text-muted)] text-[length:var(--text-sm)]">
        Not enough data to display chart.
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isForecast = payload[0].payload.isForecast;
      return (
        <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] p-3 rounded-xl shadow-xl">
          <p className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] mb-2 font-[family-name:var(--font-bricolage)]">
            {label} {isForecast && <span className="text-[var(--acade-info)] ml-1">(Projected)</span>}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[var(--acade-text-muted)] uppercase text-xs font-bold">{entry.dataKey}:</span>
              <span className="font-bold text-[var(--acade-text)]" style={{ color: entry.color }}>
                {Number(entry.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const showCGPA = metric === 'cgpa' || metric === 'both';
  const showPI = metric === 'pi' || metric === 'both';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full h-64 md:h-80 bg-[var(--acade-deep)] animate-pulse rounded-xl" />;
  }

  return (
    <div className="w-full h-64 md:h-80 relative">
      <div className="absolute inset-0">
      <LazyResponsiveContainer width="100%" height="100%">
        <LazyComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--acade-primary)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--acade-primary)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--acade-gold)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="var(--acade-gold)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <LazyCartesianGrid strokeDasharray="3 3" stroke="var(--acade-border-subtle)" vertical={false} />
          <LazyXAxis 
            dataKey="name" 
            stroke="var(--acade-text-faint)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
            tickFormatter={(val) => {
              // Extract just the level/sem for smaller screens e.g. "100L S1"
              if (typeof val === 'string') {
                const match = val.match(/(\d{3}L).*(First|Second)/i);
                if (match) return `${match[1]} ${match[2] === 'First' ? 'S1' : 'S2'}`;
              }
              return val;
            }}
          />
          <LazyYAxis 
            domain={[0, 5]} 
            stroke="var(--acade-text-faint)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => val.toFixed(1)}
            dx={-10}
          />
          <LazyTooltip content={<CustomTooltip />} />
          
          {showForecast && (
            <LazyReferenceArea 
              x1={data[semesters.length - 1]?.name} 
              x2={data[data.length - 1]?.name} 
              fill="var(--acade-info)" 
              fillOpacity={0.05} 
            />
          )}

          {/* Historical lines */}
          {showCGPA && (
            <LazyArea 
              type="monotone" 
              dataKey="cgpa" 
              stroke="var(--acade-primary)" 
              fillOpacity={1}
              fill="url(#colorCgpa)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: 'var(--acade-deep)', stroke: 'var(--acade-primary)' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--acade-primary-glow)' }}
              isAnimationActive={!shouldReduceMotion}
              animationBegin={100}
              animationDuration={1200}
            />
          )}
          {showPI && (
            <LazyLine 
              type="monotone" 
              dataKey="pi" 
              stroke="var(--acade-gold)" 
              strokeWidth={showCGPA ? 2 : 3}
              strokeDasharray={showCGPA ? "4 4" : undefined}
              dot={!showCGPA ? { r: 4, strokeWidth: 2, fill: 'var(--acade-deep)' } : false}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--acade-gold-hover)' }}
              isAnimationActive={!shouldReduceMotion}
              animationBegin={400}
              animationDuration={1200}
            />
          )}
        </LazyComposedChart>
      </LazyResponsiveContainer>
      </div>
    </div>
  );
}
