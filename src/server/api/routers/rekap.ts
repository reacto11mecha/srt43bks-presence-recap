import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { and, eq, gte, lte, isNotNull, arrayContains } from "drizzle-orm";
import {
  logAbsensi,
  pesertaDidik,
  kelas,
  sesiAbsensi,
  kategoriAbsensi,
  masterPelanggaran,
} from "~/server/db/schema";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const rekapRouter = createTRPCRouter({
  generateExcel: protectedProcedure
    .input(
      z.object({
        jenjang: z.enum(["SD", "SMP", "SMA"]),
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. DATA MASTER
      const students = await ctx.db
        .select({
          id: pesertaDidik.id,
          nipd: pesertaDidik.nipd,
          namaLengkap: pesertaDidik.namaLengkap,
          agama: pesertaDidik.agama,
          tingkat: kelas.tingkat,
          namaKelas: kelas.namaKelas,
        })
        .from(pesertaDidik)
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(eq(kelas.jenjang, input.jenjang));

      const sessions = await ctx.db
        .select({
          id: sesiAbsensi.id,
          namaSesi: sesiAbsensi.namaSesi,
          kategori: kategoriAbsensi.namaKategori,
        })
        .from(sesiAbsensi)
        .innerJoin(
          kategoriAbsensi,
          eq(sesiAbsensi.kategoriId, kategoriAbsensi.id),
        )
        .where(arrayContains(sesiAbsensi.targetJenjang, [input.jenjang]));

      const groupedSessions = new Map<string, typeof sessions>();
      for (const ses of sessions) {
        const cat = ses.kategori;
        if (!groupedSessions.has(cat)) groupedSessions.set(cat, []);
        groupedSessions.get(cat)!.push(ses);
      }

      // 2. DATA TRANSAKSI
      const dateFilter = and(
        eq(kelas.jenjang, input.jenjang),
        gte(logAbsensi.tanggal, input.startDate),
        lte(logAbsensi.tanggal, input.endDate),
      );

      const sessionLogs = await ctx.db
        .select({
          tanggal: logAbsensi.tanggal,
          pesertaDidikId: logAbsensi.pesertaDidikId,
          sesiId: logAbsensi.sesiId,
          statusKehadiran: logAbsensi.statusKehadiran,
          statusWaktu: logAbsensi.statusWaktu,
          poinDidapat: logAbsensi.poinDidapat,
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(and(dateFilter, isNotNull(logAbsensi.sesiId)));

      const violationLogs = await ctx.db
        .select({
          tanggal: logAbsensi.tanggal,
          namaLengkap: pesertaDidik.namaLengkap,
          tingkat: kelas.tingkat,
          namaKelas: kelas.namaKelas,
          pelanggaran: masterPelanggaran.namaPelanggaran,
          tingkatPelanggaran: masterPelanggaran.tingkat,
          poinMinus: logAbsensi.poinDidapat,
          keterangan: logAbsensi.keterangan,
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .innerJoin(
          masterPelanggaran,
          eq(logAbsensi.pelanggaranId, masterPelanggaran.id),
        )
        .where(and(dateFilter, isNotNull(logAbsensi.pelanggaranId)));

      // 3. AGREGASI RINGKASAN (per siswa)
      const studentStats = new Map<string, any>();
      for (const s of students) {
        const sessionPoints: Record<string, number> = {};
        sessions.forEach((ses) => (sessionPoints[`sesi_${ses.id}`] = 0));
        studentStats.set(s.id, {
          ...s,
          ...sessionPoints,
          sakit: 0,
          izin: 0,
          alfa: 0,
          totalPoin: 0,
        });
      }
      for (const log of sessionLogs) {
        const stat = studentStats.get(log.pesertaDidikId);
        if (!stat) continue;
        if (log.sesiId) {
          stat[`sesi_${log.sesiId}`] += log.poinDidapat;
          stat.totalPoin += log.poinDidapat;
          if (log.statusKehadiran === "SAKIT") stat.sakit += 1;
          else if (log.statusKehadiran === "IZIN") stat.izin += 1;
          else if (
            log.statusKehadiran === "ALFA" ||
            log.statusKehadiran === "TIDAK_HADIR"
          )
            stat.alfa += 1;
        }
      }
      const ringkasanByTingkat: Record<string, any[]> = {};
      for (const stat of studentStats.values()) {
        if (!ringkasanByTingkat[stat.tingkat])
          ringkasanByTingkat[stat.tingkat] = [];
        ringkasanByTingkat[stat.tingkat].push(stat);
      }

      // 4. AGREGASI DETAIL HARIAN (dipisah Ket & Pn)
      const dailyMatrix = new Map<string, any>();
      for (const log of sessionLogs) {
        const key = `${log.tanggal}_${log.pesertaDidikId}`;
        if (!dailyMatrix.has(key)) {
          const student = students.find((s) => s.id === log.pesertaDidikId);
          if (!student) continue;
          const row: any = {
            tanggal: log.tanggal,
            ...student,
            totalPoinHarian: 0,
          };
          // Inisialisasi ket & pn untuk setiap sesi
          sessions.forEach((ses) => {
            row[`ket_${ses.id}`] = "-";
            row[`pn_${ses.id}`] = 0;
          });
          dailyMatrix.set(key, row);
        }
        const row = dailyMatrix.get(key);
        let statusText = log.statusKehadiran;
        if (log.statusKehadiran === "HADIR" && log.statusWaktu === "TELAT") {
          statusText = "TELAT";
        }
        row[`ket_${log.sesiId}`] = statusText;
        row[`pn_${log.sesiId}`] = log.poinDidapat;
        row.totalPoinHarian += log.poinDidapat;
      }
      const detailByTingkat: Record<string, any[]> = {};
      for (const row of dailyMatrix.values()) {
        if (!detailByTingkat[row.tingkat]) detailByTingkat[row.tingkat] = [];
        detailByTingkat[row.tingkat].push(row);
      }

      // 5. MEMBANGUN WORKBOOK
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistem Presensi Asrama";

      const tingkatKeys = Object.keys(ringkasanByTingkat).sort(
        (a, b) => Number(a) - Number(b),
      );

      // Fungsi untuk header Ringkasan (2 baris) – seperti sebelumnya, tidak berubah
      const applyRingkasanHeader = (
        ws: ExcelJS.Worksheet,
        staticCols: { header: string; key: string; width: number }[],
        extraCols: { header: string; key: string; width: number }[],
        columnsDef: any[],
      ) => {
        ws.columns = columnsDef;
        let colIdx = 1;
        // Statis
        for (const col of staticCols) {
          ws.mergeCells(1, colIdx, 2, colIdx);
          const cell = ws.getCell(1, colIdx);
          cell.value = col.header;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F46E5" },
          };
          ws.getColumn(colIdx).width = col.width;
          colIdx++;
        }
        // Kategori + sesi
        for (const [kategori, sesiList] of groupedSessions.entries()) {
          const startCol = colIdx;
          const endCol = colIdx + sesiList.length - 1;
          ws.mergeCells(1, startCol, 1, endCol);
          const catCell = ws.getCell(1, startCol);
          catCell.value = kategori.toUpperCase();
          catCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          catCell.alignment = { horizontal: "center", vertical: "middle" };
          catCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F46E5" },
          };
          for (const ses of sesiList) {
            const sesCell = ws.getCell(2, colIdx);
            sesCell.value = ses.namaSesi;
            sesCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            sesCell.alignment = { horizontal: "center", vertical: "middle" };
            sesCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF4F46E5" },
            };
            ws.getColumn(colIdx).width = 18;
            colIdx++;
          }
        }
        // Ekstra
        for (const col of extraCols) {
          ws.mergeCells(1, colIdx, 2, colIdx);
          const cell = ws.getCell(1, colIdx);
          cell.value = col.header;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F46E5" },
          };
          ws.getColumn(colIdx).width = col.width;
          colIdx++;
        }
        ws.getRow(1).height = 25;
        ws.getRow(2).height = 20;
      };

      // --- A. Sheet Ringkasan per Tingkat (tetap sama) ---
      for (const t of tingkatKeys) {
        const ws = workbook.addWorksheet(`Ringkasan Tkt ${t}`);
        const staticCols = [
          { header: "No", key: "no", width: 5 },
          { header: "NIPD", key: "nipd", width: 12 },
          { header: "Nama Lengkap", key: "nama", width: 30 },
          { header: "Agama", key: "agama", width: 10 },
          { header: "Kelas", key: "kelas", width: 10 },
        ];
        const extraCols = [
          { header: "Sakit", key: "sakit", width: 8 },
          { header: "Izin", key: "izin", width: 8 },
          { header: "Alfa", key: "alfa", width: 8 },
          { header: "Total Poin", key: "totalPoin", width: 15 },
        ];
        const columnsDef = [
          ...staticCols,
          ...sessions.map((s) => ({
            header: s.namaSesi,
            key: `sesi_${s.id}`,
            width: 18,
          })),
          ...extraCols,
        ];
        applyRingkasanHeader(ws, staticCols, extraCols, columnsDef);

        const rows = ringkasanByTingkat[t].sort(
          (a, b) =>
            a.namaKelas.localeCompare(b.namaKelas) ||
            a.namaLengkap.localeCompare(b.namaLengkap),
        );
        rows.forEach((r, idx) => {
          const rowData: any = {
            no: idx + 1,
            nipd: r.nipd,
            nama: r.namaLengkap,
            agama: r.agama,
            kelas: r.namaKelas,
            sakit: r.sakit,
            izin: r.izin,
            alfa: r.alfa,
            totalPoin: r.totalPoin,
          };
          for (const ses of sessions) {
            rowData[`sesi_${ses.id}`] = r[`sesi_${ses.id}`];
          }
          ws.addRow(rowData);
        });
      }

      // --- B. Sheet Detail Harian (3 baris) ---
      for (const t of tingkatKeys) {
        const ws = workbook.addWorksheet(`Detail Tkt ${t}`);

        const staticCols = [
          { header: "Tanggal", key: "tanggal", width: 15 },
          { header: "NIPD", key: "nipd", width: 12 },
          { header: "Nama Lengkap", key: "nama", width: 30 },
          { header: "Agama", key: "agama", width: 10 },
        ];
        const extraCols = [
          { header: "Poin Harian", key: "totalPoinHarian", width: 15 },
        ];

        // Kolom definisi untuk data (setiap sesi memiliki dua kolom: ket & pn)
        const sesiColumns = Array.from(groupedSessions.values()).flatMap(
          (sesiList) =>
            sesiList.flatMap((s) => [
              { header: "Ket", key: `ket_${s.id}`, width: 6 },
              { header: "Pn", key: `pn_${s.id}`, width: 8 },
            ]),
        );
        const columnsDef = [...staticCols, ...sesiColumns, ...extraCols];

        // Terapkan header 3 baris
        ws.columns = columnsDef;
        let colIdx = 1;

        // Statis (merge 3 baris)
        for (const col of staticCols) {
          ws.mergeCells(1, colIdx, 3, colIdx);
          const cell = ws.getCell(1, colIdx);
          cell.value = col.header;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F46E5" },
          };
          ws.getColumn(colIdx).width = col.width;
          colIdx++;
        }

        // Kategori + sesi (per 2 kolom)
        for (const [kategori, sesiList] of groupedSessions.entries()) {
          const startCol = colIdx;
          const endCol = colIdx + sesiList.length * 2 - 1;
          // Baris 1: kategori (merge semua kolom sesi di bawahnya)
          ws.mergeCells(1, startCol, 1, endCol);
          const catCell = ws.getCell(1, startCol);
          catCell.value = kategori.toUpperCase();
          catCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          catCell.alignment = { horizontal: "center", vertical: "middle" };
          catCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F46E5" },
          };

          for (const ses of sesiList) {
            const sesStartCol = colIdx;
            const sesEndCol = colIdx + 1;
            // Baris 2: nama sesi (merge dua kolom)
            ws.mergeCells(2, sesStartCol, 2, sesEndCol);
            const sesCell = ws.getCell(2, sesStartCol);
            sesCell.value = ses.namaSesi;
            sesCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            sesCell.alignment = { horizontal: "center", vertical: "middle" };
            sesCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF4F46E5" },
            };

            // Baris 3: Ket & Pn
            const ketCell = ws.getCell(3, colIdx);
            ketCell.value = "Ket";
            ketCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            ketCell.alignment = { horizontal: "center" };
            ketCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF4F46E5" },
            };
            ws.getColumn(colIdx).width = 6;
            colIdx++;

            const pnCell = ws.getCell(3, colIdx);
            pnCell.value = "Pn";
            pnCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            pnCell.alignment = { horizontal: "center" };
            pnCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF4F46E5" },
            };
            ws.getColumn(colIdx).width = 8;
            colIdx++;
          }
        }

        // Kolom ekstra (merge 3 baris)
        for (const col of extraCols) {
          ws.mergeCells(1, colIdx, 3, colIdx);
          const cell = ws.getCell(1, colIdx);
          cell.value = col.header;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F46E5" },
          };
          ws.getColumn(colIdx).width = col.width;
          colIdx++;
        }

        ws.getRow(1).height = 25;
        ws.getRow(2).height = 20;
        ws.getRow(3).height = 18;

        // Data
        const rows = detailByTingkat[t] || [];
        rows.sort(
          (a, b) =>
            a.tanggal.localeCompare(b.tanggal) ||
            a.namaKelas?.localeCompare(b.namaKelas) ||
            a.namaLengkap.localeCompare(b.namaLengkap),
        );

        rows.forEach((r) => {
          const rowData: any = {
            tanggal: format(new Date(r.tanggal), "dd MMM yyyy", {
              locale: localeId,
            }),
            nipd: r.nipd,
            nama: r.namaLengkap,
            agama: r.agama,
            totalPoinHarian: r.totalPoinHarian,
          };
          for (const ses of sessions) {
            rowData[`ket_${ses.id}`] = r[`ket_${ses.id}`];
            rowData[`pn_${ses.id}`] = r[`pn_${ses.id}`];
          }
          ws.addRow(rowData);
        });
      }

      // --- C. Sheet Log Pelanggaran (tanpa kolom Pelanggaran) ---
      const wsPelanggaran = workbook.addWorksheet("Log Pelanggaran");
      wsPelanggaran.columns = [
        { header: "Tanggal", key: "tanggal", width: 15 },
        { header: "Nama Siswa", key: "nama", width: 30 },
        { header: "Tingkat", key: "tingkat", width: 10 },
        { header: "Kelas", key: "kelas", width: 10 },
        { header: "Kategori", key: "kategori", width: 15 },
        { header: "Poin Minus", key: "poin", width: 15 },
        { header: "Keterangan", key: "keterangan", width: 40 },
      ];
      wsPelanggaran.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      wsPelanggaran.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDC2626" },
      };
      wsPelanggaran.autoFilter = "A1:G1";

      violationLogs.forEach((v) => {
        wsPelanggaran.addRow({
          tanggal: format(new Date(v.tanggal), "dd MMM yyyy", {
            locale: localeId,
          }),
          nama: v.namaLengkap,
          tingkat: v.tingkat,
          kelas: v.namaKelas,
          kategori: v.tingkatPelanggaran,
          poin: v.poinMinus,
          keterangan: v.keterangan || "-",
        });
      });

      // 6. KONVERSI & RETURN
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer).toString("base64");
    }),
});
