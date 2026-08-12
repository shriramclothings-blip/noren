import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei';
import { Vector3, Color, TextureLoader, CanvasTexture } from 'three';

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

// Create procedural Earth texture with oceans, continents, and basic country coloring
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Ocean base color
  ctx.fillStyle = '#1a3a52';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Simpified continent positions with improved coloring
  const continentData = [
    // North America
    { x: 0.2, y: 0.35, w: 0.15, h: 0.15, color: '#2d5016' },
    // South America
    { x: 0.25, y: 0.6, w: 0.1, h: 0.18, color: '#3a6b1f' },
    // Europe
    { x: 0.45, y: 0.25, w: 0.08, h: 0.08, color: '#3d5a2c' },
    // Africa
    { x: 0.48, y: 0.55, w: 0.12, h: 0.25, color: '#4a7c2a' },
    // Middle East
    { x: 0.52, y: 0.45, w: 0.06, h: 0.08, color: '#3f6a2b' },
    // Central Asia
    { x: 0.55, y: 0.35, w: 0.12, h: 0.1, color: '#4a7a2d' },
    // China & East Asia
    { x: 0.65, y: 0.35, w: 0.12, h: 0.1, color: '#3e6927' },
    // India
    { x: 0.58, y: 0.48, w: 0.06, h: 0.08, color: '#4a7c2a' },
    // Southeast Asia
    { x: 0.68, y: 0.52, w: 0.08, h: 0.08, color: '#406a2b' },
    // Australia
    { x: 0.78, y: 0.68, w: 0.08, h: 0.08, color: '#3f682a' },
    // Antarctica (partial)
    { x: 0.0, y: 0.92, w: 1.0, h: 0.08, color: '#556b7a' },
    // Greenland
    { x: 0.35, y: 0.1, w: 0.04, h: 0.06, color: '#5a7a8b' },
    // Japan
    { x: 0.76, y: 0.38, w: 0.02, h: 0.03, color: '#406a2b' },
    // Indonesia
    { x: 0.71, y: 0.55, w: 0.04, h: 0.04, color: '#3e6927' },
    // Philippines
    { x: 0.76, y: 0.48, w: 0.02, h: 0.03, color: '#406a2b' },
  ];

  // Draw continents with improved gradients
  continentData.forEach((cont) => {
    ctx.fillStyle = cont.color;
    const x = cont.x * canvas.width;
    const y = cont.y * canvas.height;
    const w = cont.w * canvas.width;
    const h = cont.h * canvas.height;

    // Add slight noise/irregularity to continent edges
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add subtle shading
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = gradient;
    ctx.fill();
  });

  // Add ocean depth variation
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 100);
    gradient.addColorStop(0, 'rgba(58, 123, 213, 0.1)');
    gradient.addColorStop(1, 'rgba(26, 58, 82, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 100, y - 100, 200, 200);
  }

  // Add cloud/atmosphere effect
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 30 + 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add subtle city lights effect at night
  ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
  const cities = [
    { x: 0.22, y: 0.35 }, // NYC
    { x: 0.25, y: 0.7 }, // São Paulo
    { x: 0.47, y: 0.28 }, // Europe
    { x: 0.5, y: 0.5 }, // Africa
    { x: 0.58, y: 0.48 }, // India
    { x: 0.65, y: 0.4 }, // China
    { x: 0.78, y: 0.7 }, // Australia
  ];

  cities.forEach((city) => {
    const x = city.x * canvas.width;
    const y = city.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  });

  return new CanvasTexture(canvas);
}

