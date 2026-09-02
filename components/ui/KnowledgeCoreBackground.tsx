'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function KnowledgeCoreBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      45,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    // Position camera far enough back to make it a subtle background centerpiece
    camera.position.z = 35;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 2. The Knowledge Core (Complex Octahedron Tesseract)
    const geometry = new THREE.IcosahedronGeometry(7, 1);
    
    // Solid glowing inner core
    const material = new THREE.MeshStandardMaterial({
      color: 0x4f46e5, // AcadeGrade Indigo
      emissive: 0x1e1b4b,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.9,
    });
    const core = new THREE.Mesh(geometry, material);
    
    // Wireframe outer shell for high-tech SaaS look
    const wireframeGeo = new THREE.IcosahedronGeometry(7.5, 1);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // AcadeGrade Gold
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const wireframe = new THREE.Mesh(wireframeGeo, wireframeMat);
    
    const coreGroup = new THREE.Group();
    coreGroup.add(core);
    coreGroup.add(wireframe);
    scene.add(coreGroup);

    // 3. Orbiting Data Nodes (representing the Tech Stack)
    const orbitGroup = new THREE.Group();
    const nodeGeo = new THREE.OctahedronGeometry(0.5, 0);
    const nodeMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        emissive: 0xffffff, 
        emissiveIntensity: 1 
    });
    
    for (let i = 0; i < 8; i++) {
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        // Spread evenly around the orbit
        const angle = (i / 8) * Math.PI * 2;
        const radius = 14 + Math.random() * 3;
        node.position.x = Math.cos(angle) * radius;
        node.position.y = (Math.random() - 0.5) * 10;
        node.position.z = Math.sin(angle) * radius;
        
        // Give each node a slight random rotation
        node.rotation.x = Math.random() * Math.PI;
        node.rotation.y = Math.random() * Math.PI;
        orbitGroup.add(node);
    }
    scene.add(orbitGroup);

    // 4. Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambient);
    
    const light1 = new THREE.PointLight(0x4f46e5, 300, 100);
    light1.position.set(15, 15, 15);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xf59e0b, 200, 100);
    light2.position.set(-15, -15, 15);
    scene.add(light2);

    // 5. Animation Loop
    let frameId: number;
    let targetX = 0;
    let targetY = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      
      // Complex multi-axis rotation for the core
      core.rotation.x += 0.001;
      core.rotation.y += 0.002;
      wireframe.rotation.x -= 0.0015;
      wireframe.rotation.y -= 0.001;

      // Slow orbit for the tech stack nodes
      orbitGroup.rotation.y -= 0.001;
      orbitGroup.rotation.z = Math.sin(Date.now() * 0.0005) * 0.1; // Gentle bobbing

      // Spin the individual data nodes
      orbitGroup.children.forEach(child => {
        child.rotation.x += 0.01;
        child.rotation.y += 0.01;
      });

      // Mouse Parallax interaction (Core slightly tilts towards mouse)
      coreGroup.rotation.x += (targetY - coreGroup.rotation.x) * 0.05;
      coreGroup.rotation.y += (targetX - coreGroup.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      wireframeGeo.dispose();
      wireframeMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      renderer.dispose();
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <div 
      ref={mountRef} 
      // Fixed position behind everything, lower opacity so text remains readable
      className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen"
      aria-hidden="true"
    />
  );
}
