ALTER TABLE "monitoring_perkembangan" ADD COLUMN "total_skor_adl" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "monitoring_perkembangan" ADD COLUMN "total_skor_sosial" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "monitoring_perkembangan" ADD COLUMN "total_skor_mental" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "monitoring_perkembangan" ADD COLUMN "total_skor_vokasional" integer DEFAULT 0 NOT NULL;