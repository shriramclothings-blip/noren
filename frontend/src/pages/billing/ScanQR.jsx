import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Start scanning loop
      scanFrame();
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Use a QR code library like jsQR if available
      // For now, we'll provide manual input fallback
      try {
        // Try to decode QR code from imageData
        // const code = jsQR(imageData.data, imageData.width, imageData.height);
        // if (code) {
        //   handleQRCodeDetected(code.data);
        //   return;
        // }
      } catch (err) {
        console.error('QR decode error:', err);
      }
    }

    // Continue scanning
    if (scanning) {
      requestAnimationFrame(scanFrame);
    }
  };

  const handleQRCodeDetected = (data) => {
    stopScanning();
    toast.success('QR Code detected!');

    // Extract token from URL
    try {
      const url = new URL(data);
      const pathParts = url.pathname.split('/');
      const token = pathParts[pathParts.length - 1];

      if (token && token.length > 20) {
        navigate(`/my-billing/invoice/${token}`);
      } else {
        setError('Invalid QR code. Please try again.');
      }
    } catch (err) {
      setError('Could not read QR code. Please try again or enter invoice number manually.');
    }
  };

  const handleManualEntry = () => {
    stopScanning();
    navigate('/my-billing');
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1a1a18',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(250, 249, 247, 0.1)'
      }}>
        <h1 style={{ 
          fontSize: 20, 
          fontWeight: 600, 
          color: '#faf9f7',
          letterSpacing: '0.02em'
        }}>
          Scan QR Code
        </h1>
        <button
          onClick={() => navigate('/my-billing')}
          style={{
            background: 'none',
            border: 'none',
            color: '#faf9f7',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(250, 249, 247, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <X size={24} />
        </button>
      </div>

      {/* Scanner Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {!scanning ? (
          // Initial state
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center'
          }}>
            <div style={{
              width: 120,
              height: 120,
              background: 'rgba(201, 169, 110, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
              border: '2px solid rgba(201, 169, 110, 0.3)'
            }}>
              <Camera size={56} style={{ color: '#c9a96e' }} />
            </div>

            <h2 style={{ 
              fontSize: 24, 
              fontWeight: 600, 
              color: '#faf9f7',
              marginBottom: 12
            }}>
              Scan Your Invoice QR Code
            </h2>

            <p style={{ 
              fontSize: 15, 
              color: 'rgba(250, 249, 247, 0.7)',
              maxWidth: 400,
              marginBottom: 32,
              lineHeight: 1.6
            }}>
              Position the QR code from your receipt within the frame to view your digital invoice instantly
            </p>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                maxWidth: 400
              }}>
                <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#ef4444' }}>{error}</span>
              </div>
            )}

            <button
              onClick={startScanning}
              style={{
                padding: '16px 32px',
                background: '#c9a96e',
                color: '#1a1a18',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                letterSpacing: '0.02em'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#b8976a'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#c9a96e'}
            >
              <Camera size={20} />
              Start Camera
            </button>

            <button
              onClick={handleManualEntry}
              style={{
                marginTop: 16,
                padding: '12px 24px',
                background: 'transparent',
                color: 'rgba(250, 249, 247, 0.7)',
                border: '1px solid rgba(250, 249, 247, 0.2)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(250, 249, 247, 0.05)';
                e.currentTarget.style.color = '#faf9f7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(250, 249, 247, 0.7)';
              }}
            >
              Enter Invoice Number Instead
            </button>
          </div>
        ) : (
          // Camera view
          <div style={{ flex: 1, position: 'relative', background: '#000' }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              playsInline
              muted
            />

            {/* Scanner overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '280px',
              height: '280px',
              border: '3px solid #c9a96e',
              borderRadius: 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              animation: 'pulse 2s infinite'
            }}>
              {/* Corner decorations */}
              <div style={{
                position: 'absolute',
                top: -3,
                left: -3,
                width: 40,
                height: 40,
                borderTop: '5px solid #c9a96e',
                borderLeft: '5px solid #c9a96e',
                borderRadius: '16px 0 0 0'
              }} />
              <div style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 40,
                height: 40,
                borderTop: '5px solid #c9a96e',
                borderRight: '5px solid #c9a96e',
                borderRadius: '0 16px 0 0'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -3,
                left: -3,
                width: 40,
                height: 40,
                borderBottom: '5px solid #c9a96e',
                borderLeft: '5px solid #c9a96e',
                borderRadius: '0 0 0 16px'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 40,
                height: 40,
                borderBottom: '5px solid #c9a96e',
                borderRight: '5px solid #c9a96e',
                borderRadius: '0 0 16px 0'
              }} />
            </div>

            {/* Instructions */}
            <div style={{
              position: 'absolute',
              bottom: 40,
              left: 24,
              right: 24,
              textAlign: 'center'
            }}>
              <div style={{
                background: 'rgba(26, 26, 24, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '16px 24px',
                borderRadius: 12,
                border: '1px solid rgba(250, 249, 247, 0.1)'
              }}>
                <p style={{ 
                  fontSize: 14, 
                  color: '#faf9f7',
                  marginBottom: 16,
                  fontWeight: 500
                }}>
                  Position the QR code within the frame
                </p>

                <button
                  onClick={stopScanning}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                >
                  Stop Scanner
                </button>
              </div>
            </div>

            {/* Hidden canvas for QR processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
