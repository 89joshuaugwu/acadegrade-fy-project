'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Grade } from '@/types/course';

interface QuickCourse {
  id: string;
  code: string;
  units: number;
  grade?: Grade;
  score?: number;
}

interface LiveAcademicGraphProps {
  courses: QuickCourse[];
  inputMode: 'grade' | 'score';
  cgpa: number;
}

const GRADE_VALUES: Record<Grade, number> = {
  A: 5, B: 4, C: 3, D: 2, E: 1, F: 0
};

export function LiveAcademicGraph({ courses, inputMode, cgpa }: LiveAcademicGraphProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.05); // Fog to fade out edges

    const camera = new THREE.PerspectiveCamera(
      40,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    // Isometric angle
    camera.position.set(12, 10, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x4f46e5, 3); // Indigo
    directionalLight.position.set(-10, 15, -10);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 1.5); // Gold fill
    fillLight.position.set(10, 5, 10);
    scene.add(fillLight);

    // 3. The Pillars (Courses)
    // We want a grid. Let's arrange them in a circle or spiral.
    const maxPillars = 20; // Show up to 20 courses
    const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
    geometry.translate(0, 0.5, 0); // Scale from bottom

    const material = new THREE.MeshStandardMaterial({
      color: 0x4f46e5, // Base indigo
      roughness: 0.2,
      metalness: 0.8,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, maxPillars);
    scene.add(mesh);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    
    // Base colors
    const colorEmpty = new THREE.Color(0x1a1a2e); // Very dark if empty
    const colorIndigo = new THREE.Color(0x4f46e5);
    const colorGold = new THREE.Color(0xf59e0b);
    const colorRed = new THREE.Color(0xef4444);

    const targetHeights: number[] = new Array(maxPillars).fill(0.1);
    const currentHeights: number[] = new Array(maxPillars).fill(0.1);

    // Layout configuration (Spiral)
    const positions: { x: number; z: number }[] = [];
    for (let i = 0; i < maxPillars; i++) {
       const radius = Math.sqrt(i) * 1.5;
       const angle = i * Math.PI * 0.76; // Golden ratio spiral
       positions.push({
           x: Math.cos(angle) * radius,
           z: Math.sin(angle) * radius
       });
    }

    // 4. Animation Engine
    let frameId: number;
    let targetCameraRot = 0;
    
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Update target heights based on current courses
      for (let i = 0; i < maxPillars; i++) {
         const course = courses[i];
         if (!course) {
             targetHeights[i] = 0.2; // Tiny stub for empty slots
             mesh.setColorAt(i, colorEmpty);
         } else {
             // Calculate height based on grade/score
             let val = 0;
             if (inputMode === 'grade' && course.grade) {
                 val = GRADE_VALUES[course.grade] / 5; // 0.0 to 1.0
             } else if (inputMode === 'score' && course.score !== undefined) {
                 val = course.score / 100; // 0.0 to 1.0
             }
             
             targetHeights[i] = Math.max(0.2, val * 6); // Max height 6 units

             // Set color based on performance
             if (val >= 0.7) { // A or B (>= 70 or >= 3.5)
                 color.lerpColors(colorIndigo, colorGold, (val - 0.7) / 0.3);
             } else if (val < 0.4) { // D, E, F (< 40)
                 color.copy(colorRed);
             } else { // C (40 - 69)
                 color.copy(colorIndigo);
             }
             mesh.setColorAt(i, color);
         }
      }

      // Smoothly interpolate current heights to target heights
      for (let i = 0; i < maxPillars; i++) {
         currentHeights[i] += (targetHeights[i] - currentHeights[i]) * 0.1;
         
         const pos = positions[i];
         dummy.position.set(pos.x, -2, pos.z);
         dummy.scale.set(1, currentHeights[i], 1);
         dummy.updateMatrix();
         mesh.setMatrixAt(i, dummy.matrix);
      }
      
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      // Slowly rotate the entire spiral based on CGPA
      // Higher CGPA = faster rotation!
      const speed = Math.max(0.1, cgpa / 5);
      scene.rotation.y += 0.005 * speed;

      renderer.render(scene, camera);
    };

    animate();

    // 5. Event Listeners
    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
         currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, [shouldReduceMotion, courses, inputMode, cgpa]);

  if (shouldReduceMotion) return null;

  return (
    <div 
       ref={mountRef} 
       className="w-full h-full min-h-[200px]" 
       style={{ cursor: 'crosshair' }}
    />
  );
}
