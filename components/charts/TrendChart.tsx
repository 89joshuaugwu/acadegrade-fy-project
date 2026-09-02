'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';
import type { SemesterSummary } from '@/types/semester';

interface TrendChartProps {
  semesters: SemesterSummary[];
  metric: 'cgpa' | 'pi' | 'both';
  showForecast?: boolean;
  forecastPoints?: { x: number; cgpa?: number; pi?: number; label: string }[];
}

export function TrendChart({ semesters, metric, showForecast = false, forecastPoints = [] }: TrendChartProps) {
  const shouldReduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const history = semesters.map((s, idx) => ({
      name: s.label,
      idx,
      cgpa: s.gpa || 0,
      pi: s.pi || 0,
      isForecast: false,
    }));

    const forecast = showForecast && forecastPoints.length > 0
      ? forecastPoints.map((f, idx) => ({
          name: f.label,
          idx: history.length + idx,
          cgpa: f.cgpa || 0,
          pi: f.pi || 0,
          isForecast: true,
        }))
      : [];

    return [...history, ...forecast];
  }, [semesters, showForecast, forecastPoints]);

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
  const cgpaPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.cgpa) }));
  const piPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.pi) }));

  const showCGPA = metric === 'cgpa' || metric === 'both';
  const showPI = metric === 'pi' || metric === 'both';

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

  const handlePointerLeave = (e: React.PointerEvent<SVGRectElement>) => {
    // Only clear on leave if it's a mouse. On touch devices, keep the last tapped point active.
    if (e.pointerType === 'mouse') {
      setHoveredIndex(null);
    }
  };

  const activeData = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--acade-text-muted)] text-[length:var(--text-sm)]">
        Not enough data to display chart.
      </div>
    );
  }

  return (
    <div className="w-full relative flex flex-col gap-6">
      {/* Real-time Magnetic Odometer Headers */}
      <div className="flex items-end justify-between px-2">
        <div className="flex flex-col">
          <span className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-widest mb-1 transition-colors">
            {activeData?.name} {activeData?.isForecast && <span className="text-[var(--acade-gold)] ml-1">(Projected)</span>}
          </span>
          <div className="flex items-baseline gap-6">
            {showCGPA && (
              <div className="flex flex-col">
                <span className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums transition-all">
                  {activeData?.cgpa.toFixed(2)}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--acade-primary)] shadow-[0_0_8px_var(--acade-primary)]" />
                  <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-medium">CGPA</span>
                </div>
              </div>
            )}
            {showPI && (
              <div className="flex flex-col">
                <span className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums transition-all">
                  {activeData?.pi.toFixed(2)}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--acade-gold)] shadow-[0_0_8px_var(--acade-gold)]" />
                  <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-medium">PI</span>
                </div>
              </div>
            )}
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
            <linearGradient id="viewportGradientCgpa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acade-success)" />
              <stop offset="50%" stopColor="var(--acade-primary)" />
              <stop offset="100%" stopColor="var(--acade-danger)" />
            </linearGradient>

            <linearGradient id="viewportGradientPi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acade-gold)" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            <linearGradient id="areaGradientCgpa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acade-primary)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--acade-primary)" stopOpacity={0.0} />
            </linearGradient>

            <pattern id="forecastHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="var(--acade-text-faint)" strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>

          <g className="grid-lines">
            {[0, 1, 2, 3, 4, 5].map((val) => {
              const y = getY(val);
              return (
                <g key={`grid-${val}`}>
                  <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--acade-border-subtle)" strokeDasharray="4 4" />
                  <text x={padding.left - 10} y={y} fill="var(--acade-text-faint)" fontSize="12" fontWeight="500" textAnchor="end" dominantBaseline="middle" fontFamily="var(--font-geist-mono)">
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>

          {showForecast && semesters.length > 0 && (
            <rect
              x={getX(semesters.length - 1)}
              y={padding.top}
              width={getX(data.length - 1) - getX(semesters.length - 1)}
              height={chartHeight}
              fill="url(#forecastHatch)"
            />
          )}

          {showCGPA && (
            <motion.path
              d={generateAreaPath(cgpaPoints)}
              fill="url(#areaGradientCgpa)"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          )}

          {(metric === 'cgpa' || metric === 'both') && (
            <motion.path
              d={generateSmoothPath(cgpaPoints)}
              fill="none"
              stroke="url(#viewportGradientCgpa)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0px 4px 6px rgba(99,102,241,0.6))" }}
              initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          )}

          {(metric === 'pi' || metric === 'both') && (
            <motion.path
              d={generateSmoothPath(piPoints)}
              fill="none"
              stroke="url(#viewportGradientPi)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0px 4px 6px rgba(245,158,11,0.6))" }}
              initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: metric === 'both' ? 0.5 : 0 }}
            />
          )}

          {data.map((d, i) => (
            <g key={`points-${i}`}>
              {showCGPA && (
                <motion.circle
                  cx={cgpaPoints[i].x}
                  cy={cgpaPoints[i].y}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: hoveredIndex === i ? 2 : 1, 
                    opacity: 1,
                    fill: hoveredIndex === i ? 'var(--acade-surface)' : 'var(--acade-deep)'
                  }}
                  transition={{ 
                    scale: { type: "spring", stiffness: 400, damping: 20 },
                    opacity: { duration: 0.5, delay: 1 + (i * 0.05) }
                  }}
                  r="5"
                  stroke="var(--acade-primary)"
                  strokeWidth="3"
                  className="pointer-events-none"
                />
              )}
              {showPI && (
                <motion.circle
                  cx={piPoints[i].x}
                  cy={piPoints[i].y}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: hoveredIndex === i ? 2 : 1, 
                    opacity: 1,
                    fill: hoveredIndex === i ? 'var(--acade-surface)' : 'var(--acade-deep)'
                  }}
                  transition={{ 
                    scale: { type: "spring", stiffness: 400, damping: 20 },
                    opacity: { duration: 0.5, delay: (showCGPA ? 1.5 : 1) + (i * 0.05) }
                  }}
                  r="4"
                  stroke="var(--acade-gold)"
                  strokeWidth="3"
                  className="pointer-events-none"
                />
              )}
            </g>
          ))}

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
                  stroke="var(--acade-primary)"
                  strokeDasharray="4 4"
                  strokeWidth="2"
                  animate={{ x1: getX(hoveredIndex), x2: getX(hoveredIndex) }}
                  transition={{ type: "spring", stiffness: 600, damping: 30 }}
                />
                
                {/* Ripple Shockwave */}
                {showCGPA && (
                  <motion.circle
                    cx={cgpaPoints[hoveredIndex].x}
                    cy={cgpaPoints[hoveredIndex].y}
                    animate={{ 
                      r: [10, 24], 
                      opacity: [0.8, 0],
                      cx: cgpaPoints[hoveredIndex].x,
                      cy: cgpaPoints[hoveredIndex].y
                    }}
                    transition={{ 
                      r: { duration: 1, repeat: Infinity, ease: "easeOut" },
                      opacity: { duration: 1, repeat: Infinity, ease: "easeOut" },
                      cx: { type: "spring", stiffness: 600, damping: 30 },
                      cy: { type: "spring", stiffness: 600, damping: 30 }
                    }}
                    fill="var(--acade-primary)"
                  />
                )}
                {showPI && (
                  <motion.circle
                    cx={piPoints[hoveredIndex].x}
                    cy={piPoints[hoveredIndex].y}
                    animate={{ 
                      r: [8, 20], 
                      opacity: [0.8, 0],
                      cx: piPoints[hoveredIndex].x,
                      cy: piPoints[hoveredIndex].y
                    }}
                    transition={{ 
                      r: { duration: 1, repeat: Infinity, ease: "easeOut" },
                      opacity: { duration: 1, repeat: Infinity, ease: "easeOut" },
                      cx: { type: "spring", stiffness: 600, damping: 30 },
                      cy: { type: "spring", stiffness: 600, damping: 30 }
                    }}
                    fill="var(--acade-gold)"
                  />
                )}
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
            onPointerDown={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className="cursor-crosshair touch-pan-y"
          />
        </svg>
      </div>
    </div>
  );
}
