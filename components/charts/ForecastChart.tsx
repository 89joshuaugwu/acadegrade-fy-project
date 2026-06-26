'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';

interface ForecastChartProps {
  history: number[];
  projected: number[];
  labels: string[]; // e.g. ["100L S1", "100L S2", "200L S1 (Proj)", "200L S2 (Proj)"]
  metricName?: string; // "PI" or "CGPA"
}

export function ForecastChart({ history, projected, labels, metricName = "PI" }: ForecastChartProps) {
  const shouldReduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    return labels.map((label, i) => {
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
        idx: i,
        actual: actualValue,
        projected: projectedValue,
        isProjected,
        val: (isProjected ? projectedValue : actualValue) || 0
      };
    });
  }, [history, projected, labels]);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Constants for pure SVG rendering
  const width = 800;
  const height = 320;
  const padding = { top: 40, right: 30, bottom: 40, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scales
  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };
  const getY = (val: number) => padding.top + (1 - val / 5) * chartHeight;

  // Monotone bezier curve generator
  const generateSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }
    return d;
  };

  const generateAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    const linePath = generateSmoothPath(points);
    return `${linePath} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`;
  };

  // Generate points sets
  const actualData = data.filter(d => d.actual !== null);
  const projectedData = data.filter(d => d.projected !== null);

  const actualPoints = actualData.map((d) => ({ x: getX(d.idx), y: getY(d.actual as number) }));
  const projectedPoints = projectedData.map((d) => ({ x: getX(d.idx), y: getY(d.projected as number) }));
  
  // All points for dot rendering
  const allPoints = data.map((d) => ({ x: getX(d.idx), y: getY(d.val) }));

  const lastHistoryIndex = history.length - 1;

  // Magnetic Snapping Logic
  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // Calculate relative x coordinate taking into account the SVG's viewBox scaling
    const scaleX = width / rect.width;
    const relativeX = (e.clientX - rect.left) * scaleX;
    
    // Find closest index
    let index = Math.round(((relativeX - padding.left) / chartWidth) * (data.length - 1));
    index = Math.max(0, Math.min(data.length - 1, index));
    setHoveredIndex(index);
  };

  const handlePointerLeave = () => {
    setHoveredIndex(null);
  };

  const activeData = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];
  const isHoverProjected = activeData?.isProjected;
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || data.length === 0) {
    return <div className="w-full h-[320px] bg-[var(--acade-deep)] animate-pulse rounded-xl" />;
  }

  return (
    <div className="w-full relative flex flex-col gap-6">
      {/* Real-time Magnetic Odometer Headers */}
      <div className="flex items-end justify-between px-2">
        <div className="flex flex-col">
          <span className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-widest mb-1 transition-colors">
            {activeData?.name} {isHoverProjected ? <span className="text-[var(--acade-gold)] ml-1">(Projected)</span> : <span className="text-[var(--acade-primary)] ml-1">(Historical)</span>}
          </span>
          <div className="flex items-baseline gap-6">
            <div className="flex flex-col">
              <span className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums transition-all">
                {activeData?.val.toFixed(2)}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isHoverProjected ? "bg-[var(--acade-gold)] shadow-[0_0_8px_var(--acade-gold)]" : "bg-[var(--acade-primary)] shadow-[0_0_8px_var(--acade-primary)]"
                )} />
                <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-medium">{metricName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pure SVG + Framer Motion Render Engine */}
      <div className="w-full h-64 md:h-80 relative select-none touch-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Viewport-Aware Dynamic Gradient */}
            <linearGradient id="viewportGradientForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acade-success)" />
              <stop offset="30%" stopColor="var(--acade-primary)" />
              <stop offset="100%" stopColor="var(--acade-danger)" />
            </linearGradient>

            <linearGradient id="areaGradientForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acade-primary)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--acade-primary)" stopOpacity={0.0} />
            </linearGradient>
            
            <linearGradient id="lineGradientProj" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--acade-gold)">
                <animate attributeName="stop-color" values="var(--acade-gold);#fbbf24;var(--acade-gold)" dur="3s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#fbbf24">
                <animate attributeName="stop-color" values="#fbbf24;var(--acade-gold);#fbbf24" dur="3s" repeatCount="indefinite" />
              </stop>
            </linearGradient>

            <filter id="neonGlowForecast" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="var(--acade-primary)" floodOpacity="0.8" />
            </filter>
            
            <filter id="neonGlowProj" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="var(--acade-gold)" floodOpacity="0.8" />
            </filter>

            <pattern id="forecastHatchLine" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="var(--acade-gold)" strokeWidth="1.5" strokeOpacity="0.15" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <g className="grid-lines">
            {[0, 1, 2, 3, 4, 5].map((val) => {
              const y = getY(val);
              return (
                <g key={`grid-f-${val}`}>
                  <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--acade-border-subtle)" strokeDasharray="4 4" />
                  <text x={padding.left - 10} y={y} fill="var(--acade-text-faint)" fontSize="12" fontWeight="500" textAnchor="end" dominantBaseline="middle" fontFamily="var(--font-geist-mono)">
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Forecast Zone Highlight */}
          {lastHistoryIndex >= 0 && (
            <rect
              x={getX(lastHistoryIndex)}
              y={padding.top}
              width={getX(data.length - 1) - getX(lastHistoryIndex)}
              height={chartHeight}
              fill="url(#forecastHatchLine)"
            />
          )}

          {/* "Today" Separator Line */}
          {lastHistoryIndex >= 0 && (
            <g>
              <line
                x1={getX(lastHistoryIndex)}
                y1={padding.top - 15}
                x2={getX(lastHistoryIndex)}
                y2={height - padding.bottom}
                stroke="var(--acade-primary-glow)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <text x={getX(lastHistoryIndex)} y={padding.top - 20} fill="var(--acade-primary-glow)" fontSize="11" fontWeight="bold" textAnchor="middle">
                Today
              </text>
            </g>
          )}

          {/* Historical Area */}
          <motion.path
            d={generateAreaPath(actualPoints)}
            fill="url(#areaGradientForecast)"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          {/* Viewport-Aware Smooth Line (Historical) */}
          <motion.path
            d={generateSmoothPath(actualPoints)}
            fill="none"
            stroke="url(#viewportGradientForecast)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlowForecast)"
            initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />

          {/* Animated Projected Line */}
          {projectedPoints.length > 0 && (
            <motion.path
              d={generateSmoothPath(projectedPoints)}
              fill="none"
              stroke="url(#lineGradientProj)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 8"
              filter="url(#neonGlowProj)"
              initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: 1 }}
            />
          )}

          {/* Data Points */}
          {data.map((d, i) => {
            const isProj = d.isProjected;
            const pt = allPoints[i];
            
            // Do not render duplicate connection point logic if needed, but here it's fine.
            return (
              <g key={`f-points-${i}`}>
                <motion.circle
                  cx={pt.x}
                  cy={pt.y}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: hoveredIndex === i ? 2 : 1, 
                    opacity: 1,
                    fill: hoveredIndex === i ? 'var(--acade-surface)' : 'var(--acade-deep)'
                  }}
                  transition={{ 
                    scale: { type: "spring", stiffness: 400, damping: 20 },
                    opacity: { duration: 0.5, delay: (isProj ? 1.5 : 1) + (i * 0.05) }
                  }}
                  r="5"
                  stroke={isProj ? "var(--acade-gold)" : "var(--acade-primary)"}
                  strokeWidth="3"
                  className="pointer-events-none"
                />
              </g>
            );
          })}

          {/* Magnetic Crosshair */}
          <AnimatePresence>
            {hoveredIndex !== null && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none"
              >
                {/* Laser Line */}
                <motion.line
                  x1={getX(hoveredIndex)}
                  y1={padding.top}
                  x2={getX(hoveredIndex)}
                  y2={height - padding.bottom}
                  stroke={isHoverProjected ? "var(--acade-gold)" : "var(--acade-primary)"}
                  strokeDasharray="4 4"
                  strokeWidth="2"
                  animate={{ x1: getX(hoveredIndex), x2: getX(hoveredIndex), stroke: isHoverProjected ? "var(--acade-gold)" : "var(--acade-primary)" }}
                  transition={{ type: "spring", stiffness: 600, damping: 30 }}
                />
                
                {/* Ripple Shockwave */}
                <motion.circle
                  cx={allPoints[hoveredIndex].x}
                  cy={allPoints[hoveredIndex].y}
                  animate={{ 
                    r: [10, 24], 
                    opacity: [0.8, 0],
                    cx: allPoints[hoveredIndex].x,
                    cy: allPoints[hoveredIndex].y
                  }}
                  transition={{ 
                    r: { duration: 1, repeat: Infinity, ease: "easeOut" },
                    opacity: { duration: 1, repeat: Infinity, ease: "easeOut" },
                    cx: { type: "spring", stiffness: 600, damping: 30 },
                    cy: { type: "spring", stiffness: 600, damping: 30 }
                  }}
                  fill={isHoverProjected ? "var(--acade-gold)" : "var(--acade-primary)"}
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Invisible Interaction Layer */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className="cursor-crosshair touch-none"
          />
        </svg>
      </div>
    </div>
  );
}
