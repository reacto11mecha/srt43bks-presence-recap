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
  const scannerInstanceIdRef = useRef(0);
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

    const currentInstanceId = ++scannerInstanceIdRef.current; // ID unik untuk instance ini

    const scanner = new QrScanner(
      video,
      (result) => {
        if (!isPausedRef.current) {
          onScanRef.current(result.data);
        }
      },
      {
        maxScansPerSecond: 10,
        highlightCodeOutline: true,
      },
    );
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        // Ekstrak kamera yang diinginkan
        let targetCamera: string | undefined;

        if (typeof cameraConfig === "string") {
          targetCamera = cameraConfig;
        } else if (cameraConfig && typeof cameraConfig === "object") {
          if (
            "deviceId" in cameraConfig &&
            cameraConfig.deviceId &&
            typeof cameraConfig.deviceId === "object" &&
            "exact" in cameraConfig.deviceId
          ) {
            const exactVal = cameraConfig.deviceId.exact;
            if (typeof exactVal === "string") {
              targetCamera = exactVal;
            } else if (Array.isArray(exactVal) && exactVal.length > 0) {
              targetCamera = exactVal[0];
            }
          } else if (
            "deviceId" in cameraConfig &&
            typeof cameraConfig.deviceId === "string"
          ) {
            targetCamera = cameraConfig.deviceId;
          } else if ("facingMode" in cameraConfig && cameraConfig.facingMode) {
            targetCamera = cameraConfig.facingMode as string;
          }
        }

        // Atur kamera jika ada
        if (targetCamera) {
          await scanner.setCamera(targetCamera);
        }

        // Cek apakah instance ini masih yang terbaru
        if (currentInstanceId !== scannerInstanceIdRef.current) {
          // Scanner sudah diganti (destroyed), hentikan
          return;
        }

        // Mulai scan
        await scanner.start();
      } catch (err) {
        // Jika instance sudah tidak relevan, abaikan error (misal karena destroyed)
        if (currentInstanceId !== scannerInstanceIdRef.current) {
          return;
        }
        if (onError) {
          onError(`Gagal mengakses kamera: ${String(err)}`);
        }
      }
    };

    startScanner();

    return () => {
      // Stop dan destroy scanner
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
          <div className="absolute top-0 left-0 h-8 w-8 rounded-tl-lg border-t-4 border-l-4 border-yellow-400" />
          <div className="absolute top-0 right-0 h-8 w-8 rounded-tr-lg border-t-4 border-r-4 border-yellow-400" />
          <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-yellow-400" />
          <div className="absolute right-0 bottom-0 h-8 w-8 rounded-br-lg border-r-4 border-b-4 border-yellow-400" />
          <div className="absolute inset-0 rounded-lg border-2 border-yellow-400/30" />
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
