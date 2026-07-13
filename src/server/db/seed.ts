import { db } from "./index";
import { kategoriAbsensi, sesiAbsensi } from "./schema";

async function main() {
  console.log("⏳ Memulai proses seeding database...");

  try {
    // ==========================================
    // 1. PREPARE DATA KATEGORI ABSENSI & PELANGGARAN
    // ==========================================
    console.log("Mempersiapkan data Kategori Absensi dan Pelanggaran...");

    // Fungsi bantu untuk membuat object kategori
    const createKategori = (
      namaKategori: string,
      tipe: "RUTIN" | "PELANGGARAN",
      tingkatPelanggaran: "TIDAK_ADA" | "RINGAN" | "SEDANG" | "BERAT",
      poinDefault: number
    ) => ({
      id: crypto.randomUUID(),
      namaKategori,
      tipe,
      tingkatPelanggaran,
      poinDefault,
      isActive: true,
    });

    // Master Data Rutin
    const subuh = createKategori("Shalat Subuh", "RUTIN", "TIDAK_ADA", 25);
    const dhuha = createKategori("Shalat Dhuha", "RUTIN", "TIDAK_ADA", 15);
    const zuhur = createKategori("Shalat Zuhur", "RUTIN", "TIDAK_ADA", 15);
    const ashar = createKategori("Shalat Ashar", "RUTIN", "TIDAK_ADA", 15);
    const maghrib = createKategori("Shalat Maghrib", "RUTIN", "TIDAK_ADA", 15);
    const isya = createKategori("Shalat Isya", "RUTIN", "TIDAK_ADA", 15);

    const makanPagi = createKategori("Makan Pagi", "RUTIN", "TIDAK_ADA", 30);
    const makanSiang = createKategori("Makan Siang", "RUTIN", "TIDAK_ADA", 30);
    const makanMalam = createKategori("Makan Malam", "RUTIN", "TIDAK_ADA", 30);

    const istirahatTepat = createKategori("Istirahat Malam (Tepat Waktu)", "RUTIN", "TIDAK_ADA", 85);

    // Master Data Pelanggaran
    const istirahatTelat = createKategori("Istirahat Malam (Tidak Tepat Waktu)", "PELANGGARAN", "RINGAN", -50);
    const kataKasar = createKategori("Berkata Kasar", "PELANGGARAN", "RINGAN", -10);
    const rusakFasilitas = createKategori("Merusak Fasilitas", "PELANGGARAN", "SEDANG", -30);
    const pacaran = createKategori("Pacaran", "PELANGGARAN", "BERAT", -100);

    const semuaKategori = [
      subuh, dhuha, zuhur, ashar, maghrib, isya,
      makanPagi, makanSiang, makanMalam,
      istirahatTepat, istirahatTelat,
      kataKasar, rusakFasilitas, pacaran
    ];

    await db.insert(kategoriAbsensi).values(semuaKategori).onConflictDoNothing();
    console.log("✅ Data Kategori Absensi berhasil dimasukkan.");

    // ==========================================
    // 2. SEEDING SESI ABSENSI
    // ==========================================
    console.log("Mempersiapkan data Sesi Absensi...");

    // Pelanggaran tidak dimasukkan ke dalam sesi karena bersifat insidental/spontan
    const dataSesi = [
      {
        kategoriId: subuh.id,
        namaSesi: "Sesi Shalat Subuh",
        waktuMulai: "04:00:00",
        waktuSelesai: "05:00:00",
      },
      {
        kategoriId: dhuha.id,
        namaSesi: "Sesi Shalat Dhuha",
        waktuMulai: "07:00:00",
        waktuSelesai: "11:00:00",
      },
      {
        kategoriId: zuhur.id,
        namaSesi: "Sesi Shalat Zuhur",
        waktuMulai: "12:00:00",
        waktuSelesai: "13:00:00",
      },
      {
        kategoriId: ashar.id,
        namaSesi: "Sesi Shalat Ashar",
        waktuMulai: "15:00:00",
        waktuSelesai: "16:00:00",
      },
      {
        kategoriId: maghrib.id,
        namaSesi: "Sesi Shalat Maghrib",
        waktuMulai: "18:00:00",
        waktuSelesai: "19:00:00",
      },
      {
        kategoriId: isya.id,
        namaSesi: "Sesi Shalat Isya",
        waktuMulai: "19:30:00",
        waktuSelesai: "20:30:00",
      },
      {
        kategoriId: makanPagi.id,
        namaSesi: "Sesi Makan Pagi",
        waktuMulai: "05:30:00",
        waktuSelesai: "06:30:00",
      },
      {
        kategoriId: makanSiang.id,
        namaSesi: "Sesi Makan Siang",
        waktuMulai: "13:00:00",
        waktuSelesai: "14:00:00",
      },
      {
        kategoriId: makanMalam.id,
        namaSesi: "Sesi Makan Malam",
        waktuMulai: "19:00:00",
        waktuSelesai: "19:30:00",
      },
      {
        kategoriId: istirahatTepat.id,
        namaSesi: "Sesi Istirahat Malam",
        waktuMulai: "21:00:00",
        waktuSelesai: "04:00:00",
      },
    ];

    await db.insert(sesiAbsensi).values(dataSesi).onConflictDoNothing();
    console.log("✅ Data Sesi Absensi berhasil dimasukkan.");
    console.log("🎉 Seeding selesai!");
    process.exit()
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat seeding:", error);
  }
}

main();
