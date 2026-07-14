import { db } from "./index";
import {
  kategoriAbsensi,
  sesiAbsensi,
  masterPelanggaran,
  kelas,
  pesertaDidik,
  logAbsensi,
} from "./schema";
import { faker } from "@faker-js/faker/locale/id_ID";
import * as readline from "readline";
import crypto from "crypto";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log("⏳ Memulai proses seeding database dengan skema baru...");

  try {
    // ==========================================
    // 0. TANYAKAN PILIHAN SEBELUM SEEDING
    // ==========================================
    const pilihan = await askQuestion(
      "Pilih jenis seeding:\n" +
        "  [1] Hanya data utama (Kategori, Pelanggaran, Sesi)\n" +
        "  [2] Lengkap dengan data dummy (Kelas, Peserta, Log Absensi)\n" +
        "Masukkan angka (1 atau 2): ",
    );

    const isFull =
      pilihan === "2" || pilihan === "full" || pilihan === "lengkap";

    // ==========================================
    // 1. SEEDING KATEGORI UTAMA
    // ==========================================
    console.log("Mempersiapkan data Kategori Absensi...");

    const katSolatId = crypto.randomUUID();
    const katMakanId = crypto.randomUUID();
    const katKegiatanId = crypto.randomUUID();
    const katIbadahNonIslamId = crypto.randomUUID();

    const dataKategori = [
      { id: katSolatId, namaKategori: "Absen Solat", isActive: true },
      { id: katMakanId, namaKategori: "Absen Makan", isActive: true },
      { id: katKegiatanId, namaKategori: "Absen Kegiatan", isActive: true },
      {
        id: katIbadahNonIslamId,
        namaKategori: "Ibadah Non-Islam",
        isActive: true,
      },
    ];

    await db.insert(kategoriAbsensi).values(dataKategori).onConflictDoNothing();
    console.log("✅ Data Kategori Induk berhasil dimasukkan.");

    // ==========================================
    // 2. SEEDING MASTER PELANGGARAN
    // ==========================================
    console.log("Mempersiapkan data Master Pelanggaran...");

    const dataPelanggaran = [
      {
        id: crypto.randomUUID(),
        namaPelanggaran: "Pelanggaran Ringan",
        tingkat: "RINGAN" as const,
        poinMinus: -15,
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        namaPelanggaran: "Pelanggaran Sedang",
        tingkat: "SEDANG" as const,
        poinMinus: -50,
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        namaPelanggaran: "Pelanggaran Berat",
        tingkat: "BERAT" as const,
        poinMinus: -150,
        isActive: true,
      },
    ];

    await db
      .insert(masterPelanggaran)
      .values(dataPelanggaran)
      .onConflictDoNothing();
    console.log("✅ Data Master Pelanggaran berhasil dimasukkan.");

    // ==========================================
    // 3. SEEDING SESI ABSENSI (JADWAL)
    // ==========================================
    console.log("Mempersiapkan data Sesi Jadwal...");

    const semuaJenjang = ["SD", "SMP", "SMA"] as ("SD" | "SMP" | "SMA")[];
    const islamOnly = ["ISLAM"] as Array<
      | "ISLAM"
      | "KRISTEN"
      | "KATOLIK"
      | "HINDU"
      | "BUDHA"
      | "KONGHUCU"
      | "LAINNYA"
    >;
    const nonIslam = [
      "KRISTEN",
      "KATOLIK",
      "HINDU",
      "BUDHA",
      "KONGHUCU",
      "LAINNYA",
    ] as typeof islamOnly;

    const dataSesi = [
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Subuh",
        waktuMulai: "04:30:00",
        waktuSelesai: "05:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 25,
        poinTelat: -10,
      },
      // ... (semua sesi solat lainnya ditambahkan targetAgama: islamOnly)
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Dhuha",
        waktuMulai: "06:30:00",
        waktuSelesai: "10:30:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Zuhur",
        waktuMulai: "12:00:00",
        waktuSelesai: "13:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Ashar",
        waktuMulai: "15:15:00",
        waktuSelesai: "16:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Magrib",
        waktuMulai: "18:00:00",
        waktuSelesai: "18:45:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Isya",
        waktuMulai: "19:15:00",
        waktuSelesai: "20:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },

      // --- TAMBAHAN: IBADAH NON-ISLAM (sekali sehari) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katIbadahNonIslamId,
        namaSesi: "Ibadah Harian",
        waktuMulai: "07:00:00",
        waktuSelesai: "08:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: nonIslam,
        poinTepatWaktu: 30,
        poinTelat: -10,
      },

      // --- KELOMPOK: ABSEN MAKAN (Wajib: Telat = Minus) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Pagi",
        waktuMulai: "05:30:00",
        waktuSelesai: "06:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 30,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Siang",
        waktuMulai: "13:00:00",
        waktuSelesai: "14:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 30,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Malam",
        waktuMulai: "18:45:00",
        waktuSelesai: "19:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 30,
        poinTelat: -10,
      },

      // --- KELOMPOK: ABSEN KEGIATAN (Wajib: Telat = Minus) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Pagi",
        waktuMulai: "06:15:00",
        waktuSelesai: "06:45:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 20,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Siang",
        waktuMulai: "14:00:00",
        waktuSelesai: "14:30:00",
        isMandatory: true,
        targetJenjang: ["SD"] as ("SD" | "SMP" | "SMA")[],
        poinTepatWaktu: 20,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Sore",
        waktuMulai: "16:00:00",
        waktuSelesai: "16:30:00",
        isMandatory: true,
        targetJenjang: ["SMP", "SMA"] as ("SD" | "SMP" | "SMA")[],
        poinTepatWaktu: 20,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Mentoring",
        waktuMulai: "20:00:00",
        waktuSelesai: "21:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 25,
        poinTelat: -15,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Tidur",
        waktuMulai: "21:30:00",
        waktuSelesai: "22:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 85,
        poinTelat: -50,
      },

      // --- KELOMPOK: KEGIATAN LAINNYA (Tidak Wajib) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 1",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 10,
        poinTelat: 0,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 2",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 10,
        poinTelat: 0,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 3",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 10,
        poinTelat: 0,
      },
    ];

    await db.insert(sesiAbsensi).values(dataSesi).onConflictDoNothing();
    console.log("✅ Data Sesi Jadwal berhasil dimasukkan.");

    if (isFull) {
      // ==========================================
      // 4. SEEDING KELAS
      // ==========================================
      console.log("Mempersiapkan data Kelas...");
      const kelasList: Array<{
        jenjang: "SD" | "SMP" | "SMA";
        tingkat: string;
        namaKelas: string;
      }> = [
        { jenjang: "SD", tingkat: "1", namaKelas: "A" },
        { jenjang: "SD", tingkat: "1", namaKelas: "B" },
        { jenjang: "SD", tingkat: "2", namaKelas: "A" },
        { jenjang: "SD", tingkat: "2", namaKelas: "B" },
        { jenjang: "SD", tingkat: "3", namaKelas: "A" },
        { jenjang: "SD", tingkat: "3", namaKelas: "B" },
        { jenjang: "SD", tingkat: "4", namaKelas: "A" },
        { jenjang: "SD", tingkat: "4", namaKelas: "B" },
        { jenjang: "SD", tingkat: "5", namaKelas: "A" },
        { jenjang: "SD", tingkat: "5", namaKelas: "B" },
        { jenjang: "SD", tingkat: "6", namaKelas: "A" },
        { jenjang: "SD", tingkat: "6", namaKelas: "B" },
        { jenjang: "SMP", tingkat: "7", namaKelas: "A" },
        { jenjang: "SMP", tingkat: "7", namaKelas: "B" },
        { jenjang: "SMP", tingkat: "8", namaKelas: "A" },
        { jenjang: "SMP", tingkat: "8", namaKelas: "B" },
        { jenjang: "SMP", tingkat: "9", namaKelas: "A" },
        { jenjang: "SMP", tingkat: "9", namaKelas: "B" },
        { jenjang: "SMA", tingkat: "10", namaKelas: "A" },
        { jenjang: "SMA", tingkat: "10", namaKelas: "B" },
        { jenjang: "SMA", tingkat: "11", namaKelas: "A" },
        { jenjang: "SMA", tingkat: "11", namaKelas: "B" },
        { jenjang: "SMA", tingkat: "12", namaKelas: "A" },
        { jenjang: "SMA", tingkat: "12", namaKelas: "B" },
      ];

      const dataKelas = kelasList.map((kls) => ({
        id: crypto.randomUUID(),
        ...kls,
      }));
      await db.insert(kelas).values(dataKelas).onConflictDoNothing();
      console.log("✅ Data Kelas berhasil dimasukkan.");
      const allKelas = await db.select().from(kelas);

      // ==========================================
      // 5. SEEDING PESERTA DIDIK
      // ==========================================
      console.log("Mempersiapkan data Peserta Didik...");

      const randomEl = <T>(arr: T[]): T =>
        arr[Math.floor(Math.random() * arr.length)];

      // Fungsi distribusi agama (sama seperti sebelumnya)
      const getRandomAgama = () => {
        const r = Math.random();
        if (r < 0.6) return "ISLAM";
        if (r < 0.75) return "KRISTEN";
        if (r < 0.85) return "KATOLIK";
        if (r < 0.9) return "HINDU";
        if (r < 0.95) return "BUDHA";
        if (r < 0.97) return "KONGHUCU";
        return "LAINNYA";
      };

      const pesertaDummy: (typeof pesertaDidik.$inferInsert)[] = [];
      let counter = 0; // untuk generate NIPD urut

      allKelas.forEach((kls) => {
        const jumlahSiswa = 5 + Math.floor(Math.random() * 4); // 5-8
        for (let i = 0; i < jumlahSiswa; i++) {
          const isMale = Math.random() > 0.5;
          // Generate nama lengkap Indonesia dengan gender sesuai
          const namaLengkap = faker.person.fullName({
            sex: isMale ? "male" : "female",
          });
          const nipd = `PD${String(counter + 1).padStart(5, "0")}`;
          const agama = getRandomAgama();

          // Generate tanggal lahir yang sesuai dengan tingkat kelas
          const tahunLahir =
            2008 - Number(kls.tingkat) - Math.floor(Math.random() * 3);
          const bulan = Math.floor(Math.random() * 12);
          const hari = Math.floor(Math.random() * 28) + 1; // hindari 29/30/31 agar sederhana
          const tanggalLahir = `${tahunLahir}-${String(bulan + 1).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;

          pesertaDummy.push({
            id: crypto.randomUUID(),
            kelasId: kls.id,
            nipd,
            nisn: `${new Date().getFullYear()}${String(counter + 1).padStart(6, "0")}`,
            namaLengkap,
            jenisKelamin: isMale ? "L" : "P",
            tempatLahir: faker.location.city(), // kota acak Indonesia
            tanggalLahir,
            agama,
            alamat: faker.location.streetAddress(),
            tahunMasuk: 2023,
            status: "AKTIF",
          });
          counter++;
        }
      });

      await db.insert(pesertaDidik).values(pesertaDummy).onConflictDoNothing();
      console.log("✅ Data Peserta Didik berhasil dimasukkan.");
      const allPeserta = await db.select().from(pesertaDidik);
      console.log(`Total peserta: ${allPeserta.length}`);

      // ==========================================
      // 6. SEEDING LOG ABSENSI (7 hari terakhir) - DENGAN CHUNKING
      // ==========================================
      console.log("Mempersiapkan data Log Absensi...");
      const allSesi = await db.select().from(sesiAbsensi);
      const allPelanggaran = await db.select().from(masterPelanggaran);

      const today = new Date();
      const tanggalList: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        tanggalList.push(d.toISOString().split("T")[0]);
      }

      const comboSet = new Set<string>();
      const logDummy: (typeof logAbsensi.$inferInsert)[] = [];

      allPeserta.forEach((peserta) => {
        const kls = allKelas.find((k) => k.id === peserta.kelasId);
        if (!kls) return;
        // Filter sesi berdasarkan jenjang DAN agama peserta
        const sesiRelevan = allSesi.filter(
          (s) =>
            s.targetJenjang.includes(kls.jenjang) &&
            s.targetAgama.includes(peserta.agama), // <-- penambahan filter agama
        );

        // Absensi rutin per hari per sesi
        tanggalList.forEach((tgl) => {
          sesiRelevan.forEach((sesi) => {
            const key = `${tgl}||${sesi.id}||${peserta.id}`;
            if (comboSet.has(key)) return;

            const rand = Math.random();
            let statusKehadiran:
              "HADIR" | "TIDAK_HADIR" | "IZIN" | "SAKIT" | "ALFA" = "HADIR";
            let statusWaktu: "TEPAT_WAKTU" | "TELAT" | null = null;
            let poin = 0;

            if (rand < 0.75) {
              statusKehadiran = "HADIR";
              if (Math.random() < 0.7) {
                statusWaktu = "TEPAT_WAKTU";
                poin = sesi.poinTepatWaktu;
              } else {
                statusWaktu = "TELAT";
                poin = sesi.poinTelat;
              }
            } else if (rand < 0.85) {
              statusKehadiran = "IZIN";
            } else if (rand < 0.92) {
              statusKehadiran = "SAKIT";
            } else {
              statusKehadiran = "ALFA";
            }

            const jamMulai = sesi.waktuMulai
              ? sesi.waktuMulai.split(":")
              : ["06", "00", "00"];
            const jamAcak =
              parseInt(jamMulai[0]) + Math.floor(Math.random() * 2);
            const menitAcak = Math.floor(Math.random() * 60);
            const detikAcak = Math.floor(Math.random() * 60);
            const waktuScan = new Date(
              `${tgl}T${String(jamAcak).padStart(2, "0")}:${String(menitAcak).padStart(2, "0")}:${String(detikAcak).padStart(2, "0")}`,
            );

            logDummy.push({
              id: crypto.randomUUID(),
              pesertaDidikId: peserta.id,
              waliAsuhId: null,
              sesiId: sesi.id,
              pelanggaranId: null,
              tanggal: tgl,
              waktuScan: waktuScan,
              statusKehadiran,
              statusWaktu,
              isPoinManual: false,
              poinDidapat: poin,
              keterangan:
                statusKehadiran === "IZIN"
                  ? "Izin orang tua"
                  : statusKehadiran === "SAKIT"
                    ? "Surat dokter"
                    : null,
            });
            comboSet.add(key);
          });
        });

        // Log Pelanggaran (15% peserta)
        if (Math.random() < 0.15) {
          const pelanggaranAcak = randomEl(allPelanggaran);
          const tglAcak = randomEl(tanggalList);
          const jam = 8 + Math.floor(Math.random() * 12);
          const waktu = new Date(
            `${tglAcak}T${String(jam).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`,
          );
          logDummy.push({
            id: crypto.randomUUID(),
            pesertaDidikId: peserta.id,
            waliAsuhId: null,
            sesiId: null,
            pelanggaranId: pelanggaranAcak.id,
            tanggal: tglAcak,
            waktuScan: waktu,
            statusKehadiran: "HADIR",
            statusWaktu: null,
            isPoinManual: false,
            poinDidapat: pelanggaranAcak.poinMinus,
            keterangan: `Melanggar: ${pelanggaranAcak.namaPelanggaran}`,
          });
        }
      });

      console.log(`Total entri log yang akan dimasukkan: ${logDummy.length}`);

      // INSERT SECARA BERTAHAP (CHUNK 200)
      const CHUNK_SIZE = 200;
      for (let i = 0; i < logDummy.length; i += CHUNK_SIZE) {
        const chunk = logDummy.slice(i, i + CHUNK_SIZE);
        await db.insert(logAbsensi).values(chunk).onConflictDoNothing();
        console.log(
          `   ✔️ Chunk ${Math.floor(i / CHUNK_SIZE) + 1} selesai (${i + chunk.length}/${logDummy.length})`,
        );
      }

      console.log("✅ Data Log Absensi berhasil dimasukkan.");
    }

    console.log("🎉 Proses Seeding Selesai!");
    process.exit();
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat seeding:", error);
    process.exit(1);
  }
}

main();
