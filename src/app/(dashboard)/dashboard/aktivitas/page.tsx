// src/app/(dashboard)/dashboard/aktivitas/page.tsx
"use client";

import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ManualLogFormDialog } from "~/_components/aktivitas/manual-log-form-dialog";

export default function AktivitasPage() {
  const { data: logs, isLoading } = api.aktivitas.getRecentLogs.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Aktivitas Absensi & Kedisiplinan
          </h1>
          <p className="text-muted-foreground">
            Riwayat log absensi, kegiatan, dan pelanggaran terbaru.
          </p>
        </div>
        <ManualLogFormDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Terbaru (100 Teratas)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat data...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu & Tanggal</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Aktivitas / Pelanggaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Poin</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Pencatat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">
                          {format(new Date(log.waktuScan), "HH:mm:ss")}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {format(new Date(log.tanggal), "dd MMM yyyy", {
                            locale: id,
                          })}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">
                          {log.pesertaDidik.namaLengkap}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {log.pesertaDidik.kelas.jenjang}{" "}
                          {log.pesertaDidik.kelas.tingkat}{" "}
                          {log.pesertaDidik.kelas.namaKelas}
                        </div>
                      </TableCell>

                      <TableCell>
                        {log.sesi ? (
                          <div>
                            <span className="font-medium">
                              {log.sesi.kategori.namaKategori}
                            </span>
                            <span className="text-muted-foreground mx-1">
                              •
                            </span>
                            <span>{log.sesi.namaSesi}</span>
                          </div>
                        ) : log.pelanggaran ? (
                          <div className="flex items-center gap-2 font-medium text-red-600">
                            {log.pelanggaran.namaPelanggaran}
                            <Badge
                              variant="destructive"
                              className="h-4 px-1 py-0 text-[10px]"
                            >
                              {log.pelanggaran.tingkat}
                            </Badge>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {/* Badge Kehadiran */}
                          <Badge
                            variant={
                              log.statusKehadiran === "HADIR"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {log.statusKehadiran}
                          </Badge>

                          {/* Badge Status Waktu (Hanya jika Hadir & Sesi Rutin) */}
                          {log.statusWaktu === "TELAT" && log.sesi && (
                            <Badge variant="destructive">TELAT</Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono">
                        <div
                          className={`font-bold ${log.poinDidapat > 0 ? "text-green-600" : log.poinDidapat < 0 ? "text-red-600" : "text-gray-500"}`}
                        >
                          {log.poinDidapat > 0
                            ? `+${log.poinDidapat}`
                            : log.poinDidapat}
                        </div>
                        {log.isPoinManual && (
                          <div className="text-[10px] text-orange-500 italic">
                            Diedit Manual
                          </div>
                        )}
                      </TableCell>

                      <TableCell
                        className="max-w-[150px] truncate"
                        title={log.keterangan || "-"}
                      >
                        {log.keterangan || (
                          <span className="text-muted-foreground italic">
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm">
                        {log.waliAsuh?.name || "Sistem"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {logs?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground py-8 text-center"
                      >
                        Belum ada aktivitas yang dicatat.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
