import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei';
import { Vector3, Color, TextureLoader, CanvasTexture, Vector2 } from 'three';

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

// Create normal map for terrain relief effect (bump mapping)
function createNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Initialize with neutral normal (middle gray = no slope)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Generate Perlin-like noise for terrain
  const scale = 0.005;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      
      // Simple noise-based normal generation
      const nx = x * scale;
      const ny = y * scale;
      
      // Pseudo-random normal vectors for terrain
      const hash = Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453;
      const angle = (hash - Math.floor(hash)) * Math.PI * 2;
      
      const strength = Math.sin(nx * 5) * Math.cos(ny * 5) * 0.3 + 0.5;
      
      data[idx + 0] = (Math.cos(angle) * strength * 0.3 + 0.5) * 255;
      data[idx + 1] = (Math.sin(angle) * strength * 0.3 + 0.5) * 255;
      data[idx + 2] = 200; // Z component (pointing mostly up)
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new CanvasTexture(canvas);
}

// Create Earth texture similar to Google Earth with satellite imagery
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Base ocean water - realistic blue
  const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGradient.addColorStop(0, '#0a2463');
  oceanGradient.addColorStop(0.5, '#1a4d7a');
  oceanGradient.addColorStop(1, '#0a2463');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add realistic continent colors with natural variation
  const continents = [
    // North America - green with brown elevation
    { x: 0.15, y: 0.3, w: 0.18, h: 0.25, color: '#4a7c3d', elevation: '#6b8e5f' },
    // Greenland - ice white
    { x: 0.32, y: 0.05, w: 0.05, h: 0.1, color: '#d4e8f7', elevation: '#b8d8f0' },
    // South America - lush green
    { x: 0.2, y: 0.55, w: 0.12, h: 0.3, color: '#3d6e2f', elevation: '#5a8c46' },
    // Europe - temperate green
    { x: 0.42, y: 0.22, w: 0.08, h: 0.12, color: '#5a8c3a', elevation: '#7aa84f' },
    // Africa - savanna green/brown
    { x: 0.45, y: 0.45, w: 0.15, h: 0.35, color: '#6b8c3a', elevation: '#8ca856' },
    // Middle East - desert tan/beige
    { x: 0.5, y: 0.35, w: 0.08, h: 0.12, color: '#a89968', elevation: '#c9b88a' },
    // Central Asia - mountain brown
    { x: 0.52, y: 0.28, w: 0.12, h: 0.1, color: '#8b7355', elevation: '#aa8d6b' },
    // India - tropical green
    { x: 0.56, y: 0.42, w: 0.07, h: 0.12, color: '#4a7c3d', elevation: '#6b8e5f' },
    // Southeast Asia - dense forest
    { x: 0.63, y: 0.46, w: 0.1, h: 0.12, color: '#2d5a2a', elevation: '#4a7c3d' },
    // China - varied terrain
    { x: 0.62, y: 0.3, w: 0.13, h: 0.15, color: '#5a8c3a', elevation: '#7aa84f' },
    // Japan - mountainous
    { x: 0.73, y: 0.32, w: 0.04, h: 0.08, color: '#6b7a3d', elevation: '#8a9654' },
    // Australia - arid brown
    { x: 0.75, y: 0.62, w: 0.12, h: 0.15, color: '#9a8a5a', elevation: '#b8a875' },
    // New Zealand - green
    { x: 0.88, y: 0.72, w: 0.04, h: 0.08, color: '#4a7c3d', elevation: '#6b8e5f' },
    // Antarctica - ice
    { x: 0.0, y: 0.88, w: 1.0, h: 0.12, color: '#e8f4f8', elevation: '#d0e8f0' },
  ];

  // Draw continents with realistic coloring
  continents.forEach((cont) => {
    const x = cont.x * canvas.width;
    const y = cont.y * canvas.height;
    const w = cont.w * canvas.width;
    const h = cont.h * canvas.height;

    // Main continent color
    ctx.fillStyle = cont.color;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Add elevation shading with normal map effect
    const elevationGradient = ctx.createLinearGradient(x, y, x + w, y + h);
    elevationGradient.addColorStop(0, `rgba(255,255,255,0.08)`);
    elevationGradient.addColorStop(0.4, `rgba(255,255,255,0.02)`);
    elevationGradient.addColorStop(0.6, `rgba(0,0,0,0.02)`);
    elevationGradient.addColorStop(1, `rgba(0,0,0,0.12)`);
    ctx.fillStyle = elevationGradient;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Add detailed texture noise for terrain
    for (let i = 0; i < 30; i++) {
      const nx = x + Math.random() * w;
      const ny = y + Math.random() * h;
      const radius = Math.random() * 40 + 20;
      const intensity = Math.random() * 0.08;
      const noiseFill = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius);
      noiseFill.addColorStop(0, `rgba(100,100,100,${intensity})`);
      noiseFill.addColorStop(1, `rgba(100,100,100,0)`);
      ctx.fillStyle = noiseFill;
      ctx.fillRect(nx - radius, ny - radius, radius * 2, radius * 2);
    }
  });

  // Add realistic ocean features - currents and depth variation
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 150 + 100;
    const depthGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    depthGradient.addColorStop(0, 'rgba(100, 150, 200, 0.06)');
    depthGradient.addColorStop(0.7, 'rgba(50, 100, 150, 0.02)');
    depthGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = depthGradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Add subtle atmospheric scattering at poles
  const poleNorth = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.15);
  poleNorth.addColorStop(0, 'rgba(200, 220, 255, 0.15)');
  poleNorth.addColorStop(1, 'rgba(200, 220, 255, 0)');
  ctx.fillStyle = poleNorth;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.15);

  const poleSouth = ctx.createLinearGradient(0, canvas.height * 0.85, 0, canvas.height);
  poleSouth.addColorStop(0, 'rgba(200, 220, 255, 0)');
  poleSouth.addColorStop(1, 'rgba(200, 220, 255, 0.15)');
  ctx.fillStyle = poleSouth;
  ctx.fillRect(0, canvas.height * 0.85, canvas.width, canvas.height * 0.15);

  // Add subtle cloud layers
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 80 + 40;
    const opacity = Math.random() * 0.06 + 0.01;
    const cloudGradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 1.5})`);
    cloudGradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity})`);
    cloudGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
    ctx.fillStyle = cloudGradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add country borders as subtle grid lines
  ctx.strokeStyle = 'rgba(150, 150, 150, 0.08)';
  ctx.lineWidth = 0.5;

  // Latitude lines
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = (canvas.height / 2) - (lat / 90) * (canvas.height / 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Longitude lines
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Add subtle equator line
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.12)';
  ctx.lineWidth = 1;
  const equatorY = canvas.height / 2;
  ctx.beginPath();
  ctx.moveTo(0, equatorY);
  ctx.lineTo(canvas.width, equatorY);
  ctx.stroke();

  return new CanvasTexture(canvas);
}

