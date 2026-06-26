'use client';

import { useState, useEffect } from 'react';
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';

interface ForecastChartProps {
  history: number[];
  projected: number[];
  labels: string[]; // e.g. ["100L S1", "100L S2", "200L S1 (Proj)", "200L S2 (Proj)"]
  metricName?: string; // "PI" or "CGPA"
}

export function ForecastChart({ history, projected, labels, metricName = "PI" }: ForecastChartProps) {
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

  // Custom Tooltip for premium SaaS feel
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find which value we are showing (actual or projected)
      const dataPoint = payload[0].payload;
      const value = dataPoint.actual !== null ? dataPoint.actual : dataPoint.projected;
      const isProjected = dataPoint.actual === null;
      
      return (
        <div className="bg-[var(--acade-deep)]/90 backdrop-blur-md border border-[var(--acade-border)] p-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <p className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full shadow-[0_0_8px]",
              isProjected ? "bg-[var(--acade-gold)] shadow-[var(--acade-gold)]" : "bg-[var(--acade-primary)] shadow-[var(--acade-primary)]"
            )} />
            <span className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
              {Number(value).toFixed(2)}
            </span>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] mt-1">
            {isProjected ? `Projected ${metricName}` : `Historical ${metricName}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[320px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)] relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {/* Animated glowing gradient for the primary line */}
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--acade-primary)">
                <animate attributeName="stop-color" values="var(--acade-primary);#8b5cf6;var(--acade-primary)" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#8b5cf6">
                <animate attributeName="stop-color" values="#8b5cf6;var(--acade-primary);#8b5cf6" dur="4s" repeatCount="indefinite" />
              </stop>
            </linearGradient>

            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--acade-primary)" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="var(--acade-primary)" stopOpacity={0.05}/>
            </linearGradient>
            
            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--acade-gold)" strokeWidth="1.5" strokeOpacity="0.15" />
            </pattern>

            {/* Glowing Drop Shadows */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--acade-primary)" floodOpacity="0.6"/>
            </filter>
            
            <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--acade-gold)" floodOpacity="0.6"/>
            </filter>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--acade-border-subtle)" />
          
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--acade-text-muted)', fontSize: 11 }}
            dy={15}
          />
          
          <YAxis 
            domain={[0, 5]} 
            ticks={[0, 1, 2, 3, 4, 5]} 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'var(--acade-text-muted)', fontSize: 11 }}
            dx={-15}
          />
          
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: 'var(--acade-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          
          {/* Historical Area/Line */}
          <Area 
            type="monotone" 
            dataKey="actual" 
            stroke="url(#lineGradient)" 
            fillOpacity={1} 
            fill="url(#colorActual)" 
            strokeWidth={4}
            filter="url(#glow)"
            activeDot={{ r: 8, fill: 'var(--acade-primary)', strokeWidth: 3, stroke: 'var(--acade-surface)' }}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
          
          {/* Projected Line (Dashed) */}
          <Line 
            type="monotone" 
            dataKey="projected" 
            stroke="var(--acade-gold)" 
            strokeWidth={3}
            strokeDasharray="8 8"
            filter="url(#glow-gold)"
            dot={{ r: 5, fill: 'var(--acade-gold)', strokeWidth: 2, stroke: 'var(--acade-deep)' }}
            activeDot={{ r: 8, fill: 'var(--acade-gold)', strokeWidth: 3, stroke: 'var(--acade-deep)' }}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={2000}
            animationBegin={1000}
            animationEasing="ease-out"
          />

          {/* Reference line separating past from future */}
          {lastHistoryIndex >= 0 && (
            <ReferenceLine 
              x={data[lastHistoryIndex].name} 
              stroke="var(--acade-primary-glow)" 
              strokeDasharray="3 3"
              label={{ position: 'top', value: 'Today', fill: 'var(--acade-primary-glow)', fontSize: 11, fontWeight: 'bold' }}
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
              opacity={0.8} 
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
