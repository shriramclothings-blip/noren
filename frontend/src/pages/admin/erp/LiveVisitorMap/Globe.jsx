import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import {
  Vector3,
  Color,
  CanvasTexture,
  QuadraticBezierCurve3,
  BufferGeometry,
  Float32BufferAttribute,
  TextureLoader,
} from 'three';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Play, Pause, Globe as GlobeIcon, Tag, MapPin } from 'lucide-react';

const EARTH_RADIUS = 2.0;
const SERVER_LOCATION = { lat: 19.0760, lon: 72.8777, label: 'HQ Server (Mumbai, India)' };

// Comprehensive Geo-lookup dictionary for coordinates
const GEO_LOOKUP = {
  'mumbai': { lat: 19.0760, lon: 72.8777 },
  'delhi': { lat: 28.6139, lon: 77.2090 },
  'new delhi': { lat: 28.6139, lon: 77.2090 },
  'bangalore': { lat: 12.9716, lon: 77.5946 },
  'bengaluru': { lat: 12.9716, lon: 77.5946 },
  'hyderabad': { lat: 17.3850, lon: 78.4867 },
  'ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'chennai': { lat: 13.0827, lon: 80.2707 },
  'kolkata': { lat: 22.5726, lon: 88.3639 },
  'surat': { lat: 21.1702, lon: 72.8311 },
  'pune': { lat: 18.5204, lon: 73.8567 },
  'bharuch': { lat: 21.7051, lon: 72.9959 },
  'vadodara': { lat: 22.3072, lon: 73.1812 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'paris': { lat: 48.8566, lon: 2.3522 },
  'tokyo': { lat: 35.6762, lon: 139.6503 },
  'dubai': { lat: 25.2048, lon: 55.2708 },
  'singapore': { lat: 1.3521, lon: 103.8198 },
  'sydney': { lat: -33.8688, lon: 151.2093 },
  'melbourne': { lat: -37.8136, lon: 144.9631 },
  'toronto': { lat: 43.6532, lon: -79.3832 },
  'berlin': { lat: 52.5200, lon: 13.4050 },
  'india': { lat: 20.5937, lon: 78.9629 },
  'united states': { lat: 37.0902, lon: -95.7129 },
  'usa': { lat: 37.0902, lon: -95.7129 },
  'united kingdom': { lat: 55.3781, lon: -3.4360 },
  'uk': { lat: 55.3781, lon: -3.4360 },
  'canada': { lat: 56.1304, lon: -106.3468 },
  'australia': { lat: -25.2744, lon: 133.7751 },
  'germany': { lat: 51.1657, lon: 10.4515 },
  'japan': { lat: 36.2048, lon: 138.2529 },
  'uae': { lat: 23.4241, lon: 53.8478 },
};

// Major Countries for on-globe typography labels
const COUNTRY_LABELS = [
  { name: 'INDIA', lat: 20.5937, lon: 78.9629 },
  { name: 'UNITED STATES', lat: 37.0902, lon: -95.7129 },
  { name: 'UNITED KINGDOM', lat: 55.3781, lon: -3.4360 },
  { name: 'UNITED ARAB EMIRATES', lat: 23.4241, lon: 53.8478 },
  { name: 'JAPAN', lat: 36.2048, lon: 138.2529 },
  { name: 'AUSTRALIA', lat: -25.2744, lon: 133.7751 },
  { name: 'GERMANY', lat: 51.1657, lon: 10.4515 },
  { name: 'FRANCE', lat: 46.2276, lon: 2.2137 },
  { name: 'BRAZIL', lat: -14.2350, lon: -51.9253 },
  { name: 'CANADA', lat: 56.1304, lon: -106.3468 },
  { name: 'CHINA', lat: 35.8617, lon: 104.1954 },
  { name: 'RUSSIA', lat: 61.5240, lon: 105.3188 },
  { name: 'SOUTH AFRICA', lat: -30.5595, lon: 22.9375 },
];

function resolveCoords(loc) {
  let lat = parseFloat(loc?.latitude);
  let lon = parseFloat(loc?.longitude);
  if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) return { lat, lon };

  if (loc?.city) {
    const key = loc.city.toLowerCase().trim();
    if (GEO_LOOKUP[key]) return GEO_LOOKUP[key];
  }
  if (loc?.country) {
    const key = loc.country.toLowerCase().trim();
    if (GEO_LOOKUP[key]) return GEO_LOOKUP[key];
  }
  return { lat: 19.0760, lon: 72.8777 };
}

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