function GlobeMarkers({ locations, selectedId, onSelect, autoRotate }) {
  const groupRef = useRef();
  const pulseRefs = useRef({});

  useFrame(() => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += 0.0002;
    }

    // Animate pulse effects
    Object.keys(pulseRefs.current).forEach((key) => {
      const mesh = pulseRefs.current[key];
      if (mesh) {
        const pulse = Math.sin(Date.now() * 0.006) * 0.25;
        mesh.scale.x = 1 + pulse;
        mesh.scale.y = 1 + pulse;
        mesh.scale.z = 1 + pulse;
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
        const isSelected = selectedId === location.id;

        return (
          <group key={key} position={position}>
            {/* Outer glow pulse */}
            <mesh
              ref={(mesh) => {
                if (mesh) pulseRefs.current[key] = mesh;
              }}
            >
              <sphereGeometry args={[0.05 + intensity * 0.016, 20, 20]} />
              <meshStandardMaterial
                color={isSelected ? '#ff1493' : '#00d4ff'}
                emissive={isSelected ? '#ff1493' : '#00d4ff'}
                emissiveIntensity={1.3}
                wireframe={false}
                toneMapped={false}
                transparent
                opacity={0.8}
              />
            </mesh>

            {/* Core bright dot */}
            <mesh position={[0, 0, 0.001]}>
              <sphereGeometry args={[0.024 + intensity * 0.01, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#ffff00' : '#ffffff'}
                emissive={isSelected ? '#ffff00' : '#ffff00'}
                emissiveIntensity={isSelected ? 1.8 : 1.5}
                toneMapped={false}
              />
            </mesh>

            {/* Ring indicator for selected */}
            {isSelected && (
              <mesh position={[0, 0, 0.0005]}>
                <torusGeometry args={[0.07, 0.005, 12, 32]} />
                <meshStandardMaterial
                  color="#ff00ff"
                  emissive="#ff00ff"
                  emissiveIntensity={1.2}
                  toneMapped={false}
                />
              </mesh>
            )}

            {/* Interactive tooltip */}
            <Html distanceFactor={7} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(5, 10, 30, 0.96)',
                  color: '#e0f7ff',
                  fontSize: 11,
                  border: '1.5px solid rgba(0, 212, 255, 0.6)',
                  minWidth: 180,
                  boxShadow: '0 20px 60px rgba(0, 20, 50, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  pointerEvents: 'all',
                }}
                onClick={(e) => { e.stopPropagation(); onSelect(location); }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#00ffff', textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
                  {location.city || 'Unknown Location'}
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: '#a0d8ff' }}>
                  {location.country || 'Unknown Country'}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#00ff88', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>●</span> {location.visitor_count || 1} visitor{location.visitor_count === 1 ? '' : 's'}
                </div>
                {isSelected && (
                  <div style={{ marginTop: 6, fontSize: 9, color: '#ffff00', fontStyle: 'italic' }}>
                    Selected
                  </div>
                )}
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
  const normalMap = useMemo(() => createNormalMap(), []);

  useEffect(() => {
    camera.position.set(0, 0, 6.5);
    camera.updateProjectionMatrix();
  }, [camera]);

  return (
    <group>
      {/* Main Earth with realistic surface */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[2, 256, 256]} />
        <meshStandardMaterial
          map={earthTexture}
          normalMap={normalMap}
          normalScale={new Vector2(0.8, 0.8)}
          roughness={0.75}
          metalness={0.05}
          emissive={new Color('#1a3a52')}
          emissiveIntensity={0.2}
          emissiveMap={earthTexture}
          side={1}
        />
      </mesh>

      {/* Thin atmosphere layer - realistic blue */}
      <mesh ref={atmosphereRef} scale={1.023}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshStandardMaterial
          transparent
          color={new Color('#0066cc')}
          opacity={0.15}
          side={2}
          wireframe={false}
          emissive={new Color('#0099ff')}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Outer glow - atmospheric scattering */}
      <mesh scale={1.04}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          transparent
          color={new Color('#00aaff')}
          opacity={0.05}
          side={2}
          wireframe={false}
          emissive={new Color('#3399ff')}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Cloud layer for more realism */}
      <mesh scale={1.008}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshStandardMaterial
          map={earthTexture}
          transparent
          opacity={0.08}
          side={1}
          emissive={new Color('#ffffff')}
          emissiveIntensity={0.05}
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
        background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #020814 50%, #000000 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 35 }}
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 2]}
      >
        {/* Realistic lighting setup similar to Google Earth */}
        <ambientLight intensity={0.6} color="#ffffff" />
        <directionalLight 
          position={[8, 5, 8]} 
          intensity={1.2} 
          castShadow 
          color="#ffffee"
          shadow={{
            mapSize: { width: 2048, height: 2048 },
            camera: { far: 50 },
          }}
        />
        <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#1a3a8a" />
        <pointLight position={[0, 0, 8]} intensity={0.3} color="#0099ff" />

        {/* Background stars */}
        <Stars radius={120} depth={60} count={6000} factor={12} saturation={0.5} fade />

        {/* Earth globe - Google Earth style */}
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
          zoomSpeed={0.6}
          rotateSpeed={0.5}
          minDistance={3.2}
          maxDistance={15}
          autoRotate={autoRotate}
          autoRotateSpeed={0.1}
          dampingFactor={0.08}
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
