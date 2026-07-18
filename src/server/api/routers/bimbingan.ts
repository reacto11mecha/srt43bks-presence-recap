// src/server/api/routers/bimbingan.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { monitoringPerkembangan, penangananKasus } from "~/server/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export const bimbinganRouter = createTRPCRouter({
  // ===============================================
  // MANAJEMEN MONITORING PERKEMBANGAN PESERTA DIDIK
  // ===============================================

  // ==========================================
  // 1. ENDPOINT UNTUK HALAMAN DAFTAR MONITORING (TABEL & INSIGHT)
  // ==========================================
  getOverviewMonitoring: protectedProcedure
    .input(
      z.object({
        jenjang: z.enum(["SD", "SMP", "SMA"]).optional(),
        tingkat: z.string().optional(),
        kelasId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Ambil daftar siswa beserta relasi kelas dan 1 rapor terakhir
      const daftarSiswa = await ctx.db.query.pesertaDidik.findMany({
        where: (peserta, { and, eq }) => {
          const conditions = [eq(peserta.status, "AKTIF")];
          if (input.kelasId)
            conditions.push(eq(peserta.kelasId, input.kelasId));
          return and(...conditions);
        },
        with: {
          kelas: true,
          riwayatPerkembangan: {
            orderBy: (rapor, { desc }) => [desc(rapor.createdAt)],
            limit: 1, // Hanya ambil data paling mutakhir untuk tabel & insight
          },
        },
      });

      // Filter tambahan secara in-memory untuk jenjang & tingkat jika kelasId tidak diset
      const filteredSiswa = daftarSiswa.filter((s) => {
        let match = true;
        if (input.jenjang && s.kelas.jenjang !== input.jenjang) match = false;
        if (input.tingkat && s.kelas.tingkat !== input.tingkat) match = false;
        return match;
      });

      const currentMonth = (new Date().getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const currentYear = new Date().getFullYear().toString();

      const insightKritis: Array<{
        pesertaDidikId: string;
        nama: string;
        peringatan: string[];
      }> = [];

      const tabelData = filteredSiswa.map((siswa) => {
        const raporTerakhir = siswa.riwayatPerkembangan[0];

        let statusEvaluasi = "Belum Dievaluasi";
        if (
          raporTerakhir &&
          raporTerakhir.periodeBulan === currentMonth &&
          raporTerakhir.periodeTahun === currentYear
        ) {
          statusEvaluasi = "Sudah Dievaluasi";
        }

        // --- SISTEM INSIGHT (Berdasarkan PDF Form Monitoring) ---
        // Jika rapor terakhir masuk kategori Kurang / Sangat Kurang
        if (raporTerakhir) {
          const peringatan: string[] = [];

          // Ambang batas kategori "Kurang" berdasarkan form PDF
          if (raporTerakhir.totalSkorAdl <= 18)
            peringatan.push(`ADL (${raporTerakhir.totalSkorAdl})`);
          if (raporTerakhir.totalSkorSosial <= 24)
            peringatan.push(`Sosial (${raporTerakhir.totalSkorSosial})`);
          if (raporTerakhir.totalSkorMental <= 36)
            peringatan.push(`Mental (${raporTerakhir.totalSkorMental})`);
          if (raporTerakhir.totalSkorVokasional <= 28)
            peringatan.push(
              `Vokasional (${raporTerakhir.totalSkorVokasional})`,
            );

          if (peringatan.length > 0) {
            insightKritis.push({
              pesertaDidikId: siswa.id,
              nama: siswa.namaLengkap,
              peringatan,
            });
          }
        }

        return {
          id: siswa.id,
          namaLengkap: siswa.namaLengkap,
          kelas: `${siswa.kelas.tingkat} ${siswa.kelas.namaKelas}`,
          statusEvaluasi,
          skorTerakhir: raporTerakhir?.totalSkorKeseluruhan ?? null,
          periodeTerakhir: raporTerakhir
            ? `${raporTerakhir.periodeBulan}/${raporTerakhir.periodeTahun}`
            : "-",
        };
      });

      return {
        tabelData,
        insightKritis,
      };
    }),

  // ==========================================
  // 2. ENDPOINT UNTUK HALAMAN DETAIL/CHART PESERTA
  // ==========================================
  getDetailRiwayat: protectedProcedure
    .input(z.object({ pesertaDidikId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Ambil seluruh riwayat urut dari Monev pertama ke terakhir (ASC) agar cocok untuk Chart
      const riwayat = await ctx.db.query.monitoringPerkembangan.findMany({
        where: eq(monitoringPerkembangan.pesertaDidikId, input.pesertaDidikId),
        orderBy: [asc(monitoringPerkembangan.monevKe)],
      });

      // Data siap di-mapping oleh komponen frontend Recharts/Chart.js
      return riwayat;
    }),

  // ==========================================
  // 3. ENDPOINT CREATE (Otomatis hitung total)
  // ==========================================
  createPerkembangan: protectedProcedure
    .input(
      z.object({
        pesertaDidikId: z.string(),
        monevKe: z.number().min(1),
        periodeBulan: z.string().length(2),
        periodeTahun: z.string().length(4),

        skorAdl: z.record(z.string(), z.number()).optional(),
        skorSosial: z.record(z.string(), z.number()).optional(),
        skorMental: z.record(z.string(), z.number()).optional(),
        skorVokasional: z.record(z.string(), z.number()).optional(),

        masalahKasus: z.string().optional(),
        penyebabKasus: z.string().optional(),
        akibatKasus: z.string().optional(),
        langkahKasus: z.string().optional(),
        rencanaTindakLanjut: z.string().optional(),
        kegiatanPositif: z.string().optional(),
        pelanggaranSanksi: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.session.user.id;
      const sumRecord = (rec?: Record<string, number>) =>
        rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0;

      const totalSkorAdl = sumRecord(input.skorAdl);
      const totalSkorSosial = sumRecord(input.skorSosial);
      const totalSkorMental = sumRecord(input.skorMental);
      const totalSkorVokasional = sumRecord(input.skorVokasional);
      const totalSkorKeseluruhan =
        totalSkorAdl + totalSkorSosial + totalSkorMental + totalSkorVokasional;

      const [newRapor] = await ctx.db
        .insert(monitoringPerkembangan)
        .values({
          ...input,
          authorId,
          totalSkorAdl,
          totalSkorSosial,
          totalSkorMental,
          totalSkorVokasional,
          totalSkorKeseluruhan,
        })
        .returning();

      return newRapor;
    }),

  // ==========================================
  // 4. ENDPOINT UPDATE (Kalkulasi ulang total jika ada perubahan)
  // ==========================================
  updatePerkembangan: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // Semua record opsional, kirim hanya yang diubah
        skorAdl: z.record(z.string(), z.number()).optional(),
        skorSosial: z.record(z.string(), z.number()).optional(),
        skorMental: z.record(z.string(), z.number()).optional(),
        skorVokasional: z.record(z.string(), z.number()).optional(),

        masalahKasus: z.string().optional(),
        penyebabKasus: z.string().optional(),
        akibatKasus: z.string().optional(),
        langkahKasus: z.string().optional(),
        rencanaTindakLanjut: z.string().optional(),
        kegiatanPositif: z.string().optional(),
        pelanggaranSanksi: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const existingData = await ctx.db.query.monitoringPerkembangan.findFirst({
        where: eq(monitoringPerkembangan.id, id),
      });

      if (!existingData) throw new Error("Rapor perkembangan tidak ditemukan");

      // Gabungkan data lama dan baru
      const mergedAdl =
        updateData.skorAdl ??
        (existingData.skorAdl as Record<string, number> | undefined);
      const mergedSosial =
        updateData.skorSosial ??
        (existingData.skorSosial as Record<string, number> | undefined);
      const mergedMental =
        updateData.skorMental ??
        (existingData.skorMental as Record<string, number> | undefined);
      const mergedVokasional =
        updateData.skorVokasional ??
        (existingData.skorVokasional as Record<string, number> | undefined);

      const sumRecord = (rec?: Record<string, number>) =>
        rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0;

      const totalSkorAdl = sumRecord(mergedAdl);
      const totalSkorSosial = sumRecord(mergedSosial);
      const totalSkorMental = sumRecord(mergedMental);
      const totalSkorVokasional = sumRecord(mergedVokasional);
      const totalSkorKeseluruhan =
        totalSkorAdl + totalSkorSosial + totalSkorMental + totalSkorVokasional;

      const [updatedRapor] = await ctx.db
        .update(monitoringPerkembangan)
        .set({
          ...updateData,
          totalSkorAdl,
          totalSkorSosial,
          totalSkorMental,
          totalSkorVokasional,
          totalSkorKeseluruhan,
        })
        .where(eq(monitoringPerkembangan.id, id))
        .returning();

      return updatedRapor;
    }),

  // ==========================================
  // MANAJEMEN PENANGANAN KASUS
  // ==========================================

  getDaftarKasus: protectedProcedure
    .input(z.object({ pesertaDidikId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.penangananKasus.findMany({
        where: input.pesertaDidikId
          ? eq(penangananKasus.pesertaDidikId, input.pesertaDidikId)
          : undefined,
        with: {
          pesertaDidik: {
            columns: { namaLengkap: true, kelasId: true },
            with: {
              waliAsuh: { columns: { name: true } }, // Tarik nama Wali Asuh untuk UI/PDF
              kelas: { columns: { tingkat: true, namaKelas: true } },
            },
          },
        },
        orderBy: [desc(penangananKasus.createdAt)],
      });
    }),

  createKasus: protectedProcedure
    .input(
      z.object({
        pesertaDidikId: z.string().min(1, "Siswa harus dipilih"),
        tanggalBuka: z.string(), // Biarkan sebagai string YYYY-MM-DD
        masalahUtama: z.string().optional(),
        penyebabMasalah: z.string().optional(),
        dampakBiologis: z.string().optional(),
        dampakPsikologis: z.string().optional(),
        dampakSosial: z.string().optional(),
        dampakSpiritual: z.string().optional(),
        tujuanUmum: z.string().optional(),
        tujuanKhusus: z.array(z.string()).optional(),
        rencanaKegiatan: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.session.user.id;

      // 2. Insert data langsung karena input.tanggalBuka sudah string
      const [newKasus] = await ctx.db
        .insert(penangananKasus)
        .values({
          ...input,
          authorId, // Akuntabilitas user yang login
          tanggalTutup: null, // Default null untuk string
          intervensi: [],
          hasilMonev: [],
          metodeMonev: [],
        })
        .returning();

      return newKasus;
    }),

  updateKasus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tanggalTutup: z.string().optional().nullable(),
        masalahUtama: z.string().optional(),
        penyebabMasalah: z.string().optional(),
        dampakBiologis: z.string().optional(),
        dampakPsikologis: z.string().optional(),
        dampakSosial: z.string().optional(),
        dampakSpiritual: z.string().optional(),
        tujuanUmum: z.string().optional(),
        tujuanKhusus: z.array(z.string()).optional(),
        rencanaKegiatan: z.array(z.string()).optional(),
        terminasiBiologis: z.string().optional(),
        terminasiPsikologis: z.string().optional(),
        terminasiSosial: z.string().optional(),
        terminasiSpiritual: z.string().optional(),
        kesimpulan: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updatedKasus] = await ctx.db
        .update(penangananKasus)
        .set(updateData)
        .where(eq(penangananKasus.id, id))
        .returning();

      return updatedKasus;
    }),

  // ==========================================
  // ARRAY UPDATES (Intervensi & Monev)
  // ==========================================
  addIntervensiKasus: protectedProcedure
    .input(
      z.object({
        kasusId: z.string(),
        aktivitasKe: z.number(),
        deskripsi: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kasus = await ctx.db.query.penangananKasus.findFirst({
        where: eq(penangananKasus.id, input.kasusId),
      });
      if (!kasus) throw new Error("Kasus tidak ditemukan");

      const existingIntervensi = kasus.intervensi || [];

      // Jika user mengedit aktivitas yang sudah ada, filter dulu
      const filtered = existingIntervensi.filter(
        (i) => i.aktivitasKe !== input.aktivitasKe,
      );
      filtered.push({
        aktivitasKe: input.aktivitasKe,
        deskripsi: input.deskripsi,
      });
      filtered.sort((a, b) => a.aktivitasKe - b.aktivitasKe);

      return await ctx.db
        .update(penangananKasus)
        .set({ intervensi: filtered })
        .where(eq(penangananKasus.id, input.kasusId));
    }),

  addHasilMonev: protectedProcedure
    .input(
      z.object({
        kasusId: z.string(),
        mingguKe: z.number().min(1).max(5),
        deskripsi: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kasus = await ctx.db.query.penangananKasus.findFirst({
        where: eq(penangananKasus.id, input.kasusId),
      });
      if (!kasus) throw new Error("Kasus tidak ditemukan");

      const existingMonev = kasus.hasilMonev || [];

      // Filter minggu yang sama untuk mode edit
      const filtered = existingMonev.filter(
        (m) => m.mingguKe !== input.mingguKe,
      );
      filtered.push({ mingguKe: input.mingguKe, deskripsi: input.deskripsi });
      filtered.sort((a, b) => a.mingguKe - b.mingguKe);

      return await ctx.db
        .update(penangananKasus)
        .set({ hasilMonev: filtered })
        .where(eq(penangananKasus.id, input.kasusId));
    }),
});
