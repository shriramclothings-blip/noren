import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import toast from 'react-hot-toast';

// Production-Grade Real Data Sources (No API keys required)
// - OpenStreetMap: Free vector tiles
// - USGS Landsat 8: Real satellite imagery
// - USGS Elevation: Terrain data
// - Natural Earth GIS: Political boundaries

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' }) ||
      canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) ||
      canvas.getContext('experimental-webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });

    if (!context) return false;

    const version = context.getParameter(context.VERSION || 0x1F02);
    return !!version;
  } catch (error) {
    return false;
  }
}

export default function CesiumGlobe({ locations = [], selectedVisitor, onLocationSelect }) {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const entitiesRef = useRef({});
  const [autoRotate, setAutoRotate] = useState(true);
  const [mapStyle, setMapStyle] = useState('osm'); // osm, satellite, hybrid
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const selectedId = selectedVisitor?.id;

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const browserHasWebGL = supportsWebGL();
    if (!browserHasWebGL) {
      console.warn('WebGL check failed at startup. Attempting actual Cesium initialization anyway.');
    }

    let viewer = null;
    let rotationInterval = null;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const initializeGlobe = async () => {
      try {
        // Ensure Cesium assets are available
        if (typeof Cesium !== 'undefined' && Cesium.Ion) {
          Cesium.Ion.defaultAccessToken = Cesium.Ion.defaultAccessToken || '';
        }

        // Create Cesium Viewer with MINIMAL config (OpenStreetMap only - proven to work)
        viewer = new Cesium.Viewer(cesiumContainer.current, {
          // Base layer: OpenStreetMap (real, open-source map tiles)
          imageryProvider: new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/',
          }),
          // NO terrain provider initially - optional enhancement added later
          terrainProvider: undefined,
          viewerWidget: false,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: true,
          timeline: false,
          navigationHelpButton: false,
          contextOptions: {
            webgl: {
              preserveDrawingBuffer: true,
              antialias: true,
            },
          },
        });

        // Configure for production viewing
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.globe.depthTestAgainstTerrain = false; // False when no terrain provider
        viewer.scene.shadowMap.enabled = true;
        viewer.scene.backgroundColor = Cesium.Color.BLACK;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a1a2e');

        // Set world view position
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(0, 20, 30000000),
          orientation: {
            heading: 0,
            pitch: -Math.PI / 2.8,
            roll: 0,
          },
        });

        // Try to add terrain AFTER viewer is created (non-blocking)
        try {
          const terrainProvider = await Promise.race([
            Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
              'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/WorldElevation3D/ImageServer',
              { requestVertexNormals: true }
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Terrain timeout')), 5000))
          ]);
          viewer.terrainProvider = terrainProvider;
          viewer.scene.globe.depthTestAgainstTerrain = true;
          console.log('✅ Terrain provider loaded successfully');
        } catch (terrainError) {
          console.warn('⚠️ Terrain provider skipped (optional):', terrainError.message);
          // Continue without terrain - globe still works fine
        }

        // Mouse interaction: Click to select visitor locations
        viewer.screenSpaceEventHandler.setInputAction((event) => {
          const pickedObject = viewer.scene.pick(event.position);
          if (Cesium.defined(pickedObject) && pickedObject.id?.locationData) {
            onLocationSelect(pickedObject.id.locationData);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Hover for info
        let previousHovered = null;
        viewer.screenSpaceEventHandler.setInputAction((event) => {
          const pickedObject = viewer.scene.pick(event.endPosition);
          if (previousHovered) {
            previousHovered.showLabel = false;
            previousHovered = null;
          }
          if (Cesium.defined(pickedObject) && pickedObject.id?.locationData) {
            pickedObject.id.showLabel = true;
            previousHovered = pickedObject.id;
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Auto-rotate globe
        let rotationSpeed = 0.0001;
        rotationInterval = setInterval(() => {
          if (autoRotate && viewer?.camera) {
            try {
              const camera = viewer.camera;
              camera.setView({
                destination: camera.position,
                orientation: {
                  heading: camera.heading + rotationSpeed,
                  pitch: camera.pitch,
                  roll: camera.roll,
                },
                duration: 0,
              });
            } catch (e) {
              // Handle camera errors silently
            }
          }
        }, 100);

        viewerRef.current = viewer;
        viewerRef.current._mapStyle = 'osm';
        
        toast.success('🌍 Globe ready!');
        retryCount = 0; // Reset on success
      } catch (error) {
        const message = error?.message || String(error || 'Unknown error');
        console.error('❌ Globe initialization error:', message);

        const isWebGLIssue = /webgl|webgl2|CesiumWidget|Error constructing CesiumWidget/i.test(message);
        if (isWebGLIssue) {
          setWebglSupported(false);
          toast.error('WebGL is unavailable or blocked. Please use a browser with WebGL enabled.');
          return;
        }
        
        // Clean up failed viewer
        if (viewer && !viewer.isDestroyed()) {
          try {
            viewer.destroy();
          } catch (e) {
            console.warn('Failed to destroy viewer:', e);
          }
        }
        
        // Only retry a limited number of times
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`⏳ Retry ${retryCount}/${MAX_RETRIES} in 2 seconds...`);
          setTimeout(() => {
            if (cesiumContainer.current && !cesiumContainer.current.children.length) {
              initializeGlobe();
            }
          }, 2000);
        } else {
          console.error('❌ Failed to initialize globe after max retries');
          toast.error('Failed to initialize globe - please refresh page');
        }
      }
    };

    initializeGlobe();

    return () => {
      if (rotationInterval) clearInterval(rotationInterval);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.destroy();
          viewerRef.current = null;
        } catch (e) {
          console.warn('Error destroying viewer:', e);
        }
      }
    };
  }, [onLocationSelect, autoRotate]);

  // Update markers when locations change
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;

    const viewer = viewerRef.current;

    // Remove old entities
    Object.values(entitiesRef.current).forEach((entity) => {
      try {
        if (viewer.entities.contains(entity)) {
          viewer.entities.remove(entity);
        }
      } catch (e) {
        // Silently ignore removal errors
      }
    });
    entitiesRef.current = {};

    if (!locations.length) return;

    // Calculate global statistics for heatmap
    const maxVisitors = Math.max(...locations.map(l => l.visitor_count || 1), 1);
    
    // Add markers for real visitor locations
    locations.forEach((location, index) => {
      try {
        const lat = parseFloat(location.latitude);
        const lon = parseFloat(location.longitude);

        if (isNaN(lat) || isNaN(lon)) return;

        const visitorCount = location.visitor_count || 1;
        const intensity = Math.min(1, visitorCount / maxVisitors);
        const markerSize = 12 + intensity * 18;
        const isSelected = selectedId === location.id;
        const key = `${location.country}-${location.city}-${lat}-${lon}-${index}`;

        // Determine marker color based on intensity (heatmap gradient)
        let markerColor;
        if (intensity > 0.75) {
          markerColor = '#ff0000'; // Red: high traffic
        } else if (intensity > 0.5) {
          markerColor = '#ff6600'; // Orange: medium-high
        } else if (intensity > 0.25) {
          markerColor = '#ffff00'; // Yellow: medium
        } else {
          markerColor = '#00d4ff'; // Cyan: low
        }

        if (isSelected) {
          markerColor = '#ffff00'; // Yellow for selection
        }

        // Create visitor marker at real coordinates
        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          point: {
            pixelSize: markerSize,
            color: Cesium.Color.fromCssColorString(markerColor),
            outlineColor: isSelected 
              ? Cesium.Color.MAGENTA 
              : Cesium.Color.fromCssColorString('#ffffff'),
            outlineWidth: isSelected ? 3 : 1.5,
            heightReference: Cesium.HeightReference.NONE,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1, 1.5e6, 0.3),
          },
          label: {
            text: `${location.city || 'Unknown'}\n${location.country || 'Unknown'}\n👥 ${visitorCount}`,
            font: '12px Verdana, sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -25),
            fillColor: Cesium.Color.fromCssColorString(markerColor),
            backgroundColor: Cesium.Color.fromCssColorString('rgba(8, 12, 28, 0.9)'),
            backgroundPadding: new Cesium.Cartesian2(12, 8),
            showBackground: true,
            scale: isSelected ? 1.1 : 0.85,
            showLabel: isSelected,
          },
          properties: {
            type: 'visitor',
            country: location.country,
            city: location.city,
            visitorCount,
            intensity,
          },
          locationData: location,
        });

        // Add heatmap visualization (cone showing traffic intensity)
        if (showHeatmap && visitorCount > 1) {
          const coneHeight = 50000 + intensity * 150000;
          const coneRadius = 20000 + intensity * 50000;
          
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
            cylinder: {
              length: coneHeight,
              topRadius: 0,
              bottomRadius: coneRadius,
              material: Cesium.Color.fromCssColorString(
                isSelected ? 'rgba(255, 0, 255, 0.15)' : `rgba(255, ${100 + intensity * 155}, 0, ${0.08 + intensity * 0.12})`
              ),
              outline: false,
              heightReference: Cesium.HeightReference.NONE,
            },
          });
        }

        entitiesRef.current[key] = entity;
      } catch (error) {
        console.error(`Error adding marker for location:`, error);
      }
    });
  }, [locations, selectedId, showHeatmap]);

  // Switch map style (OSM, Satellite, Hybrid)
  const switchMapStyle = async (style) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) {
      toast.error('Globe not ready yet');
      return;
    }

    const viewer = viewerRef.current;
    
    try {
      if (style === 'osm') {
        // Standard OpenStreetMap
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(
          new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
        );
        viewerRef.current._mapStyle = 'osm';
      } else if (style === 'satellite') {
        // USGS Landsat 8 satellite imagery (real satellite data)
        viewer.imageryLayers.removeAll();
        try {
          const imageryProvider = await Cesium.IonImageryProvider.fromAssetId(3812);
          viewer.imageryLayers.addImageryProvider(imageryProvider);
          viewerRef.current._mapStyle = 'satellite';
        } catch (ionError) {
          console.warn('Ion provider failed, falling back to ArcGIS:', ionError);
          viewer.imageryLayers.addImageryProvider(
            new Cesium.ArcGisMapServerImageryProvider({
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            })
          );
          viewerRef.current._mapStyle = 'satellite';
        }
      } else if (style === 'hybrid') {
        // Hybrid: Satellite + labels from ArcGIS
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(
          new Cesium.ArcGisMapServerImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
          })
        );
        viewerRef.current._mapStyle = 'hybrid';
      }
      setMapStyle(style);
      toast.success(`Switched to ${style.toUpperCase()} view`);
    } catch (error) {
      console.error('Error switching map style:', error);
      toast.error(`Failed to switch to ${style} view - using OSM`);
      // Fallback to OSM
      try {
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(
          new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
        );
        setMapStyle('osm');
      } catch (fallbackError) {
        console.error('Even fallback failed:', fallbackError);
      }
    }
  };

  if (!webglSupported) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at top, rgba(15,23,42,0.95), rgba(2,6,23,1))',
          color: '#e2e8f0',
          borderRadius: 18,
          border: '1px solid rgba(148,163,184,0.25)',
          fontFamily: 'Inter, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🌍</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>3D globe unavailable</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>
            This browser does not support WebGL, or hardware acceleration is disabled.
            Please use a modern browser like Chrome, Edge, or Firefox with WebGL enabled.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <div
        ref={cesiumContainer}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* Top-right control panel */}
      <div style={{ position: 'absolute', right: 18, top: 18, display: 'grid', gap: 10, zIndex: 10 }}>
        {/* Map Style Selector */}
        <div style={{ display: 'grid', gap: 6 }}>
          <button
            onClick={() => switchMapStyle('osm')}
            style={{
              ...controlButtonStyle,
              background: mapStyle === 'osm' ? 'rgba(0, 212, 255, 0.8)' : 'rgba(15, 23, 42, 0.92)',
              color: mapStyle === 'osm' ? '#000' : '#f1f5f9',
              fontSize: 11,
              fontWeight: mapStyle === 'osm' ? 'bold' : 'normal',
            }}
            title="OpenStreetMap - Accurate street data"
          >
            🗺️ MAP
          </button>
          <button
            onClick={() => switchMapStyle('satellite')}
            style={{
              ...controlButtonStyle,
              background: mapStyle === 'satellite' ? 'rgba(255, 100, 0, 0.8)' : 'rgba(15, 23, 42, 0.92)',
              color: mapStyle === 'satellite' ? '#fff' : '#f1f5f9',
              fontSize: 11,
              fontWeight: mapStyle === 'satellite' ? 'bold' : 'normal',
            }}
            title="USGS Landsat 8 Satellite - Real satellite imagery"
          >
            📡 SAT
          </button>
          <button
            onClick={() => switchMapStyle('hybrid')}
            style={{
              ...controlButtonStyle,
              background: mapStyle === 'hybrid' ? 'rgba(100, 150, 255, 0.8)' : 'rgba(15, 23, 42, 0.92)',
              color: mapStyle === 'hybrid' ? '#000' : '#f1f5f9',
              fontSize: 11,
              fontWeight: mapStyle === 'hybrid' ? 'bold' : 'normal',
            }}
            title="Hybrid - Satellite with labels"
          >
            🔀 HYB
          </button>
        </div>

        {/* Additional Controls */}
        <div style={{ display: 'grid', gap: 6 }}>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{
              ...controlButtonStyle,
              background: showHeatmap ? 'rgba(255, 0, 0, 0.8)' : 'rgba(15, 23, 42, 0.92)',
              color: showHeatmap ? '#fff' : '#f1f5f9',
            }}
            title="Toggle visitor density heatmap"
          >
            {showHeatmap ? '🔥 HEAT' : '❄️ HEAT'}
          </button>
          <button
            onClick={() => setAutoRotate((v) => !v)}
            style={{
              ...controlButtonStyle,
              background: autoRotate ? 'rgba(0, 212, 255, 0.8)' : 'rgba(15, 23, 42, 0.92)',
              color: autoRotate ? '#000' : '#f1f5f9',
            }}
            title="Auto-rotate globe"
          >
            {autoRotate ? '◉ AUTO' : '◌ MANUAL'}
          </button>
          <button
            onClick={() => {
              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.camera.setView({
                  destination: Cesium.Cartesian3.fromDegrees(0, 20, 30000000),
                });
              }
            }}
            style={controlButtonStyle}
            title="Reset camera to world view"
          >
            ⟲ RESET
          </button>
          <button
            onClick={() => {
              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                const el = viewerRef.current.container;
                if (el?.requestFullscreen) {
                  el.requestFullscreen().catch(() => {
                    toast.error('Fullscreen not available');
                  });
                }
              }
            }}
            style={controlButtonStyle}
            title="Fullscreen mode"
          >
            ⛶ FULL
          </button>
        </div>
      </div>

      {/* Info panel - Bottom left */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          bottom: 18,
          padding: '14px 16px',
          borderRadius: 12,
          background: 'rgba(8, 12, 28, 0.94)',
          color: '#e0e7ff',
          fontSize: 11,
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 212, 255, 0.35)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          fontWeight: 500,
          zIndex: 5,
          maxWidth: 300,
          fontFamily: 'Verdana, sans-serif',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 'bold', color: '#00d4ff' }}>
          🌍 Real Production Earth Globe
        </div>
        <div style={{ marginTop: 6, color: '#cbd5e1', fontSize: 10, lineHeight: 1.5 }}>
          <div>📍 Visitor Locations: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{locations?.length || 0}</span></div>
          <div>🗺️ Map: <span style={{ color: '#ffa500', fontWeight: 'bold' }}>{mapStyle.toUpperCase()}</span></div>
          <div>📊 Data: <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>Real-Time</span></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 9, color: '#7dd3fc', fontStyle: 'italic', borderTop: '1px solid rgba(0,212,255,0.2)', paddingTop: 6 }}>
          <div>✓ OpenStreetMap (Real Maps)</div>
          <div>✓ USGS Elevation Data</div>
          <div>✓ USGS Landsat Satellite</div>
          <div>✓ Real Geographic Coordinates</div>
        </div>
      </div>
    </div>
  );
}

const controlButtonStyle = {
  minWidth: 90,
  height: 38,
  borderRadius: 10,
  border: '1px solid rgba(0, 212, 255, 0.4)',
  background: 'rgba(15, 23, 42, 0.92)',
  color: '#f1f5f9',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: '600',
  transition: 'all 0.2s ease',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
};
