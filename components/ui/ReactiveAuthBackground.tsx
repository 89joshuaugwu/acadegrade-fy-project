'use client';

import React, { useRef, useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

export function ReactiveAuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let ripples: Ripple[] = [];
    let frameId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);
    resize();

    // Create digital "data rain" (Matrix/Cyberpunk vibe but clean SaaS style)
    const dataNodes: { x: number, y: number, alpha: number, speed: number, size: number }[] = [];
    for (let i = 0; i < 60; i++) {
        dataNodes.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            alpha: Math.random() * 0.4 + 0.1,
            speed: Math.random() * 0.5 + 0.2,
            size: Math.random() * 1.5 + 0.5
        });
    }

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw drifting data nodes
      dataNodes.forEach(node => {
          node.y -= node.speed;
          if (node.y < 0) {
              node.y = window.innerHeight;
              node.x = Math.random() * window.innerWidth;
          }
          ctx.globalAlpha = node.alpha;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
          ctx.fillStyle = '#4f46e5'; // AcadeGrade Indigo
          ctx.fill();
      });

      // Draw Typing Ripples (Data shockwaves)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.012; // Fade out

        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(79, 70, 229, ${r.alpha})`; // Glowing Indigo ring
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if key is undefined or meta keys (Shift, Ctrl, Alt, etc)
        if (!e.key || (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Enter')) return;

        // Spawn a data ripple starting near the vertical center
        ripples.push({
            x: (window.innerWidth / 2) + (Math.random() * 400 - 200),
            y: (window.innerHeight / 2) + (Math.random() * 200 - 100),
            radius: 10,
            speed: Math.random() * 3 + 4,
            alpha: 0.5
        });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none opacity-70 mix-blend-screen" 
    />
  );
}
