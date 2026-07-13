import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { desc, eq, asc } from "drizzle-orm";
import { logAbsensi, pesertaDidik, kategoriAbsensi } from "~/server/db/schema";

export const aktivitasRouter = createTRPCRouter({
  getRecentLogs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.logAbsensi.findMany({
      with: {
        pesertaDidik: {
          with: {
            kelas: true,
          },
        },
        kategori: true,
        sesi: true,
        waliAsuh: true,
      },
      orderBy: [desc(logAbsensi.waktuScan)],
      limit: 100,
    });
  }),

  getFormOptions: protectedProcedure.query(async ({ ctx }) => {
    const peserta = await ctx.db.query.pesertaDidik.findMany({
      where: eq(pesertaDidik.status, "AKTIF"),
      orderBy: [asc(pesertaDidik.namaLengkap)],
      with: { kelas: true },
    });

    const kategori = await ctx.db.query.kategoriAbsensi.findMany({
      where: eq(kategoriAbsensi.isActive, true),
      with: { sesi: true },
      orderBy: [asc(kategoriAbsensi.namaKategori)],
    });

    return { peserta, kategori };
  }),

  // Endpoint untuk membuat log absensi manual
  createLogManual: protectedProcedure
    .input(
      z.object({
        pesertaDidikId: z.string(),
        kategoriId: z.string(),
        sesiId: z.string().optional().nullable(),
        status: z.enum(["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT", "ALFA"]),
        keterangan: z.string().optional(),
        tanggal: z.string(), // Format YYYY-MM-DD
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Ambil bobot poin default dari master kategori
      const kategori = await ctx.db.query.kategoriAbsensi.findFirst({
        where: eq(kategoriAbsensi.id, input.kategoriId),
      });

      if (!kategori) throw new Error("Kategori tidak ditemukan");

      await ctx.db.insert(logAbsensi).values({
        pesertaDidikId: input.pesertaDidikId,
        kategoriId: input.kategoriId,
        sesiId: input.sesiId || null,
        // Gunakan ID user (wali asuh) yang sedang login dari session Better Auth
        waliAsuhId: ctx.session.user.id,
        tanggal: input.tanggal,
        poinDidapat: kategori.poinDefault, // Set poin dari master
        status: input.status,
        keterangan: input.keterangan,
        waktuScan: new Date(), // Waktu aktual saat form di-submit
      });
    }),

  scanQr: protectedProcedure
    .input(
      z.object({
        nipd: z.string(),
        kategoriId: z.string(),
        sesiId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Cari siswa berdasarkan NIPD dari QR Code
      const peserta = await ctx.db.query.pesertaDidik.findFirst({
        where: eq(pesertaDidik.nipd, input.nipd),
        with: { kelas: true },
      });

      if (!peserta) {
        throw new Error(`NIPD ${input.nipd} tidak terdaftar di sistem.`);
      }

      // 2. Cari data kategori untuk mengambil poin default
      const kategori = await ctx.db.query.kategoriAbsensi.findFirst({
        where: eq(kategoriAbsensi.id, input.kategoriId),
      });

      if (!kategori) throw new Error("Kategori tidak valid.");

      try {
        // 3. Masukkan ke database
        await ctx.db.insert(logAbsensi).values({
          pesertaDidikId: peserta.id,
          kategoriId: kategori.id,
          sesiId: input.sesiId || null,
          waliAsuhId: ctx.session.user.id,
          tanggal: new Date().toISOString().split("T")[0],
          poinDidapat: kategori.poinDefault,
          status: "HADIR",
          waktuScan: new Date(),
        });
      } catch (error: any) {
        // Tangkap error jika melanggar unique constraint (PostgreSQL error code 23505)
        if (error.code === "23505") {
          throw new Error(
            `Siswa atas nama ${peserta.namaLengkap} sudah diabsen pada sesi ini.`,
          );
        }
        throw new Error("Terjadi kesalahan pada server saat menyimpan absen.");
      }

      // Kembalikan data siswa agar bisa ditampilkan di layar sukses Scanner
      return peserta;
    }),
});
