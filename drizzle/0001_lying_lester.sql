CREATE TABLE "monitoring_perkembangan" (
	"id" text PRIMARY KEY NOT NULL,
	"peserta_didik_id" text NOT NULL,
	"author_id" text,
	"monev_ke" integer NOT NULL,
	"periode_bulan" text NOT NULL,
	"periode_tahun" text NOT NULL,
	"skor_adl" jsonb,
	"skor_sosial" jsonb,
	"skor_mental" jsonb,
	"skor_vokasional" jsonb,
	"total_skor_keseluruhan" integer DEFAULT 0 NOT NULL,
	"masalah_kasus" text,
	"penyebab_kasus" text,
	"akibat_kasus" text,
	"langkah_kasus" text,
	"rencana_tindak_lanjut" text,
	"kegiatan_positif" text,
	"pelanggaran_sanksi" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penanganan_kasus" (
	"id" text PRIMARY KEY NOT NULL,
	"peserta_didik_id" text NOT NULL,
	"author_id" text,
	"tanggal_buka" date NOT NULL,
	"tanggal_tutup" date,
	"masalah_utama" text,
	"penyebab_masalah" text,
	"dampak_biologis" text,
	"dampak_psikologis" text,
	"dampak_sosial" text,
	"dampak_spiritual" text,
	"tujuan_umum" text,
	"tujuan_khusus" jsonb,
	"rencana_kegiatan" jsonb,
	"intervensi" jsonb,
	"metode_monev" jsonb,
	"hasil_monev" jsonb,
	"terminasi_biologis" text,
	"terminasi_psikologis" text,
	"terminasi_sosial" text,
	"terminasi_spiritual" text,
	"kesimpulan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monitoring_perkembangan" ADD CONSTRAINT "monitoring_perkembangan_peserta_didik_id_peserta_didik_id_fk" FOREIGN KEY ("peserta_didik_id") REFERENCES "public"."peserta_didik"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_perkembangan" ADD CONSTRAINT "monitoring_perkembangan_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penanganan_kasus" ADD CONSTRAINT "penanganan_kasus_peserta_didik_id_peserta_didik_id_fk" FOREIGN KEY ("peserta_didik_id") REFERENCES "public"."peserta_didik"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penanganan_kasus" ADD CONSTRAINT "penanganan_kasus_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;