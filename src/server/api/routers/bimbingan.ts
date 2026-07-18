// src/server/api/routers/bimbingan.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { penangananKasus, monitoringPerkembangan } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const bimbinganRouter = createTRPCRouter({
  // 0. Endpoint khusus untuk merender Tab Monitoring Perkembangan di Dashboard
  getDashboardMonitoringData: protectedProcedure.query(async ({ ctx }) => {
    // 1. Ambil semua peserta didik aktif beserta 2 rapor terakhir mereka
    const daftarSiswa = await ctx.db.query.pesertaDidik.findMany({
      with: {
        riwayatPerkembangan: {
          // <-- Menggunakan nama relasi yang benar
          orderBy: (rapor, { desc }) => [desc(rapor.createdAt)],
          limit: 2, // Kita hanya butuh rapor bulan ini (index 0) dan bulan lalu (index 1)
        },
      },
    });

    const batasToleransiPenurunan = 3; // Peringatan muncul jika turun 3 poin atau lebih
    const bulanSekarang = new Date().getMonth();
    const tahunSekarang = new Date().getFullYear();

    const perhatianKhusus = [];
    const riwayatGlobal = [];
    let jumlahDievaluasiBulanIni = 0;

    // Helper function untuk menjumlahkan isi jsonb per kategori
    const sumKategori = (kategoriData?: Record<string, number> | unknown) => {
      if (!kategoriData || typeof kategoriData !== "object") return 0;
      return Object.values(kategoriData as Record<string, number>).reduce(
        (a, b) => a + b,
        0,
      );
    };

    // 2. Lakukan iterasi untuk memproses data
    for (const siswa of daftarSiswa) {
      // Panggil array dari riwayatPerkembangan
      const raporTerbaru = siswa.riwayatPerkembangan[0];
      const raporSebelumnya = siswa.riwayatPerkembangan[1];

      let sudahDievaluasiBulanIni = false;

      if (raporTerbaru) {
        const tanggalRapor = new Date(raporTerbaru.createdAt);
        if (
          tanggalRapor.getMonth() === bulanSekarang &&
          tanggalRapor.getFullYear() === tahunSekarang
        ) {
          sudahDievaluasiBulanIni = true;
          jumlahDievaluasiBulanIni++;
        }
      }

      // --- LOGIKA PERHATIAN KHUSUS (EARLY WARNING SYSTEM) ---
      if (raporTerbaru && raporSebelumnya) {
        const detailPenurunan = [];

        const listKategori = [
          { nama: "ADL", key: "skorAdl" },
          { nama: "Sosial", key: "skorSosial" },
          { nama: "Mental", key: "skorMental" },
          { nama: "Vokasional", key: "skorVokasional" },
        ] as const;

        for (const kat of listKategori) {
          const skorBaru = sumKategori(raporTerbaru[kat.key]);
          const skorLama = sumKategori(raporSebelumnya[kat.key]);
          const selisih = skorLama - skorBaru;

          if (selisih >= batasToleransiPenurunan) {
            detailPenurunan.push(`Aspek ${kat.nama} (-${selisih} poin)`);
          }
        }

        if (detailPenurunan.length > 0) {
          perhatianKhusus.push({
            pesertaDidikId: siswa.id,
            nama: siswa.namaLengkap,
            pesanPeringatan: `Penurunan performa: ${detailPenurunan.join(", ")}`,
            raporId: raporTerbaru.id,
          });
        }
      }

      // --- LOGIKA TABEL RIWAYAT GLOBAL ---
      riwayatGlobal.push({
        pesertaDidikId: siswa.id,
        nama: siswa.namaLengkap,
        statusEvaluasi: sudahDievaluasiBulanIni
          ? "Sudah Dievaluasi"
          : "Belum Dievaluasi",
        totalSkorTerakhir: raporTerbaru
          ? raporTerbaru.totalSkorKeseluruhan
          : null,
        tanggalTerakhir: raporTerbaru ? raporTerbaru.createdAt : null,
      });
    }

    const totalSiswa = daftarSiswa.length;
    const persentaseEvaluasi =
      totalSiswa > 0
        ? Math.round((jumlahDievaluasiBulanIni / totalSiswa) * 100)
        : 0;

    return {
      statistik: {
        totalSiswa,
        dievaluasi: jumlahDievaluasiBulanIni,
        belumDievaluasi: totalSiswa - jumlahDievaluasiBulanIni,
        persentase: persentaseEvaluasi,
      },
      perhatianKhusus,
      riwayatGlobal,
    };
  }),

  // ==========================================
  // 1. ENDPOINT PENANGANAN KASUS
  // ==========================================
  createKasus: protectedProcedure
    .input(
      z.object({
        pesertaDidikId: z.string().min(1, "Siswa harus dipilih"),
        tanggalBuka: z.string(), // Format YYYY-MM-DD dari frontend
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
      // authorId diambil otomatis dari session, bukan dari input frontend
      const authorId = ctx.session.user.id;

      const [newKasus] = await ctx.db
        .insert(penangananKasus)
        .values({
          ...input,
          authorId,
          tanggalTutup: null, // Default null saat baru dibuka
          intervensi: [], // Array kosong saat inisialisasi
          hasilMonev: [], // Array kosong saat inisialisasi
          metodeMonev: [],
        })
        .returning();

      return newKasus;
    }),

  getKasusByPesertaDidik: protectedProcedure
    .input(z.object({ pesertaDidikId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.penangananKasus.findMany({
        where: eq(penangananKasus.pesertaDidikId, input.pesertaDidikId),
        orderBy: [desc(penangananKasus.createdAt)],
        with: {
          author: true, // Menarik data pegawai pembuat laporan
        },
      });
    }),

  updateKasus: protectedProcedure
    .input(
      z.object({
        id: z.string(), // ID kasus yang mau di-edit
        tanggalTutup: z.string().optional().nullable(), // Jika kasus dinyatakan selesai
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
      // Pisahkan id dari sisa input agar tidak ikut ter-update sebagai field
      const { id, ...updateData } = input;

      const [updatedKasus] = await ctx.db
        .update(penangananKasus)
        .set(updateData)
        .where(eq(penangananKasus.id, id))
        .returning();

      if (!updatedKasus) {
        throw new Error("Gagal mengupdate: Kasus tidak ditemukan");
      }

      return updatedKasus;
    }),

  // Endpoint untuk Update/Tambah Intervensi Mingguan
  addIntervensiKasus: protectedProcedure
    .input(
      z.object({
        kasusId: z.string(),
        aktivitasKe: z.number(),
        deskripsi: z.string().min(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Ambil data lama
      const kasus = await ctx.db.query.penangananKasus.findFirst({
        where: eq(penangananKasus.id, input.kasusId),
      });
      if (!kasus) throw new Error("Kasus tidak ditemukan");

      const existingIntervensi = kasus.intervensi || [];

      // Update JSONB array
      return await ctx.db
        .update(penangananKasus)
        .set({
          intervensi: [
            ...existingIntervensi,
            { aktivitasKe: input.aktivitasKe, deskripsi: input.deskripsi },
          ],
        })
        .where(eq(penangananKasus.id, input.kasusId));
    }),

  // ==========================================
  // 2. ENDPOINT MONITORING PERKEMBANGAN
  // ==========================================

  createPerkembangan: protectedProcedure
    .input(
      z.object({
        pesertaDidikId: z.string(),
        monevKe: z.number().min(1),
        periodeBulan: z.string().length(2), // "01" - "12"
        periodeTahun: z.string().length(4), // "2026"

        // Zod record untuk memvalidasi JSON object string -> number
        skorAdl: z.record(z.string(), z.number().min(1).max(5)).optional(),
        skorSosial: z.record(z.string(), z.number().min(1).max(5)).optional(),
        skorMental: z.record(z.string(), z.number().min(1).max(5)).optional(),
        skorVokasional: z
          .record(z.string(), z.number().min(1).max(5))
          .optional(),

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

      // Kalkulasi total skor secara otomatis di backend
      const sumRecord = (rec?: Record<string, number>) =>
        rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0;

      const totalSkorKeseluruhan =
        sumRecord(input.skorAdl) +
        sumRecord(input.skorSosial) +
        sumRecord(input.skorMental) +
        sumRecord(input.skorVokasional);

      const [newRapor] = await ctx.db
        .insert(monitoringPerkembangan)
        .values({
          ...input,
          authorId,
          totalSkorKeseluruhan,
        })
        .returning();

      return newRapor;
    }),

  getPerkembanganByPesertaDidik: protectedProcedure
    .input(z.object({ pesertaDidikId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.monitoringPerkembangan.findMany({
        where: eq(monitoringPerkembangan.pesertaDidikId, input.pesertaDidikId),
        orderBy: [desc(monitoringPerkembangan.createdAt)],
        with: {
          author: true,
        },
      });
    }),

  updatePerkembangan: protectedProcedure
    .input(
      z.object({
        id: z.string(), // ID rapor yang mau di-edit

        // Semua field dibuat optional karena user mungkin hanya edit 1 bagian
        skorAdl: z.record(z.string(), z.number().min(1).max(5)).optional(),
        skorSosial: z.record(z.string(), z.number().min(1).max(5)).optional(),
        skorMental: z.record(z.string(), z.number().min(1).max(5)).optional(),
        skorVokasional: z
          .record(z.string(), z.number().min(1).max(5))
          .optional(),

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

      // Cek data lama terlebih dahulu jika ada perubahan skor untuk mengkalkulasi total baru
      const existingData = await ctx.db.query.monitoringPerkembangan.findFirst({
        where: eq(monitoringPerkembangan.id, id),
      });

      if (!existingData) {
        throw new Error("Gagal mengupdate: Rapor perkembangan tidak ditemukan");
      }

      // Gabungkan skor lama dengan skor baru (jika di-update)
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

      // Helper untuk menjumlahkan skor
      const sumRecord = (rec?: Record<string, number>) =>
        rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0;

      // Hitung total skor keseluruhan yang baru
      const newTotalSkor =
        sumRecord(mergedAdl) +
        sumRecord(mergedSosial) +
        sumRecord(mergedMental) +
        sumRecord(mergedVokasional);

      // Lakukan update ke database
      const [updatedRapor] = await ctx.db
        .update(monitoringPerkembangan)
        .set({
          ...updateData,
          totalSkorKeseluruhan: newTotalSkor,
        })
        .where(eq(monitoringPerkembangan.id, id))
        .returning();

      return updatedRapor;
    }),
});
