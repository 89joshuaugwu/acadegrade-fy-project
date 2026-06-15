'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ForecastChartProps {
  history: number[];
  projected: number[];
  labels: string[]; // e.g. ["100L S1", "100L S2", "200L S1 (Proj)", "200L S2 (Proj)"]
}

export function ForecastChart({ history, projected, labels }: ForecastChartProps) {
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[300px] bg-[var(--acade-deep)] rounded-xl animate-pulse" />
    );
  }

  // Build merged data array
  // We want the projected line to connect to the last historical point
  const data = labels.map((label, i) => {
    const isProjected = i >= history.length;
    let actualValue = null;
    let projectedValue = null;

    if (i < history.length) {
      actualValue = history[i];
    }
    
    // The projection line needs to start from the last historical point to avoid a gap
    if (i === history.length - 1) {
      projectedValue = history[i];
    } else if (i >= history.length) {
      projectedValue = projected[i - history.length];
    }

    return {
      name: label,
      actual: actualValue,
      projected: projectedValue,
      isProjected
    };
  });

  const lastHistoryIndex = history.length - 1;

  return (
    <div className="w-full h-[300px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--acade-primary)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--acade-primary)" stopOpacity={0}/>
            </linearGradient>
            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--acade-primary)" strokeWidth="1" strokeOpacity="0.2" />
            </pattern>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--acade-border-subtle)" />
          
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--acade-text-muted)', fontSize: 11 }}
            dy={10}
          />
          
          <YAxis 
            domain={[0, 5]} 
            ticks={[0, 1, 2, 3, 4, 5]} 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'var(--acade-text-muted)', fontSize: 11 }}
            dx={-10}
          />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--acade-surface)', 
              borderColor: 'var(--acade-border)',
              borderRadius: '8px',
              color: 'var(--acade-text)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}
            itemStyle={{ color: 'var(--acade-text)' }}
            formatter={(value: any, name: any) => [Number(value).toFixed(2), name === 'actual' ? 'Historical PI' : 'Projected PI']}
            labelStyle={{ color: 'var(--acade-text-muted)', marginBottom: '4px', fontWeight: 'bold' }}
          />
          
          {/* Historical Area/Line */}
          <Line 
            type="monotone" 
            dataKey="actual" 
            stroke="var(--acade-primary)" 
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--acade-primary)', strokeWidth: 2, stroke: 'var(--acade-deep)' }}
            activeDot={{ r: 6, fill: 'var(--acade-primary)', strokeWidth: 0 }}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={1500}
          />
          
          {/* Projected Line (Dashed) */}
          <Line 
            type="monotone" 
            dataKey="projected" 
            stroke="var(--acade-gold)" 
            strokeWidth={3}
            strokeDasharray="6 6"
            dot={{ r: 4, fill: 'var(--acade-gold)', strokeWidth: 2, stroke: 'var(--acade-deep)' }}
            activeDot={{ r: 6, fill: 'var(--acade-gold)', strokeWidth: 0 }}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={1500}
            animationBegin={1000}
          />

          {/* Reference line separating past from future */}
          {lastHistoryIndex >= 0 && (
            <ReferenceLine 
              x={data[lastHistoryIndex].name} 
              stroke="var(--acade-border)" 
              strokeDasharray="3 3"
              label={{ position: 'top', value: 'Today', fill: 'var(--acade-text-muted)', fontSize: 10 }}
            />
          )}
          
          {/* Confidence band shading over the projected area */}
          {lastHistoryIndex >= 0 && (
            <ReferenceArea 
              x1={data[lastHistoryIndex].name} 
              x2={data[data.length - 1].name} 
              y1={0} 
              y2={5} 
              fill="url(#diagonalHatch)" 
              opacity={0.5} 
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
