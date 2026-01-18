import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StethoscopeProps {
  isActive?: boolean;
}

// Componente do estetoscópio em forma de coração
function HeartStethoscope({ isActive }: StethoscopeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const chestpieceRef = useRef<THREE.Group>(null);
  const tubeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Rotação suave constante
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      
      // Pulsação quando ativo
      if (isActive) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
        groupRef.current.scale.setScalar(pulse);
      } else {
        // Leve respiração quando inativo
        const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
        groupRef.current.scale.setScalar(breathe);
      }
    }

    // Animação sutil do chestpiece
    if (chestpieceRef.current) {
      chestpieceRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  // Criar a curva do tubo em forma de coração
  const createHeartTubeCurve = () => {
    const points: THREE.Vector3[] = [];
    const segments = 100;
    
    // Desenhar coração (parametric heart shape)
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      // Heart parametric equations (scaled)
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      points.push(new THREE.Vector3(x * 0.03, y * 0.03 + 0.15, 0));
    }
    
    return new THREE.CatmullRomCurve3(points);
  };

  const heartCurve = createHeartTubeCurve();

  // Material vermelho brilhante para o tubo
  const tubeMaterial = new THREE.MeshStandardMaterial({
    color: isActive ? '#ff4444' : '#e63946',
    metalness: 0.3,
    roughness: 0.4,
    emissive: isActive ? '#ff2222' : '#000000',
    emissiveIntensity: isActive ? 0.3 : 0,
  });

  // Material metálico para partes de metal
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    metalness: 0.9,
    roughness: 0.1,
  });

  // Material metálico escuro
  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: '#404040',
    metalness: 0.8,
    roughness: 0.2,
  });

  return (
    <group ref={groupRef} position={[0, -0.1, 0]}>
      {/* Tubo principal em forma de coração */}
      <group ref={tubeRef}>
        <mesh>
          <tubeGeometry args={[heartCurve, 80, 0.04, 16, false]} />
          <primitive object={tubeMaterial} attach="material" />
        </mesh>
      </group>

      {/* Chestpiece (diafragma) - na parte inferior do coração */}
      <group ref={chestpieceRef} position={[0, -0.35, 0]}>
        {/* Base do chestpiece */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.04, 32]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
        
        {/* Diafragma central */}
        <mesh position={[0, -0.025, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 32]} />
          <primitive object={darkMetalMaterial} attach="material" />
        </mesh>
        
        {/* Anel decorativo */}
        <mesh position={[0, 0.015, 0]}>
          <torusGeometry args={[0.11, 0.015, 16, 32]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>

        {/* Conexão do tubo */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
      </group>

      {/* Earpieces (auriculares) - no topo do coração */}
      <group position={[0, 0.55, 0]}>
        {/* Barra de conexão */}
        <mesh position={[0, 0.15, 0]} rotation={[0, 0, 0]}>
          <capsuleGeometry args={[0.015, 0.35, 8, 16]} />
          <primitive object={metalMaterial} attach="material" />
        </mesh>
        
        {/* Auricular esquerdo */}
        <group position={[-0.08, 0.38, 0]} rotation={[0.3, 0, -0.4]}>
          <mesh>
            <capsuleGeometry args={[0.025, 0.06, 8, 16]} />
            <primitive object={metalMaterial} attach="material" />
          </mesh>
          {/* Ponta de borracha */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial color="#333333" roughness={0.6} />
          </mesh>
        </group>

        {/* Auricular direito */}
        <group position={[0.08, 0.38, 0]} rotation={[0.3, 0, 0.4]}>
          <mesh>
            <capsuleGeometry args={[0.025, 0.06, 8, 16]} />
            <primitive object={metalMaterial} attach="material" />
          </mesh>
          {/* Ponta de borracha */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial color="#333333" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

interface Stethoscope3DProps {
  className?: string;
  isActive?: boolean;
}

export function Stethoscope3D({ className = '', isActive = false }: Stethoscope3DProps) {
  return (
    <div className={`${className}`}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          {/* Iluminação */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
          <directionalLight position={[-3, 3, 2]} intensity={0.5} color="#ffcccc" />
          <pointLight position={[0, -2, 2]} intensity={0.4} color="#ff6666" />
          
          {/* Brilho extra quando ativo */}
          {isActive && (
            <pointLight position={[0, 0, 1]} intensity={1} color="#ff4444" />
          )}
          
          <HeartStethoscope isActive={isActive} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Stethoscope3D;
