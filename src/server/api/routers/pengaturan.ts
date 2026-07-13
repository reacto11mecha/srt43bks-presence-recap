import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { user, kategoriAbsensi, sesiAbsensi } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const pengaturanRouter = createTRPCRouter({
  // --- MANAJEMEN AKUN ---
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.user.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
  }),

  approveUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ accountApproved: true })
        .where(eq(user.id, input.id));
      return { success: true };
    }),

  // --- MANAJEMEN KATEGORI & SESI (NESTED) ---
  getKategoriWithSesi: protectedProcedure.query(async ({ ctx }) => {
    // Mengambil kategori sekaligus sesi yang terelasi di dalamnya
    return ctx.db.query.kategoriAbsensi.findMany({
      with: {
        sesi: true,
      },
      orderBy: (kategori, { asc }) => [asc(kategori.namaKategori)],
    });
  }),

  // ==========================================
  // CRUD KATEGORI ABSENSI
  // ==========================================
  createKategori: protectedProcedure
    .input(
      z.object({
        namaKategori: z.string().min(1, "Nama Kategori wajib diisi"),
        tipe: z.enum(["RUTIN", "PELANGGARAN"]),
        tingkatPelanggaran: z.enum(["TIDAK_ADA", "RINGAN", "SEDANG", "BERAT"]),
        poinDefault: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(kategoriAbsensi).values({
        namaKategori: input.namaKategori,
        tipe: input.tipe,
        tingkatPelanggaran: input.tingkatPelanggaran,
        poinDefault: input.poinDefault,
      });
    }),

  updateKategori: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        namaKategori: z.string().min(1),
        tipe: z.enum(["RUTIN", "PELANGGARAN"]),
        tingkatPelanggaran: z.enum(["TIDAK_ADA", "RINGAN", "SEDANG", "BERAT"]),
        poinDefault: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(kategoriAbsensi)
        .set({
          namaKategori: input.namaKategori,
          tipe: input.tipe,
          tingkatPelanggaran: input.tingkatPelanggaran,
          poinDefault: input.poinDefault,
        })
        .where(eq(kategoriAbsensi.id, input.id));
    }),

  deleteKategori: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(kategoriAbsensi)
        .where(eq(kategoriAbsensi.id, input.id));
    }),

  // ==========================================
  // CRUD SESI ABSENSI
  // ==========================================
  createSesi: protectedProcedure
    .input(
      z.object({
        kategoriId: z.string(),
        namaSesi: z.string().min(1, "Nama Sesi wajib diisi"),
        waktuMulai: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu salah"),
        waktuSelesai: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu salah"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(sesiAbsensi).values({
        kategoriId: input.kategoriId,
        namaSesi: input.namaSesi,
        waktuMulai: input.waktuMulai,
        waktuSelesai: input.waktuSelesai,
      });
    }),

  updateSesi: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        namaSesi: z.string().min(1),
        waktuMulai: z.string(),
        waktuSelesai: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(sesiAbsensi)
        .set({
          namaSesi: input.namaSesi,
          waktuMulai: input.waktuMulai,
          waktuSelesai: input.waktuSelesai,
        })
        .where(eq(sesiAbsensi.id, input.id));
    }),

  deleteSesi: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(sesiAbsensi).where(eq(sesiAbsensi.id, input.id));
    }),
});
