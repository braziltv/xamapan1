import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import * as THREE from 'three';

interface HealthBuilding3DProps {
  size?: number;
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.3, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <coneGeometry args={[0.15, 0.3, 8]} />
        <meshStandardMaterial color="#2E8B2E" />
      </mesh>
    </group>
  );
}

function Ambulance({ position }: { position: [number, number, number] }) {
  const ambulanceRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ambulanceRef.current) {
      // Subtle bounce animation
      ambulanceRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 4) * 0.01;
    }
  });

  return (
    <group ref={ambulanceRef} position={position}>
      {/* Body */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.18, 0.22]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Cabin */}
      <mesh position={[-0.15, 0.15, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Red stripe */}
      <mesh position={[0.05, 0.1, 0.115]}>
        <boxGeometry args={[0.35, 0.06, 0.01]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      {/* Cross on side */}
      <mesh position={[0.1, 0.1, 0.116]}>
        <boxGeometry args={[0.08, 0.02, 0.005]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.1, 0.1, 0.116]}>
        <boxGeometry args={[0.02, 0.08, 0.005]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      {/* Wheels */}
      <mesh position={[-0.15, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.15, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.15, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.15, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Light on top */}
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function HealthBuilding() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.25;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.4, 0]} scale={1.1}>
      {/* Main building */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.2, 1.1, 0.7]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.3, 0.12, 0.8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Cross on front - horizontal */}
      <mesh position={[0, 0.45, 0.36]}>
        <boxGeometry args={[0.35, 0.08, 0.02]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>

      {/* Cross on front - vertical */}
      <mesh position={[0, 0.45, 0.36]}>
        <boxGeometry args={[0.08, 0.35, 0.02]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>

      {/* Door */}
      <mesh position={[0, -0.2, 0.36]}>
        <boxGeometry args={[0.25, 0.45, 0.02]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* Door frame */}
      <mesh position={[0, 0.03, 0.37]}>
        <boxGeometry args={[0.3, 0.04, 0.02]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>

      {/* Windows left row */}
      <mesh position={[-0.38, 0.15, 0.36]}>
        <boxGeometry args={[0.18, 0.22, 0.02]} />
        <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[-0.38, -0.2, 0.36]}>
        <boxGeometry args={[0.18, 0.22, 0.02]} />
        <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.15} />
      </mesh>

      {/* Windows right row */}
      <mesh position={[0.38, 0.15, 0.36]}>
        <boxGeometry args={[0.18, 0.22, 0.02]} />
        <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0.38, -0.2, 0.36]}>
        <boxGeometry args={[0.18, 0.22, 0.02]} />
        <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.15} />
      </mesh>

      {/* Ground/grass */}
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 1.8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>

      {/* Pathway */}
      <mesh position={[0, -0.45, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, 0.5]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>

      {/* Trees */}
      <Tree position={[-0.85, -0.45, 0.3]} />
      <Tree position={[0.85, -0.45, 0.3]} />
      <Tree position={[-0.75, -0.45, -0.4]} />
      <Tree position={[0.75, -0.45, -0.4]} />

      {/* Ambulance */}
      <Ambulance position={[0.65, -0.42, 0.65]} />
    </group>
  );
}

export function HealthBuilding3D({ size = 40 }: HealthBuilding3DProps) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0.8, 3.5], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 2]} intensity={1.2} />
          <directionalLight position={[-2, 2, -1]} intensity={0.4} />
          <pointLight position={[0, 2, 2]} intensity={0.3} color="#ef4444" />
          <HealthBuilding />
        </Suspense>
      </Canvas>
    </div>
  );
}
