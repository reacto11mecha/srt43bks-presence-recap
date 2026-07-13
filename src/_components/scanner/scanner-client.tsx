"use client";

import { useEffect, useRef } from "react";
import QrScanner from "qr-scanner";

interface ScannerClientProps {
  cameraConfig: string | MediaTrackConstraints;
  onScan: (decodedText: string) => void;
  isPaused: boolean;
  onError?: (errorMessage: string) => void;
}

export default function ScannerClient({
  cameraConfig,
  onScan,
  isPaused,
  onError,
}: ScannerClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isPausedRef = useRef(isPaused);
  const onScanRef = useRef(onScan);

  // Sinkronkan refs
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Inisialisasi scanner
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => {
        if (!isPausedRef.current) {
          onScanRef.current(result.data);
        }
      },
      {
        maxScansPerSecond: 10,
        highlightCodeOutline: true, // menampilkan outline hijau di sekitar QR (opsional)
        // Anda bisa tambahkan opsi lain sesuai kebutuhan
      },
    );
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        let cameraOptions: {
          deviceId?: string;
          facingMode?: "environment" | "user";
        } = {};

        if (typeof cameraConfig === "string") {
          cameraOptions.deviceId = cameraConfig;
        } else if (cameraConfig && typeof cameraConfig === "object") {
          if ("deviceId" in cameraConfig && cameraConfig.deviceId) {
            if (typeof cameraConfig.deviceId === "string") {
              cameraOptions.deviceId = cameraConfig.deviceId;
            } else if (
              typeof cameraConfig.deviceId === "object" &&
              "exact" in cameraConfig.deviceId
            ) {
              cameraOptions.deviceId = cameraConfig.deviceId.exact;
            }
          } else if ("facingMode" in cameraConfig) {
            cameraOptions.facingMode = cameraConfig.facingMode as
              "environment" | "user";
          }
        }

        await scanner.start(cameraOptions);
      } catch (err) {
        if (onError) {
          onError(`Gagal mengakses kamera: ${String(err)}`);
        }
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      // Bersihkan stream video
      if (video.srcObject) {
        (video.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, [cameraConfig, onError]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Elemen video untuk kamera */}
      <video ref={videoRef} className="h-full w-full object-cover" />

      {/* Overlay kotak penanda kuning */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-64 w-64 md:h-72 md:w-72">
          {/* Keempat sudut kotak */}
          <div className="absolute top-0 left-0 h-8 w-8 rounded-tl-lg border-t-4 border-l-4 border-yellow-400" />
          <div className="absolute top-0 right-0 h-8 w-8 rounded-tr-lg border-t-4 border-r-4 border-yellow-400" />
          <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-yellow-400" />
          <div className="absolute right-0 bottom-0 h-8 w-8 rounded-br-lg border-r-4 border-b-4 border-yellow-400" />

          {/* Garis pembatas tipis (opsional) */}
          <div className="absolute inset-0 rounded-lg border-2 border-yellow-400/30" />

          {/* Efek garis pemindai (animasi) */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div
              className="animate-scan absolute right-0 left-0 h-0.5 bg-yellow-400 shadow-[0_0_8px_#facc15]"
              style={{ top: "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
