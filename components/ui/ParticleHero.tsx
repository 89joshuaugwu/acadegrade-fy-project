'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types ---
interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
}

interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface MouseState {
  x: number;
  y: number;
  isActive: boolean;
}

// --- Configuration Constants ---
const PARTICLE_DENSITY = 0.00015; 
const BG_PARTICLE_DENSITY = 0.00005; 
const MOUSE_RADIUS = 200; // Radius of mouse influence
const RETURN_SPEED = 0.08; // Spring constant
const DAMPING = 0.90; // Friction
const REPULSION_STRENGTH = 1.5; // Mouse push force

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export function ParticleNetworkHero({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const particlesRef = useRef<Particle[]>([]);
  const backgroundParticlesRef = useRef<BackgroundParticle[]>([]);
  const mouseRef = useRef<MouseState>({ x: -1000, y: -1000, isActive: false });
  const frameIdRef = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    // 1. Main Interactive Data Nodes (Particles)
    const particleCount = Math.floor(width * height * PARTICLE_DENSITY);
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      
      newParticles.push({
        x: x,
        y: y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        size: randomRange(1.5, 3), 
        // Mix of AcadeGrade Indigo and Gold/White
        color: Math.random() > 0.8 ? '#4f46e5' : Math.random() > 0.5 ? '#f59e0b' : '#ffffff', 
        angle: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = newParticles;

    // 2. Background Ambient Particles
    const bgCount = Math.floor(width * height * BG_PARTICLE_DENSITY);
    const newBgParticles: BackgroundParticle[] = [];
    
    for (let i = 0; i < bgCount; i++) {
      newBgParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: randomRange(0.5, 1.5),
        alpha: randomRange(0.1, 0.3),
        phase: Math.random() * Math.PI * 2
      });
    }
    backgroundParticlesRef.current = newBgParticles;
  }, []);

  const animate = useCallback((time: number) => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle Radial Glow
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const pulseSpeed = 0.0005;
    const pulseOpacity = Math.sin(time * pulseSpeed) * 0.02 + 0.05; 
    
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0, 
        centerX, centerY, Math.max(canvas.width, canvas.height) * 0.8
    );
    gradient.addColorStop(0, `rgba(79, 70, 229, ${pulseOpacity})`); // AcadeGrade Indigo
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Background Particles
    const bgParticles = backgroundParticlesRef.current;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < bgParticles.length; i++) {
      const p = bgParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      const twinkle = Math.sin(time * 0.002 + p.phase) * 0.5 + 0.5;
      ctx.globalAlpha = p.alpha * (0.3 + 0.7 * twinkle);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // --- Main Physics Engine ---
    const particles = particlesRef.current;
    const mouse = mouseRef.current;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Distance to Mouse
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Mouse Repulsion Force
      if (mouse.isActive && distance < MOUSE_RADIUS) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS; 
        
        const repulsion = force * REPULSION_STRENGTH;
        p.vx -= forceDirectionX * repulsion * 5; 
        p.vy -= forceDirectionY * repulsion * 5;
      }

      // Spring Force (Return to Origin)
      const springDx = p.originX - p.x;
      const springDy = p.originY - p.y;
      
      p.vx += springDx * RETURN_SPEED;
      p.vy += springDy * RETURN_SPEED;

      // Physics Integration
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      // Draw Particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      
      const velocity = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const opacity = Math.min(0.2 + velocity * 0.15, 1); 
      
      ctx.fillStyle = p.color === '#ffffff' 
        ? `rgba(255, 255, 255, ${opacity})` 
        : p.color;
      
      ctx.fill();

      // Draw Connections (Network effect)
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx2 = p.x - p2.x;
        const dy2 = p.y - p2.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (dist2 < 80) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.15 - (dist2 / 80) * 0.15})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
      }
    }

    frameIdRef.current = requestAnimationFrame(animate);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);

        initParticles(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [initParticles, enabled]);

  useEffect(() => {
    if (!enabled) return;
    frameIdRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [animate, enabled]);

  // Window-level mouse tracking for absolute precision across the entire screen
  useEffect(() => {
    if (!enabled) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        isActive: true,
      };
    };

    const handleGlobalMouseLeave = () => {
      mouseRef.current.isActive = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseout', handleGlobalMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseout', handleGlobalMouseLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
