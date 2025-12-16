import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import * as THREE from 'three';

interface HealthBuilding3DProps {
  size?: number;
}

function HealthBuilding() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* Main building */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.4, 1, 0.8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.5, 0.15, 0.9]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Cross on top - horizontal */}
      <mesh position={[0, 0.85, 0.01]}>
        <boxGeometry args={[0.5, 0.12, 0.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>

      {/* Cross on top - vertical */}
      <mesh position={[0, 0.85, 0.01]}>
        <boxGeometry args={[0.12, 0.5, 0.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>

      {/* Door */}
      <mesh position={[0, -0.25, 0.41]}>
        <boxGeometry args={[0.3, 0.5, 0.02]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* Windows left */}
      <mesh position={[-0.45, 0.1, 0.41]}>
        <boxGeometry args={[0.25, 0.25, 0.02]} />
        <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.2} />
      </mesh>

      {/* Windows right */}
      <mesh position={[0.45, 0.1, 0.41]}>
        <boxGeometry args={[0.25, 0.25, 0.02]} />
        <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.2} />
      </mesh>

      {/* Ground/base */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 1.5]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}

function PulsingCross() {
  const crossRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (crossRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      crossRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={crossRef} position={[0, 0.85, 0.02]}>
      {/* Cross horizontal */}
      <mesh>
        <boxGeometry args={[0.5, 0.12, 0.05]} />
        <meshStandardMaterial 
          color="#ef4444" 
          emissive="#ef4444" 
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Cross vertical */}
      <mesh>
        <boxGeometry args={[0.12, 0.5, 0.05]} />
        <meshStandardMaterial 
          color="#ef4444" 
          emissive="#ef4444" 
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

export function HealthBuilding3D({ size = 40 }: HealthBuilding3DProps) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 2]} intensity={1} />
          <directionalLight position={[-2, 1, -1]} intensity={0.3} />
          <HealthBuilding />
        </Suspense>
      </Canvas>
    </div>
  );
}
