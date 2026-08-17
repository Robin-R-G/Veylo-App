'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { VeyloLogo } from '@/components/ui/VeyloLogo';

export default function QRScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [cameraSupported, setCameraSupported] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false);
    }
  }, []);

  const startCamera = async () => {
    setError('');
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        detectQR();
      }
    } catch {
      setError('Camera access denied. Use manual entry below.');
      setScanning(false);
    }
  };

  const detectQR = () => {
    const video = videoRef.current;
    if (!video) return;

    // Try native BarcodeDetector first
    const BD = (window as any).BarcodeDetector;
    if (BD) {
      const detector = new BD({ formats: ['qr_code'] });
      const detect = async () => {
        if (!video.videoWidth) {
          requestAnimationFrame(detect);
          return;
        }
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            handleScanResult(raw);
            return;
          }
        } catch {}
        requestAnimationFrame(detect);
      };
      detect();
    } else {
      // Fallback: try to extract QR from canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const detectFrame = () => {
        if (!video.videoWidth) {
          requestAnimationFrame(detectFrame);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        // Without a QR library, we can't decode from canvas
        // Show manual entry instead
        setError('QR detection requires Chrome/Edge. Enter the vehicle number manually.');
        setScanning(false);
      };
      detectFrame();
    }
  };

  const handleScanResult = (raw: string) => {
    stopCamera();
    // Extract vehicle secure ID from QR content
    // QR may contain a full URL like https://app.veylo.app/v/pub_kl16p78_x99a
    // or just the token like pub_kl16p78_x99a
    let vehicleId = raw;
    try {
      const url = new URL(raw);
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0] === 'v') {
        vehicleId = pathParts[1];
      }
    } catch {
      // Not a URL, use as-is
    }
    router.push(`/v/${vehicleId}`);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    // Navigate to the vehicle entry page with the entered token
    const token = manualInput.trim().replace(/\s+/g, '_');
    router.push(`/v/${token}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-on-primary p-3 shadow-md mx-auto">
            <VeyloLogo className="w-full h-full" color="white" />
          </div>
          <h1 className="text-xl font-bold text-on-background">Scan Vehicle QR</h1>
          <p className="text-xs text-on-surface-variant">
            Point your camera at the QR code on the vehicle to start a ride.
          </p>
        </div>

        {/* Camera View */}
        <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
          {scanning ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover bg-black"
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ) : (
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-surface-container-high flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl text-primary">qr_code_scanner</span>
              </div>
              {error && (
                <p className="text-xs text-error font-semibold">{error}</p>
              )}
              {cameraSupported && (
                <button
                  onClick={startCamera}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  Open Camera
                </button>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-outline-variant w-full" />
          <span className="bg-background px-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">OR ENTER MANUALLY</span>
          <div className="border-t border-outline-variant w-full" />
        </div>

        {/* Manual Entry */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="e.g. pub_kl16p78_x99a"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant text-on-surface font-mono font-bold text-sm tracking-wider focus:outline-none focus:border-primary uppercase placeholder:normal-case placeholder:font-normal placeholder:text-sm text-center"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="w-full py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-xs uppercase tracking-wider border border-outline-variant hover:bg-surface-container transition-all disabled:opacity-50"
          >
            Go to Vehicle →
          </button>
        </form>

        {/* Back to home */}
        <Link
          href="/"
          className="flex items-center justify-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
