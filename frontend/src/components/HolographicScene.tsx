"use client";
import React, { useRef, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  useGLTF, 
  Environment, 
  Float, 
  ContactShadows, 
  Stars,
  Center,
  Resize
} from "@react-three/drei";
import * as THREE from "three";

// --- 1. THE ROBOT MODEL ---
const Model = () => {
  const { scene } = useGLTF("/assets/core.glb"); 
  const ref = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state) => {
    if (ref.current) {
      const breath = Math.sin(state.clock.getElapsedTime() * 2) * 0.02; 
      ref.current.scale.setScalar(1 + breath);
      ref.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.1;
      
      const targetRotX = mouse.current.y * 0.3; 
      const targetRotY = mouse.current.x * 0.3; 

      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRotX, 0.1);
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRotY, 0.1);
    }
  });

  return (
    <group ref={ref}>
      <Resize scale={3.5}>
        <Center top>
           <primitive object={scene} />
        </Center>
      </Resize>
    </group>
  );
};

// --- 2. ROTATING STARS ---
const RotatingStars = () => {
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y -= delta * 0.05; // Spin speed
      ref.current.rotation.x += delta * 0.01; 
    }
  });

  return (
    <group ref={ref}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
    </group>
  );
};

// --- 3. THE SCENE ---
const HolographicScene = () => {
  return (
    <div className="absolute inset-0 bg-black pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        
        <ambientLight intensity={1} />
        <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={20} color="#3b82f6" />
        <pointLight position={[5, -5, 5]} intensity={10} color="#a855f7" />
        <Environment preset="city" />

        <Suspense fallback={null}>
          {/* FIX: Changed x from -3.5 (Left) to 3.0 (Right) */}
          <group position={[3.0, -1.5, 0]}> 
             <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
                <Model />
             </Float>
          </group>
        </Suspense>

        <RotatingStars />
        
        <ContactShadows position={[3.0, -4.5, 0]} opacity={0.6} scale={10} blur={3} far={10} />

      </Canvas>
    </div>
  );
};

export default HolographicScene;