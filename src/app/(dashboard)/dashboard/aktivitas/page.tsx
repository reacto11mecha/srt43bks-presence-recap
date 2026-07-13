// src/app/(dashboard)/dashboard/aktivitas/page.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";

// Import Komponen Dialog Manual
import { ManualLogFormDialog } from "~/_components/aktivitas/manual-log-form-dialog";

export default function AktivitasAbsensiPage() {
  const { data: logs, isLoading } = api.aktivitas.getRecentLogs.useQuery();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false); // State kontrol modal

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HADIR":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Hadir
          </Badge>
        );
      case "SAKIT":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Sakit
          </Badge>
        );
      case "IZIN":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Izin
          </Badge>
        );
      case "ALFA":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Alfa
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Aktivitas Absensi
          </h1>
          <p className="text-muted-foreground">
            Log real-time absensi harian dan pencatatan pelanggaran peserta
            didik.
          </p>
        </div>

        {/* Tombol pemicu Modal Manual Input */}
        <Button onClick={() => setIsManualModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Input Manual
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Terbaru</CardTitle>
          <CardDescription>
            Menampilkan 100 aktivitas terakhir yang tercatat di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ... [KODE TABLE ANDA SAMA SEPERTI SEBELUMNYA DI SINI] ... */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Nama Peserta</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Kategori / Sesi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Poin</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Pencatat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Memuat data aktivitas...
                    </TableCell>
                  </TableRow>
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Belum ada aktivitas yang tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(log.waktuScan), "dd MMM yyyy, HH:mm", {
                          locale: id,
                        })}
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold">
                          {log.pesertaDidik.namaLengkap}
                        </span>
                        <br />
                        <span className="text-muted-foreground text-xs">
                          NISN: {log.pesertaDidik.nisn}
                        </span>
                      </TableCell>

                      <TableCell>
                        {log.pesertaDidik.kelas.tingkat}{" "}
                        {log.pesertaDidik.kelas.namaKelas}
                        <br />
                        <span className="text-muted-foreground text-xs">
                          {log.pesertaDidik.kelas.jenjang}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium">
                          {log.kategori.namaKategori}
                        </span>
                        {log.kategori.tipe === "PELANGGARAN" && (
                          <Badge
                            variant="destructive"
                            className="ml-2 h-4 px-1 py-0 text-[10px]"
                          >
                            Pelanggaran
                          </Badge>
                        )}
                        <br />
                        <span className="text-muted-foreground text-xs">
                          {log.sesi ? log.sesi.namaSesi : "-"}
                        </span>
                      </TableCell>

                      <TableCell>
                        {log.kategori.tipe === "RUTIN"
                          ? getStatusBadge(log.status)
                          : "-"}
                      </TableCell>

                      <TableCell
                        className={`text-right font-bold ${log.poinDidapat > 0 ? "text-green-600" : log.poinDidapat < 0 ? "text-red-600" : ""}`}
                      >
                        {log.poinDidapat > 0
                          ? `+${log.poinDidapat}`
                          : log.poinDidapat}
                      </TableCell>

                      <TableCell
                        className="max-w-[200px] truncate"
                        title={log.keterangan || "-"}
                      >
                        {log.keterangan || "-"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {log.waliAsuh?.name || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Render Komponen Dialog Modal */}
      <ManualLogFormDialog
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
}
