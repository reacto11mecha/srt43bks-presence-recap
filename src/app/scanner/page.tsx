"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "sonner";
import QrScanner from "qr-scanner";

const ScannerClient = dynamic(
  () => import("~/_components/scanner/scanner-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full animate-pulse items-center justify-center bg-white/10 text-white/50">
        Memuat Kamera...
      </div>
    ),
  },
);

export default function ScannerPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const [lastFailedNipd, setLastFailedNipd] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  // State kamera
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("default");

  // Konfigurasi – inisialisasi string kosong agar controlled
  const [kategoriId, setKategoriId] = useState<string>("");
  const [sesiId, setSesiId] = useState<string>("");
  const [isConfigured, setIsConfigured] = useState(false);

  // Scanner state
  const [isPaused, setIsPaused] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [scanData, setScanData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: options, isLoading } = api.aktivitas.getFormOptions.useQuery();

  const scanMutation = api.aktivitas.scanQr.useMutation({
    onSuccess: (data) => {
      setScanStatus("success");
      setScanData(data);
      utils.aktivitas.getRecentLogs.invalidate();
      setTimeout(() => {
        setScanStatus("idle");
        setScanData(null);
        setIsPaused(false);
      }, 1500);
    },
    onError: (error, variables) => {
      setScanStatus("error");
      setErrorMessage(error.message);
      setLastFailedNipd(variables.nipd);
      setCooldownUntil(Date.now() + 5000); // 5 detik
    },
  });

  // Ambil daftar kamera
  useEffect(() => {
    QrScanner.listCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(
            devices.map((d) => ({
              id: d.id,
              label: d.label || `Kamera ${d.id.slice(0, 8)}...`,
            })),
          );
        }
      })
      .catch((err) => {
        console.error("Gagal mendapatkan daftar kamera:", err);
        toast.error("Tidak dapat mengakses kamera");
      });
  }, []);

  const handleScan = (decodedText: string) => {
    // Abaikan scan jika sedang jeda, status bukan idle, atau belum pilih kategori
    if (isPaused || scanStatus !== "idle" || !kategoriId) return;

    // Jika nilai ini baru saja gagal dan masih dalam cooldown, abaikan
    if (decodedText === lastFailedNipd && Date.now() < cooldownUntil) return;

    setIsPaused(true);
    scanMutation.mutate({
      nipd: decodedText,
      kategoriId,
      sesiId: sesiId || null,
    });
  };

  const resetError = () => {
    setScanStatus("idle");
    setErrorMessage("");
    setIsPaused(false);
  };

  const handleBackToSetup = () => {
    setIsConfigured(false);
    setLastFailedNipd(null);
    setCooldownUntil(0);
    setIsPaused(false);
  };

  const selectedKategori = options?.kategori.find((k) => k.id === kategoriId);

  // Konfigurasi kamera
  const cameraConfig =
    selectedCameraId === "default"
      ? { facingMode: "environment" }
      : { deviceId: { exact: selectedCameraId } };

  // Tampilan setup
  if (!isConfigured) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-lg md:max-w-lg">
          <CardContent className="space-y-8 p-4 sm:p-8">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/aktivitas")}
                className="text-muted-foreground hover:text-foreground mb-6 -ml-3"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
              </Button>
              <h1 className="mb-2 text-2xl font-bold">Persiapan Scanner</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Pilih kegiatan dan perangkat kamera sebelum memulai proses
                absensi.
              </p>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground animate-pulse py-8 text-center">
                Memuat opsi kegiatan...
              </p>
            ) : (
              <div className="space-y-6">
                {/* Pilih Kamera */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-blue-600">
                    Pilih Kamera
                  </label>
                  <Select
                    value={selectedCameraId}
                    onValueChange={setSelectedCameraId}
                  >
                    <SelectTrigger className="h-12 w-full border-blue-200 bg-blue-50/30">
                      <SelectValue placeholder="Pilih Kamera yang Digunakan">
                        {selectedCameraId === "default"
                          ? "Kamera Utama (Default)"
                          : cameras.find((c) => c.id === selectedCameraId)
                              ?.label || "Kamera Default"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="py-3">
                        Kamera Utama (Default)
                      </SelectItem>
                      {cameras.map((cam) => (
                        <SelectItem
                          key={cam.id}
                          value={cam.id}
                          className="py-3"
                        >
                          {cam.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pilih Kategori */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold">
                    Kategori Kegiatan
                  </label>
                  <Select
                    value={kategoriId}
                    onValueChange={(val) => {
                      setKategoriId(val);
                      setSesiId("");
                    }}
                  >
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Pilih Kategori">
                        {selectedKategori
                          ? `${selectedKategori.namaKategori} ${selectedKategori.tipe === "PELANGGARAN" ? "(Pelanggaran)" : ""}`
                          : "Pilih Kategori"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {options?.kategori.map((k) => (
                        <SelectItem key={k.id} value={k.id} className="py-3">
                          {k.namaKategori}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pilih Sesi (jika rutin) */}
                {selectedKategori?.tipe === "RUTIN" && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold">Sesi Jadwal</label>
                    <Select value={sesiId} onValueChange={setSesiId}>
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue placeholder="Pilih Sesi">
                          {(() => {
                            const s = selectedKategori?.sesi.find(
                              (s) => s.id === sesiId,
                            );
                            return s
                              ? `${s.namaSesi} (${s.waktuMulai} - ${s.waktuSelesai})`
                              : "Pilih Sesi";
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectedKategori.sesi.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="py-3">
                            {s.namaSesi} ({s.waktuMulai} - {s.waktuSelesai})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  className="mt-4 h-12 w-full text-base font-semibold"
                  disabled={
                    !kategoriId ||
                    (selectedKategori?.tipe === "RUTIN" && !sesiId)
                  }
                  onClick={() => setIsConfigured(true)}
                >
                  Mulai Scanner
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tampilan scanner
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-black p-4 pb-12">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-2 pt-4 text-white">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/20 hover:text-white"
          onClick={handleBackToSetup}
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Ganti Sesi
        </Button>
        <div className="text-right">
          <p className="text-lg font-bold">{selectedKategori?.namaKategori}</p>
          <p className="text-sm text-green-400 opacity-80">Siap memindai...</p>
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-white/20 bg-gray-900 shadow-[0_0_40px_rgba(255,255,255,0.1)] sm:max-w-sm md:max-w-md lg:max-w-lg">
        <ScannerClient
          cameraConfig={cameraConfig}
          onScan={handleScan}
          isPaused={isPaused}
          onError={(msg) => {
            console.error("Kamera Error:", msg);
            toast.error("Akses Kamera Gagal", { description: msg });
          }}
        />

        {/* Overlay Sukses */}
        {scanStatus === "success" && (
          <div className="animate-in zoom-in-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-green-600/95 text-white duration-200">
            <CheckCircle2 className="mb-6 h-24 w-24 text-green-100" />
            <p className="px-4 text-center text-2xl leading-tight font-bold">
              {scanData?.namaLengkap}
            </p>
            <p className="mt-2 text-lg opacity-90">
              {scanData?.kelas?.tingkat} {scanData?.kelas?.namaKelas}
            </p>
          </div>
        )}

        {/* Overlay Error */}
        {scanStatus === "error" && (
          <div className="animate-in zoom-in-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-600/95 px-6 text-center text-white duration-200">
            <AlertCircle className="mb-4 h-20 w-20 text-red-200" />
            <p className="mb-3 text-xl font-bold">Gagal Memindai</p>
            <p className="mb-8 rounded-lg bg-black/20 p-3 text-base leading-relaxed opacity-90">
              {errorMessage}
            </p>
            <Button
              variant="secondary"
              onClick={resetError}
              className="h-12 w-full font-bold text-red-700 hover:bg-white"
            >
              Tutup & Lanjut Scan
            </Button>
          </div>
        )}

        {scanMutation.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-white backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
              <p className="font-medium tracking-wide">Memverifikasi NIPD...</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 px-6 text-center text-white">
        <p className="text-base font-medium tracking-wide opacity-90">
          Arahkan NIPD (QR Code) ke dalam bingkai kamera.
        </p>
        <p className="mt-2 text-sm opacity-50">
          Sistem akan otomatis menyimpan saat terbaca.
        </p>
      </div>
    </div>
  );
}
