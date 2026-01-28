'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Html, Torus } from '@react-three/drei';

function ProcessingUnit() {
  const sphereRef = useRef<any>(null);
  const ringRef = useRef<any>(null);

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
  });

  return (
    <group>
      {/* Inner Liquid Core */}
      <Sphere args={[1, 64, 64]} ref={sphereRef}>
        <MeshDistortMaterial
          color="#3b82f6"
          emissive="#2563eb"
          emissiveIntensity={2}
          roughness={0}
          metalness={1}
          distort={0.6}
          speed={5}
        />
      </Sphere>

      {/* Outer Energy Ring */}
      <Torus args={[2, 0.1, 16, 100]} ref={ringRef}>
        <meshStandardMaterial 
            color="#60a5fa" 
            emissive="#93c5fd"
            emissiveIntensity={4}
            wireframe
        />
      </Torus>
      
      {/* Floating Text Label */}
      <Html position={[0, -3.5, 0]} center>
        <div className="flex flex-col items-center gap-2">
            <div className="text-blue-400 font-mono text-sm tracking-[0.5em] animate-pulse whitespace-nowrap">
                PROCESSING LOGIC
            </div>
            <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
            </div>
        </div>
      </Html>
    </group>
  );
}

export default function LoadingCore() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="w-full h-full max-w-2xl max-h-[600px]">
        <Canvas camera={{ position: [0, 0, 6] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#60a5fa" />
            <pointLight position={[-10, -10, -10]} intensity={2} color="#a855f7" />
            <ProcessingUnit />
        </Canvas>
      </div>
    </div>
  );
}