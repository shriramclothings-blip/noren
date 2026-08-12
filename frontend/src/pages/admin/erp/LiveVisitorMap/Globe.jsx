import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { Vector3, Color } from 'three';

const toRadians = (degrees) => degrees * (Math.PI / 180);

function latLonToVector3(lat, lon, radius) {
  const phi = toRadians(90 - lat);
  const theta = toRadians(lon + 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function GlobeMarkers({ locations, selectedId, onSelect }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(null);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.00024;
  });

  return (
    <group ref={groupRef}>
      {locations.map((location, index) => {
        const position = latLonToVector3(location.latitude, location.longitude, 2.05);
        const intensity = Math.min(1, Math.max(0.3, (location.visitor_count || 1) / 35));
        const key = `${location.country}-${location.city}-${location.latitude}-${location.longitude}-${index}`;
        return (
          <mesh
            key={key}
            position={position}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(key); }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(null); }}
            onClick={(e) => { e.stopPropagation(); onSelect(location); }}
          >
            <sphereGeometry args={[0.04 + intensity * 0.014, 12, 12]} />
            <meshStandardMaterial
              color={selectedId === location.id ? '#c084fc' : '#7c3aed'}
              emissive={selectedId === location.id ? '#d8b4fe' : '#8b5cf6'}
              emissiveIntensity={0.95}
              transparent
              opacity={0.9}
            />
            {hovered === key && (
              <Html distanceFactor={7} style={{ pointerEvents: 'none' }}>
                <div style={{ padding: 10, borderRadius: 14, background: 'rgba(15,23,42,0.95)', color: '#f8fafc', fontSize: 11, border: '1px solid rgba(124,58,237,0.22)', minWidth: 140, boxShadow: '0 16px 48px rgba(15,23,42,0.35)' }}>
                  <div style={{ fontWeight: 700 }}>{location.city || 'Location unavailable'}</div>
                  <div style={{ marginTop: 4, color: '#c7d2fe' }}>{location.country || 'Unknown'}</div>
                  <div style={{ marginTop: 6, color: '#a5b4fc', fontSize: 10 }}>{location.visitor_count || 1} visitor{location.visitor_count === 1 ? '' : 's'}</div>
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </group>
  );
}

function GlobeSurface() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 6.5);
    camera.updateProjectionMatrix();
  }, [camera]);

  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial color={new Color('#17233b')} roughness={0.6} metalness={0.1} />
    </mesh>
  );
}

export default function Globe({ locations, selectedVisitor, onLocationSelect }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const selectedId = selectedVisitor?.id;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#090b16' }}>
      <Canvas camera={{ position: [0, 0, 6.5], fov: 35 }} style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 3, 5]} intensity={0.85} />
        <Stars radius={50} depth={30} count={3000} factor={8} saturation={0} fade />
        <GlobeSurface />
        <GlobeMarkers locations={locations} selectedId={selectedId} onSelect={onLocationSelect} />
        <OrbitControls
          enablePan={false}
          enableZoom
          zoomSpeed={0.5}
          rotateSpeed={0.4}
          minDistance={4}
          maxDistance={11}
          autoRotate={autoRotate}
          autoRotateSpeed={0.12}
        />
      </Canvas>
      <div style={{ position: 'absolute', right: 18, top: 18, display: 'grid', gap: 10, zIndex: 10 }}>
        <button onClick={() => setAutoRotate((v) => !v)} style={controlButtonStyle}>{autoRotate ? 'AUTO' : 'MANUAL'}</button>
        <button onClick={() => setAutoRotate(true)} style={controlButtonStyle}>RESET</button>
      </div>
      <div style={{ position: 'absolute', left: 18, bottom: 18, padding: '10px 14px', borderRadius: 14, background: 'rgba(8,15,39,0.88)', color: '#eef2ff', fontSize: 11, backdropFilter: 'blur(12px)', border: '1px solid rgba(124,58,237,0.18)' }}>
        3D globe · {locations.length} mapped locations
      </div>
    </div>
  );
}

const controlButtonStyle = {
  minWidth: 90,
  height: 36,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(15,23,42,0.92)',
  color: '#f8fafc',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
