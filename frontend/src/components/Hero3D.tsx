'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

// The Floating Liquid Core
function LiquidCore({ isZooming }: { isZooming: boolean }) {
  const meshRef = useRef<any>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Normal floating rotation
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.2;
    meshRef.current.rotation.y = t * 0.3;

    // "Breathing" effect
    if (!isZooming) {
      const scale = 2 + Math.sin(t) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    } 
    // WARP SPEED EFFECT (When clicking launch)
    else {
      // Rapidly expand the sphere to consume the camera
      const currentScale = meshRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, 20, 0.1); // Smooth zoom out
      meshRef.current.scale.set(newScale, newScale, newScale);
      meshRef.current.rotation.y += 0.5; // Spin faster
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere args={[1, 64, 64]} ref={meshRef}>
        <MeshDistortMaterial
          color="#4f46e5" // Indigo Core
          attach="material"
          distort={0.4} // Liquid effect strength
          speed={2} // Liquid speed
          roughness={0.2}
          metalness={0.8} // Metallic look
          emissive="#312e81" // Inner glow
          emissiveIntensity={0.5}
        />
      </Sphere>
    </Float>
  );
}

// Background Particles
function BackgroundStars({ isZooming }: { isZooming: boolean }) {
  const starsRef = useRef<any>(null);

  useFrame(() => {
    if (starsRef.current && isZooming) {
      // Move stars towards camera aggressively during warp
      starsRef.current.rotation.z += 0.02;
      starsRef.current.scale.x += 0.05;
      starsRef.current.scale.y += 0.05;
      starsRef.current.scale.z += 0.05;
    }
  });

  return (
    <group ref={starsRef}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </group>
  );
}

export default function Hero3D({ isZooming }: { isZooming: boolean }) {
  return (
    <div className="absolute inset-0 z-0 bg-slate-950">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        {/* Cinematic Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#818cf8" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />
        
        {/* The Actors */}
        <BackgroundStars isZooming={isZooming} />
        <LiquidCore isZooming={isZooming} />
      </Canvas>
    </div>
  );
}