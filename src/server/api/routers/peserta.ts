import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, desc, asc } from "drizzle-orm";
import { pesertaDidik, kelas, user } from "~/server/db/schema";
import { z } from "zod";

export const pesertaRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.pesertaDidik.findMany({
      with: {
        kelas: true,
      },
      orderBy: [desc(pesertaDidik.createdAt)],
    });
  }),

  getWaliAsuh: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.user.findMany({
      columns: { id: true, name: true },
      orderBy: [asc(user.name)],
    });
  }),

  createPeserta: protectedProcedure
    .input(
      z.object({
        // Wajib
        nipd: z.string().min(1, "NIPD wajib diisi"),
        namaLengkap: z.string().min(1, "Nama lengkap wajib diisi"),
        kelasId: z.string().min(1, "Kelas wajib dipilih"),

        waliAsuhId: z.string().optional(),

        // Opsional (Identitas & Demografi)
        nisn: z.string().optional(),
        jenisKelamin: z.string().optional(),
        tempatLahir: z.string().optional(),
        tanggalLahir: z.string().optional(),
        agama: z.string().optional(),
        anakKe: z.string().optional(),
        sekolahAsal: z.string().optional(),

        // Opsional (Dokumen & Alamat)
        noAkte: z.string().optional(),
        nik: z.string().optional(),
        noKk: z.string().optional(),
        alamat: z.string().optional(),
        rt: z.string().optional(),
        rw: z.string().optional(),
        kelurahan: z.string().optional(),
        kecamatan: z.string().optional(),
        kodePos: z.string().optional(),
        noTelp: z.string().optional(),

        // Opsional (Data Ibu)
        namaIbu: z.string().optional(),
        tempatLahirIbu: z.string().optional(),
        tanggalLahirIbu: z.string().optional(),
        pendidikanIbu: z.string().optional(),
        pekerjaanIbu: z.string().optional(),
        penghasilanIbu: z.string().optional(),
        nikIbu: z.string().optional(),

        // Opsional (Data Ayah)
        namaAyah: z.string().optional(),
        tempatLahirAyah: z.string().optional(),
        tanggalLahirAyah: z.string().optional(),
        pendidikanAyah: z.string().optional(),
        pekerjaanAyah: z.string().optional(),
        penghasilanAyah: z.string().optional(),
        nikAyah: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validasi NIPD unik
      const existing = await ctx.db.query.pesertaDidik.findFirst({
        where: (pd, { eq }) => eq(pd.nipd, input.nipd),
      });

      if (existing) throw new Error("NIPD ini sudah terdaftar di sistem.");

      // Helper agar string kosong "" tidak error saat dimasukkan ke kolom Date PostgreSQL
      const parseDate = (val?: string) =>
        val && val.trim() !== "" ? val : undefined;

      // Helper untuk menangani opsi "Kosong" dari Dropdown
      const parseWali = (val?: string) =>
        val && val !== "unassigned" ? val : undefined;

      return await ctx.db.insert(pesertaDidik).values({
        nipd: input.nipd,
        namaLengkap: input.namaLengkap,
        kelasId: input.kelasId,
        waliAsuhId: parseWali(input.waliAsuhId),
        nisn: input.nisn,
        jenisKelamin: input.jenisKelamin,
        tempatLahir: input.tempatLahir,
        tanggalLahir: parseDate(input.tanggalLahir),
        agama: input.agama,
        anakKe: input.anakKe,
        sekolahAsal: input.sekolahAsal,
        noAkte: input.noAkte,
        nik: input.nik,
        noKk: input.noKk,
        alamat: input.alamat,
        rt: input.rt,
        rw: input.rw,
        kelurahan: input.kelurahan,
        kecamatan: input.kecamatan,
        kodePos: input.kodePos,
        noTelp: input.noTelp,
        namaIbu: input.namaIbu,
        tempatLahirIbu: input.tempatLahirIbu,
        tanggalLahirIbu: parseDate(input.tanggalLahirIbu),
        pendidikanIbu: input.pendidikanIbu,
        pekerjaanIbu: input.pekerjaanIbu,
        penghasilanIbu: input.penghasilanIbu,
        nikIbu: input.nikIbu,
        namaAyah: input.namaAyah,
        tempatLahirAyah: input.tempatLahirAyah,
        tanggalLahirAyah: parseDate(input.tanggalLahirAyah),
        pendidikanAyah: input.pendidikanAyah,
        pekerjaanAyah: input.pekerjaanAyah,
        penghasilanAyah: input.penghasilanAyah,
        nikAyah: input.nikAyah,
      });
    }),

  getAllKelas: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.kelas.findMany({
      orderBy: [asc(kelas.jenjang), asc(kelas.tingkat), asc(kelas.namaKelas)],
    });
  }),

  createKelas: protectedProcedure
    .input(
      z.object({
        jenjang: z.enum(["SD", "SMP", "SMA"]),
        tingkat: z.string().min(1, "Tingkat wajib diisi"),
        namaKelas: z.string().min(1, "Nama kelas wajib diisi"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(kelas).values({
        jenjang: input.jenjang,
        tingkat: input.tingkat,
        namaKelas: input.namaKelas,
      });
    }),

  updateKelas: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        jenjang: z.enum(["SD", "SMP", "SMA"]),
        tingkat: z.string().min(1),
        namaKelas: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(kelas)
        .set({
          jenjang: input.jenjang,
          tingkat: input.tingkat,
          namaKelas: input.namaKelas,
        })
        .where(eq(kelas.id, input.id));
    }),

  deleteKelas: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.delete(kelas).where(eq(kelas.id, input.id));
    }),
});
