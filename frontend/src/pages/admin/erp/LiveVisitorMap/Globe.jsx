import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import {
  Vector3,
  Color,
  CanvasTexture,
  Vector2,
  QuadraticBezierCurve3,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  Line,
} from 'three';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Play, Pause, Globe as GlobeIcon } from 'lucide-react';

const EARTH_RADIUS = 2.0;
const SERVER_LOCATION = { lat: 19.0760, lon: 72.8777, label: 'HQ Server (India)' };

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function latLonToVector3(lat, lon, radius = EARTH_RADIUS) {
  const phi = toRadians(90 - lat);
  const theta = toRadians(lon + 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Generate high-resolution procedural Earth texture with oceans, continents, and night city lights
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Deep space ocean base
  const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGradient.addColorStop(0, '#060d1e');
  oceanGradient.addColorStop(0.5, '#0c1b3a');
  oceanGradient.addColorStop(1, '#060d1e');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Continent definitions with geographical positions
  const continents = [
    { x: 0.14, y: 0.28, w: 0.19, h: 0.26, color: '#162847', highlight: '#1d365f' }, // N. America
    { x: 0.31, y: 0.06, w: 0.06, h: 0.12, color: '#2a3b5c', highlight: '#3a4f78' }, // Greenland
    { x: 0.21, y: 0.54, w: 0.11, h: 0.32, color: '#142a42', highlight: '#1d3b5c' }, // S. America
    { x: 0.42, y: 0.22, w: 0.09, h: 0.14, color: '#1c3456', highlight: '#254470' }, // Europe
    { x: 0.44, y: 0.42, w: 0.16, h: 0.38, color: '#1a2e4c', highlight: '#243e67' }, // Africa
    { x: 0.51, y: 0.34, w: 0.08, h: 0.14, color: '#273854', highlight: '#364c70' }, // Middle East
    { x: 0.53, y: 0.24, w: 0.16, h: 0.18, color: '#1b3252', highlight: '#25436d' }, // Central Asia
    { x: 0.56, y: 0.40, w: 0.08, h: 0.14, color: '#1e385c', highlight: '#2a4c7b' }, // India
    { x: 0.64, y: 0.44, w: 0.10, h: 0.14, color: '#172c4a', highlight: '#213d66' }, // SE Asia
    { x: 0.62, y: 0.28, w: 0.14, h: 0.16, color: '#1d3659', highlight: '#284876' }, // China
    { x: 0.74, y: 0.30, w: 0.04, h: 0.10, color: '#223d63', highlight: '#305386' }, // Japan
    { x: 0.75, y: 0.60, w: 0.13, h: 0.18, color: '#1a2e4a', highlight: '#254067' }, // Australia
    { x: 0.88, y: 0.70, w: 0.04, h: 0.08, color: '#1e3454', highlight: '#2c4974' }, // New Zealand
    { x: 0.00, y: 0.88, w: 1.00, h: 0.12, color: '#2b3e5a', highlight: '#3c557a' }, // Antarctica
  ];

  continents.forEach((cont) => {
    const x = cont.x * canvas.width;
    const y = cont.y * canvas.height;
    const w = cont.w * canvas.width;
    const h = cont.h * canvas.height;

    ctx.fillStyle = cont.color;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0.08, 0, Math.PI * 2);
    ctx.fill();

    const radGrad = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w / 2);
    radGrad.addColorStop(0, cont.highlight);
    radGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad;
    ctx.fill();
  });

  // Night city lights (glowing gold/cyan dots)
  const cityLights = [
    [0.18, 0.32], [0.16, 0.35], [0.22, 0.30], [0.20, 0.38], // N. America cities
    [0.23, 0.60], [0.25, 0.72], [0.22, 0.65],             // S. America cities
    [0.44, 0.25], [0.46, 0.24], [0.48, 0.27], [0.45, 0.28], // European cities
    [0.57, 0.42], [0.58, 0.44], [0.56, 0.46],             // Indian cities
    [0.65, 0.32], [0.67, 0.35], [0.68, 0.38],             // China cities
    [0.75, 0.32],                                         // Tokyo
    [0.78, 0.65], [0.77, 0.68],                           // Sydney/Melb
    [0.52, 0.36], [0.53, 0.38],                           // Middle East
  ];

  cityLights.forEach(([cx, cy]) => {
    const x = cx * canvas.width;
    const y = cy * canvas.height;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 16);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
    grad.addColorStop(0.4, 'rgba(139, 92, 246, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  });

  // Subtle grid lines (Latitude & Longitude)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;

  for (let lat = -80; lat <= 80; lat += 20) {
    const y = (canvas.height / 2) - (lat / 90) * (canvas.height / 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  return new CanvasTexture(canvas);
}

// 3D Connection Arcs component with moving glowing particles
function ConnectionArcs({ locations, autoRotate }) {
  const serverPos = useMemo(() => latLonToVector3(SERVER_LOCATION.lat, SERVER_LOCATION.lon, EARTH_RADIUS + 0.02), []);
  const particlesRef = useRef([]);

  const arcData = useMemo(() => {
    return locations.map((loc) => {
      const lat = parseFloat(loc.latitude);
      const lon = parseFloat(loc.longitude);
      if (isNaN(lat) || isNaN(lon)) return null;

      const visitorPos = latLonToVector3(lat, lon, EARTH_RADIUS + 0.02);
      const midPoint = new Vector3().addVectors(visitorPos, serverPos).multiplyScalar(0.5);
      const distance = visitorPos.distanceTo(serverPos);

      // Arc curvature based on distance
      const arcHeight = Math.min(1.2, 0.2 + distance * 0.35);
      midPoint.normalize().multiplyScalar(EARTH_RADIUS + arcHeight);

      const curve = new QuadraticBezierCurve3(visitorPos, midPoint, serverPos);
      const points = curve.getPoints(40);

      const positions = new Float32Array(points.length * 3);
      points.forEach((pt, i) => {
        positions[i * 3 + 0] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      });

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

      return {
        id: `${loc.country}-${loc.city}-${lat}-${lon}`,
        curve,
        geometry,
        distance,
      };
    }).filter(Boolean);
  }, [locations, serverPos]);

  // Animate particles moving along curves
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particlesRef.current.forEach((particleMesh, idx) => {
      if (particleMesh && arcData[idx]) {
        const speed = 0.4 + (idx % 3) * 0.15;
        const progress = (t * speed + idx * 0.2) % 1;
        const point = arcData[idx].curve.getPoint(progress);
        particleMesh.position.copy(point);
      }
    });
  });

  return (
    <group>
      {/* Central Server Marker (HQ Node) */}
      <group position={serverPos}>
        <mesh>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color="#0284c7" transparent opacity={0.4} wireframe />
        </mesh>
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(2, 132, 199, 0.85)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid #38bdf8' }}>
            ⚡ {SERVER_LOCATION.label}
          </div>
        </Html>
      </group>

      {/* Arcs and Particles */}
      {arcData.map((arc, i) => (
        <group key={arc.id}>
          {/* Arc Line */}
          <line geometry={arc.geometry}>
            <lineBasicMaterial attach="material" color={i % 2 === 0 ? '#8b5cf6' : '#38bdf8'} transparent opacity={0.65} linewidth={1.5} />
          </line>

          {/* Moving Glowing Particle along arc */}
          <mesh ref={(el) => (particlesRef.current[i] = el)}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color="#ffffff" emissive={i % 2 === 0 ? '#a855f7' : '#38bdf8'} emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Glowing visitor location markers
function GlobeMarkers({ locations, selectedVisitor, onSelect }) {
  const selectedId = selectedVisitor?.id;

  return (
    <group>
      {locations.map((loc, idx) => {
        const lat = parseFloat(loc.latitude);
        const lon = parseFloat(loc.longitude);
        if (isNaN(lat) || isNaN(lon)) return null;

        const pos = latLonToVector3(lat, lon, EARTH_RADIUS + 0.015);
        const count = loc.visitor_count || 1;
        const intensity = Math.min(1.5, 0.4 + count / 20);
        const isSelected = selectedVisitor && (selectedVisitor.latitude === loc.latitude && selectedVisitor.longitude === loc.longitude);
        const key = `${loc.country}-${loc.city}-${lat}-${lon}-${idx}`;

        return (
          <group key={key} position={pos}>
            {/* Outer Pulsing Aura */}
            <mesh>
              <sphereGeometry args={[0.04 * intensity, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#f43f5e' : '#38bdf8'}
                emissive={isSelected ? '#f43f5e' : '#38bdf8'}
                emissiveIntensity={1.8}
                transparent
                opacity={0.7}
                toneMapped={false}
              />
            </mesh>

            {/* Core Bright Pin */}
            <mesh position={[0, 0, 0.002]}>
              <sphereGeometry args={[0.02 * intensity, 12, 12]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={isSelected ? '#fbbf24' : '#67e8f9'}
                emissiveIntensity={2.2}
                toneMapped={false}
              />
            </mesh>

            {/* Hover Tooltip */}
            <Html distanceFactor={7} style={{ pointerEvents: 'all' }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(loc);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(6, 11, 24, 0.94)',
                  color: '#edf6ff',
                  border: isSelected ? '1.5px solid #f43f5e' : '1px solid rgba(56, 189, 248, 0.4)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(12px)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <div style={{ color: isSelected ? '#f43f5e' : '#38bdf8', fontWeight: 700, fontSize: 12 }}>
                  {loc.city || 'Location'}, {loc.country}
                </div>
                <div style={{ fontSize: 10, color: '#34d399', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                  {count} visitor{count > 1 ? 's' : ''}
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// 3D Sphere Globe mesh
function EarthGlobe() {
  const texture = useMemo(() => createEarthTexture(), []);

  return (
    <group>
      {/* Earth Surface */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.7}
          metalness={0.1}
          emissive={new Color('#0b1936')}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Atmospheric Neon Glow (Blue/Purple Aura) */}
      <mesh scale={1.022}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color={new Color('#8b5cf6')}
          emissive={new Color('#38bdf8')}
          emissiveIntensity={0.25}
          transparent
          opacity={0.12}
          side={2}
        />
      </mesh>
    </group>
  );
}

// Main 3D Globe Component
export default function Globe({ locations = [], selectedVisitor, onLocationSelect }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  // Focus globe camera on selected visitor
  useEffect(() => {
    if (selectedVisitor && selectedVisitor.latitude && selectedVisitor.longitude && controlsRef.current) {
      const lat = parseFloat(selectedVisitor.latitude);
      const lon = parseFloat(selectedVisitor.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        const targetVec = latLonToVector3(lat, lon, EARTH_RADIUS + 3.5);
        controlsRef.current.object.position.lerp(targetVec, 0.8);
        controlsRef.current.update();
      }
    }
  }, [selectedVisitor]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleZoomIn = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(1.25);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(1.25);
      controlsRef.current.update();
    }
  };

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setAutoRotate(true);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 540,
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #0b1220 0%, #030814 60%, #02050c 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 38 }}
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.7} color="#ffffff" />
        <directionalLight position={[10, 8, 10]} intensity={1.3} color="#edf6ff" />
        <pointLight position={[-10, -8, -10]} intensity={0.5} color="#38bdf8" />

        <Stars radius={100} depth={50} count={5000} factor={10} saturation={0.5} fade />

        <EarthGlobe />

        <ConnectionArcs locations={locations} autoRotate={autoRotate} />

        <GlobeMarkers locations={locations} selectedVisitor={selectedVisitor} onSelect={onLocationSelect} />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom
          zoomSpeed={0.7}
          rotateSpeed={0.5}
          minDistance={3.0}
          maxDistance={12}
          autoRotate={autoRotate}
          autoRotateSpeed={0.4}
          enableDamping
          dampingFactor={0.06}
        />
      </Canvas>

      {/* Control Buttons Overlay */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 10,
        }}
      >
        <button
          onClick={handleZoomIn}
          style={btnStyle}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          style={btnStyle}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleReset}
          style={btnStyle}
          title="Reset Camera"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            ...btnStyle,
            background: autoRotate ? 'rgba(139, 92, 246, 0.4)' : 'rgba(15, 23, 42, 0.85)',
            borderColor: autoRotate ? '#8b5cf6' : 'rgba(148, 163, 184, 0.2)',
          }}
          title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
        >
          {autoRotate ? <Pause size={16} color="#c084fc" /> : <Play size={16} color="#38bdf8" />}
        </button>
        <button
          onClick={toggleFullscreen}
          style={btnStyle}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Bottom Globe Info Badge */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'rgba(6, 11, 24, 0.88)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          color: '#edf6ff',
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <GlobeIcon size={16} color="#38bdf8" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#38bdf8' }}>Interactive 3D Earth</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            {locations.length} active visitor region{locations.length === 1 ? '' : 's'} mapped
          </div>
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'rgba(15, 23, 42, 0.85)',
  color: '#edf6ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.2s',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};
