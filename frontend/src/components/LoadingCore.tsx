'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Html, Torus } from '@react-three/drei';
import * as THREE from 'three';

function ProcessingUnit() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (sphereRef.current) {
        sphereRef.current.rotation.x = t * 2;
        sphereRef.current.rotation.y = t * 3;
    }
    if (ringRef.current) {
        ringRef.current.rotation.x = -t;
        ringRef.current.rotation.y = t * 0.5;
        ringRef.current.rotation.z = t;
    }
    if (outerRingRef.current) {
        outerRingRef.current.rotation.x = t * 0.5;
        outerRingRef.current.rotation.y = -t * 0.8;
        outerRingRef.current.rotation.z = -t * 0.3;
    }
  });

  return (
    <group position={[0, 0.8, 0]}>
      {/* Inner Liquid Core */}
      <Sphere args={[1.2, 64, 64]} ref={sphereRef}>
        <MeshDistortMaterial
          color="#3b82f6"
          emissive="#2563eb"
          emissiveIntensity={2}
          roughness={0.1}
          metalness={0.9}
          distort={0.5}
          speed={4}
        />
      </Sphere>

      {/* Inner Energy Ring */}
      <Torus args={[2.2, 0.05, 16, 100]} ref={ringRef}>
        <meshStandardMaterial 
            color="#60a5fa" 
            emissive="#93c5fd"
            emissiveIntensity={3}
            wireframe
        />
      </Torus>

      {/* Outer Stabilization Ring */}
      <Torus args={[3.2, 0.02, 16, 100]} ref={outerRingRef}>
        <meshStandardMaterial 
            color="#a855f7" 
            emissive="#c084fc"
            emissiveIntensity={2}
            transparent
            opacity={0.6}
        />
      </Torus>
      
      {/* Floating Text Label */}
      <Html position={[0, 4.2, 0]} center>
        <div className="flex flex-col items-center gap-2">
            <div className="text-blue-400 font-mono text-sm tracking-[0.5em] animate-pulse whitespace-nowrap drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]">
                FIELD ACTIVATION
            </div>
        </div>
      </Html>
    </group>
  );
}

export default function LoadingCore() {

  const loadingMessages = [
    "Establishing zero-point anchor...",
    "Harmonizing gravitational matrices...",
    "Spinning up distortion fields...",
    "Calibrating field geometry...",
    "Stabilizing levitation vector..."
  ];

  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => {
        const lastIndex = loadingMessages.length - 1;
        if (prev >= lastIndex) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-700">
      <div className="absolute inset-0 w-full h-full z-0">
        <Canvas camera={{ position: [0, 0, 8] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#60a5fa" />
            <pointLight position={[-10, -10, -10]} intensity={2} color="#a855f7" />
            <ProcessingUnit />
        </Canvas>
      </div>
        
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center w-full max-w-md px-6 z-10 pointer-events-none">
          <p className="text-blue-300 font-mono text-sm tracking-[0.2em] uppercase animate-pulse mb-6 text-center drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]">
            {loadingMessages[currentMessage]}
          </p>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
             <div 
               className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6] transition-all duration-[1500ms] ease-out" 
               style={{ width: `${((currentMessage + 1) / loadingMessages.length) * 100}%` }}
             />
          </div>
          <div className="mt-4 flex justify-between w-full text-[10px] font-mono text-slate-500 tracking-widest uppercase">
             <span>Power Output</span>
             <span className="text-blue-400">{Math.round(((currentMessage + 1) / loadingMessages.length) * 100)}%</span>
          </div>
      </div>
    </div>
  );
}