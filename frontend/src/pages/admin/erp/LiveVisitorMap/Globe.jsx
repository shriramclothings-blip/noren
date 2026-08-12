import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function Globe({ locations, onLocationSelect }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 0.5, y: 0.5 });
  const [autoRotate, setAutoRotate] = useState(true);
  const animationRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Animation loop
    const animate = () => {
      // Clear with dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Draw starfield
      drawStarfield(ctx, width, height);

      // Update rotation
      if (autoRotate && !isDraggingRef.current) {
        setRotation(prev => ({
          ...prev,
          y: (prev.y + 0.0005) % 1,
        }));
      }

      // Draw globe
      drawGlobe(ctx, centerX, centerY, radius, rotation, zoom, locations);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [locations, rotation, zoom, autoRotate]);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    setAutoRotate(false);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    setRotation({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 600, background: '#0f172a', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        }}
      />

      {/* Floating Controls */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'rgba(15,23,42,0.8)',
          borderRadius: 10,
          padding: 8,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(201,169,110,0.2)',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.2))}
          title="Zoom In"
          style={{
            width: 36,
            height: 36,
            border: '1px solid rgba(201,169,110,0.3)',
            background: 'rgba(201,169,110,0.1)',
            borderRadius: 6,
            color: '#c9a96e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,169,110,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,169,110,0.1)')}
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
          title="Zoom Out"
          style={{
            width: 36,
            height: 36,
            border: '1px solid rgba(201,169,110,0.3)',
            background: 'rgba(201,169,110,0.1)',
            borderRadius: 6,
            color: '#c9a96e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,169,110,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,169,110,0.1)')}
        >
          <ZoomOut size={16} />
        </button>
        <div
          style={{
            width: '100%',
            height: 1,
            background: 'rgba(201,169,110,0.2)',
          }}
        />
        <button
          onClick={() => {
            setRotation({ x: 0.5, y: 0.5 });
            setZoom(1);
            setAutoRotate(true);
          }}
          title="Reset View"
          style={{
            width: 36,
            height: 36,
            border: '1px solid rgba(201,169,110,0.3)',
            background: 'rgba(201,169,110,0.1)',
            borderRadius: 6,
            color: '#c9a96e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,169,110,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,169,110,0.1)')}
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? 'Stop Rotation' : 'Start Rotation'}
          style={{
            width: 36,
            height: 36,
            border: '1px solid rgba(201,169,110,0.3)',
            background: autoRotate ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.1)',
            borderRadius: 6,
            color: '#c9a96e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = autoRotate ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = autoRotate ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.1)')}
        >
          ⚡
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function drawStarfield(ctx, width, height) {
  ctx.fillStyle = 'rgba(201,169,110,0.15)';
  const starCount = 100;
  for (let i = 0; i < starCount; i++) {
    const x = (i * 73 + width * 0.3) % width;
    const y = (i * 97 + height * 0.3) % height;
    const size = ((i % 3) + 1) * 0.3;
    ctx.fillRect(x, y, size, size);
  }
}

function drawGlobe(ctx, centerX, centerY, radius, rotation, zoom, locations) {
  const scale = zoom;

  const gradient = ctx.createRadialGradient(
    centerX - radius * 0.3,
    centerY - radius * 0.3,
    0,
    centerX,
    centerY,
    radius * scale
  );
  gradient.addColorStop(0, 'rgba(30, 58, 138, 0.6)');
  gradient.addColorStop(0.5, 'rgba(16, 92, 182, 0.4)');
  gradient.addColorStop(1, 'rgba(8, 51, 122, 0.3)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(201,169,110,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(201,169,110,0.2)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * scale * (0.3 + i * 0.15), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (locations && locations.length > 0) {
    locations.forEach((loc, idx) => {
      drawMarker(ctx, centerX, centerY, radius, rotation, scale, loc, idx);
    });
  }

  if (locations && locations.length > 1) {
    ctx.strokeStyle = 'rgba(201,169,110,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < Math.min(locations.length, 5); i++) {
      const loc = locations[i];
      const pos = projectToSphere(loc.lon, loc.lat, centerX, centerY, radius, rotation, scale);
      if (pos) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.quadraticCurveTo(
          centerX + (Math.random() - 0.5) * radius * 0.5,
          centerY + (Math.random() - 0.5) * radius * 0.5,
          centerX,
          centerY
        );
        ctx.stroke();
      }
    }
  }
}

function drawMarker(ctx, centerX, centerY, radius, rotation, scale, location, index) {
  const pos = projectToSphere(
    location.lon,
    location.lat,
    centerX,
    centerY,
    radius,
    rotation,
    scale
  );

  if (!pos || !isPointOnFrontHemisphere(location.lon, location.lat, rotation)) return;

  const intensity = Math.min(1, (location.visitor_count || 1) / 100);
  const markerSize = 4 + intensity * 8;

  ctx.fillStyle = `rgba(201,169,110,${0.3 * intensity})`;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, markerSize * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(201,169,110,${0.6 * intensity})`;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, markerSize * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + intensity * 0.2})`;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, markerSize * 0.7, 0, Math.PI * 2);
  ctx.fill();

  const pulse = Math.sin(Date.now() * 0.003 + index) * 0.3 + 0.7;
  ctx.strokeStyle = `rgba(201,169,110,${0.6 * pulse * intensity})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, markerSize * 2.5 * pulse, 0, Math.PI * 2);
  ctx.stroke();
}

function projectToSphere(lon, lat, centerX, centerY, radius, rotation, scale) {
  if (lon === null || lon === undefined || lat === null || lat === undefined) return null;

  let phi = (lon - rotation.y * 360) * (Math.PI / 180);
  let theta = lat * (Math.PI / 180);

  phi += rotation.x * Math.PI * 2;

  const x = Math.cos(theta) * Math.sin(phi);
  const y = Math.sin(theta);
  const z = Math.cos(theta) * Math.cos(phi);

  if (z < 0) return null;

  const scale2d = radius * scale * (0.5 + z * 0.5);
  return {
    x: centerX + x * scale2d,
    y: centerY - y * scale2d,
  };
}

function isPointOnFrontHemisphere(lon, lat, rotation) {
  if (lon === null || lon === undefined || lat === null || lat === undefined) return false;

  let phi = (lon - rotation.y * 360) * (Math.PI / 180);
  phi += rotation.x * Math.PI * 2;
  const theta = lat * (Math.PI / 180);
  const z = Math.cos(theta) * Math.cos(phi);
  return z >= 0;
}