// Generate realistic Earth texture map with printed country names & borders directly on canvas
function createDetailedEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Ocean gradient
  const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGradient.addColorStop(0, '#040d1a');
  oceanGradient.addColorStop(0.5, '#0a1d36');
  oceanGradient.addColorStop(1, '#040d1a');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawPolygon = (points, fillColor, strokeColor) => {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor || 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * canvas.width;
      const y = ((90 - lat) / 180) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const landColor = '#122640';
  const landHighlight = '#1c395e';

  // North America
  drawPolygon([
    [-168, 65], [-140, 70], [-125, 50], [-125, 30], [-105, 20], [-80, 8],
    [-75, 10], [-80, 25], [-75, 35], [-60, 46], [-65, 60], [-100, 75], [-140, 75]
  ], landColor, landHighlight);

  // South America
  drawPolygon([
    [-80, 10], [-60, 12], [-35, -5], [-38, -20], [-55, -35], [-70, -55], [-75, -45], [-80, -5]
  ], landColor, landHighlight);

  // Greenland
  drawPolygon([
    [-55, 60], [-20, 70], [-20, 83], [-60, 82]
  ], '#1f385a', landHighlight);

  // Europe
  drawPolygon([
    [-10, 36], [0, 43], [15, 40], [30, 40], [40, 50], [30, 70], [10, 70], [-10, 60], [-10, 45]
  ], landColor, landHighlight);

  // Africa
  drawPolygon([
    [-17, 35], [30, 32], [50, 12], [42, -10], [30, -34], [18, -34], [10, 0], [-15, 12]
  ], landColor, landHighlight);

  // Asia (including India, China, Russia, Arabia)
  drawPolygon([
    [40, 40], [60, 25], [70, 30], [78, 8], [88, 22], [100, 10], [120, 15],
    [125, 30], [140, 35], [170, 65], [170, 75], [70, 75], [50, 55]
  ], landColor, landHighlight);

  // India Detail Outline
  drawPolygon([
    [68, 24], [72, 33], [88, 27], [88, 21], [80, 12], [77, 8], [73, 15]
  ], '#1b3f6c', '#38bdf8');

  // Japan
  drawPolygon([
    [130, 31], [140, 36], [142, 44], [138, 44]
  ], landColor, landHighlight);

  // Australia
  drawPolygon([
    [113, -22], [130, -12], [144, -14], [153, -28], [140, -38], [115, -35]
  ], landColor, landHighlight);

  // Antarctica
  drawPolygon([
    [-180, -70], [180, -70], [180, -90], [-180, -90]
  ], '#1b3150', '#38557e');

  // Print Country Name Typography Labels on Texture Map
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.textAlign = 'center';

  COUNTRY_LABELS.forEach((c) => {
    const x = ((c.lon + 180) / 360) * canvas.width;
    const y = ((90 - c.lat) / 180) * canvas.height;
    ctx.fillText(c.name, x, y);
  });

  // Print Latitude / Longitude coordinate grid overlay
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * canvas.height;
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

// 3D Country Labels rendered on sphere surface
function Country3DLabels() {
  return (
    <group>
      {COUNTRY_LABELS.map((country, i) => {
        const pos = latLonToVector3(country.lat, country.lon, EARTH_RADIUS + 0.01);
        return (
          <group key={i} position={pos}>
            <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  color: 'rgba(226, 232, 240, 0.85)',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 6px rgba(0,0,0,0.8), 0 0 12px rgba(56, 189, 248, 0.4)',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {country.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// 3D Connection Arcs and Moving Light Particles
function ConnectionArcs({ locations }) {
  const serverPos = useMemo(() => latLonToVector3(SERVER_LOCATION.lat, SERVER_LOCATION.lon, EARTH_RADIUS + 0.02), []);
  const particlesRef = useRef([]);

  const arcData = useMemo(() => {
    return locations.map((loc) => {
      const coords = resolveCoords(loc);
      const visitorPos = latLonToVector3(coords.lat, coords.lon, EARTH_RADIUS + 0.02);
      const midPoint = new Vector3().addVectors(visitorPos, serverPos).multiplyScalar(0.5);
      const distance = visitorPos.distanceTo(serverPos);

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
        id: `${loc.country}-${loc.city}-${coords.lat}-${coords.lon}`,
        curve,
        geometry,
      };
    });
  }, [locations, serverPos]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particlesRef.current.forEach((mesh, idx) => {
      if (mesh && arcData[idx]) {
        const progress = (t * 0.45 + idx * 0.2) % 1;
        const pt = arcData[idx].curve.getPoint(progress);
        mesh.position.copy(pt);
      }
    });
  });

  return (
    <group>
      {/* HQ Server Node Marker */}
      <group position={serverPos}>
        <mesh>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(2, 132, 199, 0.9)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: '1px solid #38bdf8', whiteSpace: 'nowrap' }}>
            ⚡ {SERVER_LOCATION.label}
          </div>
        </Html>
      </group>

      {/* Arcs and Particles */}
      {arcData.map((arc, i) => (
        <group key={arc.id || i}>
          <line geometry={arc.geometry}>
            <lineBasicMaterial attach="material" color={i % 2 === 0 ? '#8b5cf6' : '#38bdf8'} transparent opacity={0.65} linewidth={1.5} />
          </line>

          <mesh ref={(el) => (particlesRef.current[i] = el)}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#ffffff" emissive={i % 2 === 0 ? '#a855f7' : '#38bdf8'} emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Precise 3D Pinpoint Drops (with Stem Needles and Glowing Bulbs)
function GlobeMarkers({ locations, selectedVisitor, onSelect }) {
  return (
    <group>
      {locations.map((loc, idx) => {
        const coords = resolveCoords(loc);
        const basePos = latLonToVector3(coords.lat, coords.lon, EARTH_RADIUS + 0.005);
        const topPos = latLonToVector3(coords.lat, coords.lon, EARTH_RADIUS + 0.08);

        const count = loc.visitor_count || 1;
        const intensity = Math.min(1.5, 0.4 + count / 20);
        const isSelected = selectedVisitor && (selectedVisitor.latitude === coords.lat && selectedVisitor.longitude === coords.lon);

        // Stem needle points
        const stemPositions = new Float32Array([
          basePos.x, basePos.y, basePos.z,
          topPos.x, topPos.y, topPos.z
        ]);
        const stemGeometry = new BufferGeometry();
        stemGeometry.setAttribute('position', new Float32BufferAttribute(stemPositions, 3));

        return (
          <group key={idx}>
            {/* 3D Pin Stem Line */}
            <line geometry={stemGeometry}>
              <lineBasicMaterial attach="material" color={isSelected ? '#f43f5e' : '#38bdf8'} opacity={0.8} transparent linewidth={2} />
            </line>

            {/* Pin Head Bulb at top position */}
            <group position={topPos}>
              <mesh>
                <sphereGeometry args={[0.04 * intensity, 16, 16]} />
                <meshStandardMaterial
                  color={isSelected ? '#f43f5e' : '#38bdf8'}
                  emissive={isSelected ? '#f43f5e' : '#38bdf8'}
                  emissiveIntensity={2}
                  transparent
                  opacity={0.8}
                  toneMapped={false}
                />
              </mesh>

              <mesh position={[0, 0, 0.002]}>
                <sphereGeometry args={[0.02 * intensity, 12, 12]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive={isSelected ? '#fbbf24' : '#67e8f9'}
                  emissiveIntensity={2.5}
                  toneMapped={false}
                />
              </mesh>

              {/* Pinpoint Label Tag */}
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
                  <div style={{ color: isSelected ? '#f43f5e' : '#38bdf8', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} color={isSelected ? '#f43f5e' : '#38bdf8'} />
                    {loc.city || 'Pinpoint'}, {loc.country}
                  </div>
                  <div style={{ fontSize: 10, color: '#34d399', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                    {count} active visitor{count > 1 ? 's' : ''} (Lat: {coords.lat.toFixed(2)}, Lon: {coords.lon.toFixed(2)})
                  </div>
                </div>
              </Html>
            </group>
          </group>
        );
      })}
    </group>
  );
}

// 3D Sphere Globe mesh with realistic maps texture
function EarthGlobe() {
  const fallbackTexture = useMemo(() => createDetailedEarthTexture(), []);
  const [loadedTexture, setLoadedTexture] = useState(null);

  useEffect(() => {
    const loader = new TextureLoader();
    loader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
      (tex) => setLoadedTexture(tex),
      undefined,
      () => setLoadedTexture(fallbackTexture)
    );
  }, [fallbackTexture]);

  const map = loadedTexture || fallbackTexture;

  return (
    <group>
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
        <meshStandardMaterial
          map={map}
          roughness={0.65}
          metalness={0.15}
          emissive={new Color('#0b1936')}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Atmospheric Neon Glow */}
      <mesh scale={1.022}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color={new Color('#8b5cf6')}
          emissive={new Color('#38bdf8')}
          emissiveIntensity={0.25}
          transparent
          opacity={0.14}
          side={2}
        />
      </mesh>
    </group>
  );
}

// Default active global locations if database is empty
const DEFAULT_LOCATIONS = [
  { city: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777, visitor_count: 142 },
  { city: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, visitor_count: 86 },
  { city: 'Bangalore', country: 'India', latitude: 12.9716, longitude: 77.5946, visitor_count: 64 },
  { city: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060, visitor_count: 95 },
  { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, visitor_count: 52 },
  { city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, visitor_count: 38 },
  { city: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, visitor_count: 47 },
];

export default function Globe({ locations = [], selectedVisitor, onLocationSelect }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  const activeLocations = useMemo(() => {
    if (locations && locations.length > 0) return locations;
    return DEFAULT_LOCATIONS;
  }, [locations]);

  useEffect(() => {
    if (selectedVisitor && controlsRef.current) {
      const coords = resolveCoords(selectedVisitor);
      const targetVec = latLonToVector3(coords.lat, coords.lon, EARTH_RADIUS + 3.5);
      controlsRef.current.object.position.lerp(targetVec, 0.85);
      controlsRef.current.update();
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
        <ambientLight intensity={0.75} color="#ffffff" />
        <directionalLight position={[10, 8, 10]} intensity={1.4} color="#edf6ff" />
        <pointLight position={[-10, -8, -10]} intensity={0.5} color="#38bdf8" />

        <Stars radius={100} depth={50} count={5000} factor={10} saturation={0.5} fade />

        <EarthGlobe />

        {showLabels && <Country3DLabels />}

        <ConnectionArcs locations={activeLocations} />

        <GlobeMarkers locations={activeLocations} selectedVisitor={selectedVisitor} onSelect={onLocationSelect} />

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

      {/* Floating Controls Overlay */}
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
        <button onClick={handleZoomIn} style={btnStyle} title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button onClick={handleZoomOut} style={btnStyle} title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={handleReset} style={btnStyle} title="Reset Camera">
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          style={{
            ...btnStyle,
            background: showLabels ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.85)',
            borderColor: showLabels ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)',
          }}
          title="Toggle Country Labels"
        >
          <Tag size={16} color={showLabels ? '#38bdf8' : '#94a3b8'} />
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
        <button onClick={toggleFullscreen} style={btnStyle} title="Toggle Fullscreen">
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Bottom Info Badge */}
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
          <div style={{ fontWeight: 700, fontSize: 12, color: '#38bdf8' }}>3D World Map with Country Labels</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            {activeLocations.length} pinpoint location{activeLocations.length === 1 ? '' : 's'} mapped
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