function GlobeMarkers({ locations, selectedId, onSelect, autoRotate }) {
  const groupRef = useRef();
  const pulseRefs = useRef({});

  useFrame(() => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += 0.00024;
    }

    // Animate pulse effects
    Object.keys(pulseRefs.current).forEach((key) => {
      const mesh = pulseRefs.current[key];
      if (mesh) {
        mesh.scale.x = 1 + Math.sin(Date.now() * 0.005) * 0.2;
        mesh.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.2;
        mesh.scale.z = 1 + Math.sin(Date.now() * 0.005) * 0.2;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {locations && locations.map((location, index) => {
        const lat = parseFloat(location.latitude) || 0;
        const lon = parseFloat(location.longitude) || 0;
        
        if (isNaN(lat) || isNaN(lon)) return null;

        const position = latLonToVector3(lat, lon, 2.05);
        const intensity = Math.min(1, Math.max(0.3, (location.visitor_count || 1) / 35));
        const key = `${location.country}-${location.city}-${lat}-${lon}-${index}`;

        return (
          <group key={key} position={position}>
            {/* Glow halo */}
            <mesh
              ref={(mesh) => {
                if (mesh) pulseRefs.current[key] = mesh;
              }}
            >
              <sphereGeometry args={[0.04 + intensity * 0.014, 16, 16]} />
              <meshStandardMaterial
                color={selectedId === location.id ? '#ff00ff' : '#7c3aed'}
                emissive={selectedId === location.id ? '#ff00ff' : '#a78bfa'}
                emissiveIntensity={1.2}
                wireframe={false}
                toneMapped={false}
              />
            </mesh>

            {/* Core dot */}
            <mesh position={[0, 0, 0.001]}>
              <sphereGeometry args={[0.02 + intensity * 0.008, 12, 12]} />
              <meshStandardMaterial
                color={selectedId === location.id ? '#ffff00' : '#fbbf24'}
                emissive={selectedId === location.id ? '#ffff00' : '#fcd34d'}
                emissiveIntensity={1.5}
              />
            </mesh>

            {/* Tooltip */}
            <Html distanceFactor={7} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(10, 15, 45, 0.95)',
                  color: '#f0f9ff',
                  fontSize: 11,
                  border: '1.5px solid rgba(147, 51, 234, 0.5)',
                  minWidth: 160,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(16px)',
                  fontWeight: 600,
                }}
                onClick={(e) => { e.stopPropagation(); onSelect(location); }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                  {location.city || 'Unknown Location'}
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: '#cbd5e1' }}>
                  {location.country || 'Unknown Country'}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#a5f3fc' }}>
                  👥 {location.visitor_count || 1} visitor{location.visitor_count === 1 ? '' : 's'}
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function EarthGlobe() {
  const meshRef = useRef();
  const atmosphereRef = useRef();
  const { camera } = useThree();

  const earthTexture = useMemo(() => createEarthTexture(), []);

  useEffect(() => {
    camera.position.set(0, 0, 6.5);
    camera.updateProjectionMatrix();
  }, [camera]);

  return (
    <group>
      {/* Main Earth */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[2, 128, 128]} />
        <meshPhongMaterial
          map={earthTexture}
          shininess={5}
          flatShading={false}
          emissive={new Color('#0a1f2e')}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[2.05, 64, 64]} />
        <meshStandardMaterial
          transparent
          color={new Color('#1e3a8a')}
          opacity={0.15}
          side={2}
          wireframe={false}
          emissive={new Color('#3b82f6')}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Outer glow layer */}
      <mesh>
        <sphereGeometry args={[2.08, 32, 32]} />
        <meshStandardMaterial
          transparent
          color={new Color('#0369a1')}
          opacity={0.08}
          side={2}
          wireframe={false}
          emissive={new Color('#0ea5e9')}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

export default function Globe({ locations = [], selectedVisitor, onLocationSelect }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const selectedId = selectedVisitor?.id;
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #020818 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 35 }}
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 2]}
      >
        {/* Lighting setup */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 3, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} />
        <pointLight position={[0, 0, 5]} intensity={0.2} color="#3b82f6" />

        {/* Background stars */}
        <Stars radius={100} depth={50} count={5000} factor={10} saturation={0.3} fade />

        {/* Earth globe */}
        <EarthGlobe />

        {/* Visitor markers */}
        <GlobeMarkers
          locations={locations}
          selectedId={selectedId}
          onSelect={onLocationSelect}
          autoRotate={autoRotate}
        />

        {/* Interaction controls */}
        <OrbitControls
          enablePan={false}
          enableZoom
          zoomSpeed={0.5}
          rotateSpeed={0.5}
          minDistance={3.5}
          maxDistance={12}
          autoRotate={autoRotate}
          autoRotateSpeed={0.12}
          dampingFactor={0.05}
          enableDamping
        />
      </Canvas>

      {/* Control buttons */}
      <div style={{ position: 'absolute', right: 18, top: 18, display: 'grid', gap: 10, zIndex: 10 }}>
        <button
          onClick={() => setAutoRotate((v) => !v)}
          style={{
            ...controlButtonStyle,
            background: autoRotate ? 'rgba(139, 92, 246, 0.8)' : 'rgba(15, 23, 42, 0.92)',
          }}
        >
          {autoRotate ? '◉ AUTO' : '◌ MANUAL'}
        </button>
        <button
          onClick={() => setAutoRotate(true)}
          style={controlButtonStyle}
        >
          ⟲ RESET
        </button>
      </div>

      {/* Info panel */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          bottom: 18,
          padding: '12px 16px',
          borderRadius: 12,
          background: 'rgba(8, 15, 39, 0.92)',
          color: '#e0e7ff',
          fontSize: 11,
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(147, 51, 234, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          fontWeight: 500,
        }}
      >
        <div>🌍 Live Earth Globe</div>
        <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 10 }}>
          {locations?.length || 0} visitor locations mapped
        </div>
      </div>
    </div>
  );
}

const controlButtonStyle = {
  minWidth: 100,
  height: 40,
  borderRadius: 10,
  border: '1px solid rgba(147, 51, 234, 0.3)',
  background: 'rgba(15, 23, 42, 0.92)',
  color: '#f1f5f9',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
};
