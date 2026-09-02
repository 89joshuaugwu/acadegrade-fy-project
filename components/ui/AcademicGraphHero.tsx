'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function AcademicGraphHero({ enabled }: { enabled: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    
    // Use a very dark background fog to blend perfectly with AcadeGrade's deep space theme
    scene.fog = new THREE.FogExp2(0x050505, 0.025);

    const camera = new THREE.PerspectiveCamera(
      45,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    // Position camera to look down at an isometric angle
    camera.position.set(0, 18, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    currentMount.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Main structural light (AcadeGrade Indigo #4f46e5)
    const directionalLight = new THREE.DirectionalLight(0x4f46e5, 3);
    directionalLight.position.set(-15, 25, -15);
    scene.add(directionalLight);

    // Secondary fill light to show the edges of the pillars
    const fillLight = new THREE.DirectionalLight(0x4f46e5, 1);
    fillLight.position.set(15, 10, 15);
    scene.add(fillLight);

    // Mouse Interaction Light (AcadeGrade Gold #f59e0b)
    // This will follow the cursor and brightly illuminate specific data pillars
    const pointerLight = new THREE.PointLight(0xf59e0b, 250, 40);
    pointerLight.position.set(0, 5, 0);
    scene.add(pointerLight);

    // 3. The "Academic Graph" - High Performance Instanced Mesh
    const RINGS = 14;
    const PILLARS_PER_RING = 24; 
    let totalPillars = 0;
    
    // Calculate total pillars increasing exponentially per ring
    for (let r = 1; r <= RINGS; r++) {
      totalPillars += Math.floor(PILLARS_PER_RING * (r * 0.6));
    }

    // A simple clean pillar shape
    const geometry = new THREE.BoxGeometry(0.7, 1, 0.7);
    // Translate the geometry so its origin is at the bottom. 
    // This makes the pillars scale upwards from the floor instead of from their center.
    geometry.translate(0, 0.5, 0); 

    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2496, // Darker indigo base to allow lights to pop
      roughness: 0.15,
      metalness: 0.85, // Highly reflective for that premium SaaS look
    });

    const mesh = new THREE.InstancedMesh(geometry, material, totalPillars);
    
    // Store mathematical data for each pillar to calculate their wave heights later
    const dummy = new THREE.Object3D();
    const pillarData: { x: number; z: number; dist: number; angle: number }[] = [];

    let index = 0;
    for (let r = 1; r <= RINGS; r++) {
      const ringRadius = r * 1.6; // Spacing between rings
      const count = Math.floor(PILLARS_PER_RING * (r * 0.6));
      
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius;
        
        // Add subtle organic jitter so it doesn't look too perfectly robotic
        const jitterX = (Math.random() - 0.5) * 0.6;
        const jitterZ = (Math.random() - 0.5) * 0.6;
        
        const finalX = x + jitterX;
        const finalZ = z + jitterZ;
        const dist = Math.sqrt(finalX * finalX + finalZ * finalZ);

        dummy.position.set(finalX, -2, finalZ); // Start slightly below baseline
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        
        pillarData.push({ x: finalX, z: finalZ, dist, angle });
        index++;
      }
    }
    
    scene.add(mesh);

    // 4. Animation Engine
    const clock = new THREE.Clock();
    let frameId: number;
    let targetCameraX = 0;
    let targetCameraY = 18;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Animate the data graph (Simulating fluctuating academic performance over semesters)
      for (let i = 0; i < totalPillars; i++) {
        const data = pillarData[i];
        
        // Complex wave function combining distance and angle over time
        // This creates a beautiful sweeping data wave
        const wave1 = Math.sin(data.dist * 0.4 - time * 1.5);
        const wave2 = Math.cos(data.angle * 3 + time * 0.8);
        const noise = Math.sin(data.x * 1.5 + time) * Math.cos(data.z * 1.5 + time);
        
        // Final height calculation (simulating high and low grades)
        let height = 2.5 + (wave1 * 2.5) + (wave2 * 1.5) + (noise * 1.5);
        
        // Outer rings get slightly taller to create a bowl/arena effect around the user
        height += (data.dist * 0.15);
        
        height = Math.max(0.1, height); // Ensure no negative heights

        dummy.position.set(data.x, -2, data.z);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      
      // Gently rotate the entire graph structure infinitely
      mesh.rotation.y = time * 0.05;

      // Smooth camera interpolation based on mouse movement (parallax effect)
      camera.position.x += (targetCameraX - camera.position.x) * 0.03;
      camera.position.y += (targetCameraY - camera.position.y) * 0.03;
      camera.lookAt(0, -2, 0); // Always look at the center of the graph

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

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse to -1 to 1 across the screen
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Shift the camera slightly based on mouse position
      targetCameraX = x * 8;
      targetCameraY = 18 + y * 4;

      // Raycast the mouse position into the 3D world to move the Gold light over the pillars
      const vector = new THREE.Vector3(x, y, 0.5);
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      // Calculate where the ray intersects the ground plane (y=0)
      const distance = -camera.position.y / dir.y; 
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      
      // Hover the light slightly above the top of the pillars
      pointerLight.position.set(pos.x, 6, pos.z);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // 6. Cleanup to prevent memory leaks
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [enabled]);

  return (
    <div 
      ref={mountRef} 
      // Opacity lowered slightly so it doesn't overpower the main text, but pointer-events-none ensures it can't block clicks.
      // Note: we still get mouse events because we use the global window listener!
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-85" 
    />
  );
}
