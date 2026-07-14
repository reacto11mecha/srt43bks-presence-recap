// src/server/api/routers/insight.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { and, eq, or, ne, isNotNull, desc, sql } from "drizzle-orm";
import {
  logAbsensi,
  pesertaDidik,
  sesiAbsensi,
  masterPelanggaran,
  kelas,
  kategoriAbsensi,
} from "~/server/db/schema";

// 1. SCHEMA FILTER STANDAR
const insightFilterSchema = z.object({
  tanggal: z.string(), // Format YYYY-MM-DD
  jenjang: z.enum(["SD", "SMP", "SMA"]),
  tingkat: z.string().optional().nullable(),
  kelasId: z.string().optional().nullable(),
});

export const insightRouter = createTRPCRouter({
  // --------------------------------------------------------
  // A. HELPER UI: GET KELAS OPTIONS
  // --------------------------------------------------------
  getFilterOptions: protectedProcedure
    .input(z.object({ jenjang: z.enum(["SD", "SMP", "SMA"]) }))
    .query(async ({ ctx, input }) => {
      const kelasData = await ctx.db.query.kelas.findMany({
        where: eq(kelas.jenjang, input.jenjang),
        orderBy: (k, { asc }) => [asc(k.tingkat), asc(k.namaKelas)],
      });

      // Ambil nilai tingkat yang unik (Contoh: ["7", "8", "9"])
      const tingkatList = Array.from(new Set(kelasData.map((k) => k.tingkat)));

      return { tingkatList, kelasData };
    }),

  // --------------------------------------------------------
  // B. RADAR STATISTIK (Hadir, Telat, Alfa, Sakit/Izin)
  // --------------------------------------------------------
  getStatistikHarian: protectedProcedure
    .input(insightFilterSchema)
    .query(async ({ ctx, input }) => {
      const stats = await ctx.db
        .select({
          // Menggunakan SQL murni untuk menghitung kondisi secara langsung di database
          tepatWaktu:
            sql<number>`SUM(CASE WHEN ${logAbsensi.statusKehadiran} = 'HADIR' AND ${logAbsensi.statusWaktu} = 'TEPAT_WAKTU' THEN 1 ELSE 0 END)`.mapWith(
              Number,
            ),
          telat:
            sql<number>`SUM(CASE WHEN ${logAbsensi.statusKehadiran} = 'HADIR' AND ${logAbsensi.statusWaktu} = 'TELAT' THEN 1 ELSE 0 END)`.mapWith(
              Number,
            ),
          sakitIzin:
            sql<number>`SUM(CASE WHEN ${logAbsensi.statusKehadiran} IN ('SAKIT', 'IZIN') THEN 1 ELSE 0 END)`.mapWith(
              Number,
            ),
          alfa: sql<number>`SUM(CASE WHEN ${logAbsensi.statusKehadiran} IN ('ALFA', 'TIDAK_HADIR') THEN 1 ELSE 0 END)`.mapWith(
            Number,
          ),
          totalAktivitas: sql<number>`COUNT(${logAbsensi.id})`.mapWith(Number),
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
            isNotNull(logAbsensi.sesiId), // Pastikan hanya menghitung kehadiran sesi rutin, bukan pelanggaran manual
          ),
        );

      // Jika database kosong pada hari itu, pastikan mengembalikan nilai 0 agar UI tidak crash (NaN)
      const result = stats[0];
      return {
        tepatWaktu: result?.tepatWaktu || 0,
        telat: result?.telat || 0,
        sakitIzin: result?.sakitIzin || 0,
        alfa: result?.alfa || 0,
        totalAktivitas: result?.totalAktivitas || 0,
      };
    }),

  // --------------------------------------------------------
  // C. SOROTAN KEDISIPLINAN: SESI BERMASALAH (Accordion)
  // --------------------------------------------------------
  getEvaluasiSesi: protectedProcedure
    .input(insightFilterSchema)
    .query(async ({ ctx, input }) => {
      // 1. Ambil semua log yang bermasalah (Telat atau Tidak Hadir)
      const logsBermasalah = await ctx.db
        .select({
          logId: logAbsensi.id,
          statusKehadiran: logAbsensi.statusKehadiran,
          statusWaktu: logAbsensi.statusWaktu,
          poinDidapat: logAbsensi.poinDidapat,
          keterangan: logAbsensi.keterangan,
          peserta: {
            id: pesertaDidik.id,
            namaLengkap: pesertaDidik.namaLengkap,
          },
          kelas: {
            tingkat: kelas.tingkat,
            namaKelas: kelas.namaKelas,
          },
          sesi: {
            id: sesiAbsensi.id,
            namaSesi: sesiAbsensi.namaSesi,
            waktuMulai: sesiAbsensi.waktuMulai,
          },
          kategori: {
            namaKategori: kategoriAbsensi.namaKategori,
          },
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .innerJoin(sesiAbsensi, eq(logAbsensi.sesiId, sesiAbsensi.id))
        .innerJoin(
          kategoriAbsensi,
          eq(sesiAbsensi.kategoriId, kategoriAbsensi.id),
        )
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
            // Hanya ambil yang bermasalah
            or(
              ne(logAbsensi.statusKehadiran, "HADIR"),
              eq(logAbsensi.statusWaktu, "TELAT"),
            ),
          ),
        )
        .orderBy(sesiAbsensi.waktuMulai, pesertaDidik.namaLengkap);

      // 2. Format data ke bentuk Grouping by Sesi agar mudah diloop di Accordion Frontend
      const groupedData = logsBermasalah.reduce(
        (acc, curr) => {
          const sesiKey = curr.sesi.id;
          if (!acc[sesiKey]) {
            acc[sesiKey] = {
              sesiDetail: curr.sesi,
              kategoriDetail: curr.kategori,
              siswaBermasalah: [],
            };
          }
          acc[sesiKey].siswaBermasalah.push({
            logId: curr.logId,
            peserta: curr.peserta,
            kelas: curr.kelas,
            statusKehadiran: curr.statusKehadiran,
            statusWaktu: curr.statusWaktu,
            poinDidapat: curr.poinDidapat,
            keterangan: curr.keterangan,
          });
          return acc;
        },
        {} as Record<string, any>,
      );

      return Object.values(groupedData);
    }),

  // --------------------------------------------------------
  // D. SOROTAN KEDISIPLINAN: PELANGGARAN MANUAL
  // --------------------------------------------------------
  getDaftarPelanggaran: protectedProcedure
    .input(insightFilterSchema)
    .query(async ({ ctx, input }) => {
      const pelanggaranHariIni = await ctx.db
        .select({
          logId: logAbsensi.id,
          waktuScan: logAbsensi.waktuScan,
          poinDidapat: logAbsensi.poinDidapat,
          keterangan: logAbsensi.keterangan,
          peserta: {
            namaLengkap: pesertaDidik.namaLengkap,
          },
          kelas: {
            tingkat: kelas.tingkat,
            namaKelas: kelas.namaKelas,
          },
          pelanggaran: {
            namaPelanggaran: masterPelanggaran.namaPelanggaran,
            tingkat: masterPelanggaran.tingkat,
          },
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .innerJoin(
          masterPelanggaran,
          eq(logAbsensi.pelanggaranId, masterPelanggaran.id),
        )
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
            isNotNull(logAbsensi.pelanggaranId), // Pastikan ini adalah log pelanggaran
          ),
        )
        .orderBy(desc(logAbsensi.waktuScan));

      return pelanggaranHariIni;
    }),

  // --------------------------------------------------------
  // E. WALL OF FAME (Top Poin Positif)
  // --------------------------------------------------------
  getWallOfFame: protectedProcedure
    .input(
      insightFilterSchema.extend({
        limit: z.number().default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Agregasi poin per siswa (SUM) khusus untuk hari ini
      const topStudents = await ctx.db
        .select({
          pesertaId: pesertaDidik.id,
          namaLengkap: pesertaDidik.namaLengkap,
          kelasTingkat: kelas.tingkat,
          kelasNama: kelas.namaKelas,
          totalPoin: sql<number>`sum(${logAbsensi.poinDidapat})`.mapWith(
            Number,
          ),
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
          ),
        )
        .groupBy(pesertaDidik.id, kelas.id)
        .orderBy(desc(sql`sum(${logAbsensi.poinDidapat})`))
        .limit(input.limit);

      return topStudents;
    }),
});
