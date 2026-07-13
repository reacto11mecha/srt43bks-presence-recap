"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldContent,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

const manualLogSchema = z.object({
  pesertaDidikId: z.string().min(1, "Peserta wajib dipilih"),
  kategoriId: z.string().min(1, "Kategori wajib dipilih"),
  sesiId: z.string().optional(),
  status: z.enum(["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT", "ALFA"]),
  keterangan: z.string().optional(),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
});

type ManualLogValues = z.infer<typeof manualLogSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualLogFormDialog({ isOpen, onClose }: Props) {
  const utils = api.useUtils();

  const { data: options, isLoading: loadingOptions } =
    api.aktivitas.getFormOptions.useQuery(undefined, {
      enabled: isOpen,
    });

  const form = useForm<ManualLogValues>({
    resolver: zodResolver(manualLogSchema),
    defaultValues: {
      pesertaDidikId: "",
      kategoriId: "",
      sesiId: "",
      status: "HADIR",
      keterangan: "",
      tanggal: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  const createMutation = api.aktivitas.createLogManual.useMutation({
    onSuccess: () => {
      toast.success("Log absensi manual berhasil dicatat!");
      utils.aktivitas.getRecentLogs.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });

  const onSubmit = (data: ManualLogValues) => {
    createMutation.mutate(data);
  };

  const selectedKategoriId = form.watch("kategoriId");
  const selectedKategori = options?.kategori.find(
    (k) => k.id === selectedKategoriId,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Input Log Manual</DialogTitle>
        </DialogHeader>

        {loadingOptions ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Memuat opsi form...
          </p>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="tanggal"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Tanggal</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="pesertaDidikId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor={`select-${field.name}`}>
                      Peserta Didik
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Select
                    name={field.name}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={`select-${field.name}`}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih Siswa">
                        {/* Render manual label teks siswa yang terpilih agar tidak bocor ID database */}
                        {(() => {
                          const p = options?.peserta.find(
                            (p) => p.id === field.value,
                          );
                          return p
                            ? `${p.namaLengkap} - ${p.kelas.tingkat} ${p.kelas.namaKelas}`
                            : "Pilih Siswa";
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {options?.peserta.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.namaLengkap} - {p.kelas.tingkat}{" "}
                          {p.kelas.namaKelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {/* SELECT KATEGORI */}
            <Controller
              name="kategoriId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor={`select-${field.name}`}>
                      Kategori Kegiatan/Pelanggaran
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Select
                    name={field.name}
                    value={field.value || undefined}
                    onValueChange={(val) => {
                      field.onChange(val);

                      // Cek apakah kategori yang baru dipilih adalah pelanggaran
                      const selectedTipe = options?.kategori.find(
                        (k) => k.id === val,
                      )?.tipe;

                      if (selectedTipe === "PELANGGARAN") {
                        form.setValue("sesiId", ""); // Reset sesi
                        form.setValue("status", "HADIR"); // Set status ke HADIR secara silent
                      }
                    }}
                  >
                    <SelectTrigger
                      id={`select-${field.name}`}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih Kategori">
                        {(() => {
                          const k = options?.kategori.find(
                            (k) => k.id === field.value,
                          );
                          return k
                            ? `${k.namaKategori} ${k.tipe === "PELANGGARAN" ? "(Pelanggaran)" : ""}`
                            : "Pilih Kategori";
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {options?.kategori.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.namaKategori}{" "}
                          {k.tipe === "PELANGGARAN" ? "(Pelanggaran)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {/* SELECT SESI (Muncul jika tipe kategori = RUTIN) */}
            {selectedKategori?.tipe === "RUTIN" && (
              <Controller
                name="sesiId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldContent>
                      <FieldLabel htmlFor={`select-${field.name}`}>
                        Sesi Jadwal
                      </FieldLabel>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                    <Select
                      name={field.name}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id={`select-${field.name}`}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Pilih Sesi">
                          {(() => {
                            const s = selectedKategori.sesi.find(
                              (s) => s.id === field.value,
                            );
                            return s
                              ? `${s.namaSesi} (${s.waktuMulai} - ${s.waktuSelesai})`
                              : "Pilih Sesi";
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectedKategori.sesi.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.namaSesi} ({s.waktuMulai} - {s.waktuSelesai})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}

            {/* SELECT STATUS (HANYA Muncul jika tipe kategori = RUTIN) */}
            {selectedKategori?.tipe === "RUTIN" && (
              <Controller
                name="status"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldContent>
                      <FieldLabel htmlFor={`select-${field.name}`}>
                        Status Kehadiran
                      </FieldLabel>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                    <Select
                      name={field.name}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id={`select-${field.name}`}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Pilih Status">
                          {field.value === "HADIR"
                            ? "Hadir"
                            : field.value === "SAKIT"
                              ? "Sakit"
                              : field.value === "IZIN"
                                ? "Izin"
                                : field.value === "ALFA"
                                  ? "Alfa"
                                  : field.value === "TIDAK_HADIR"
                                    ? "Tidak Hadir"
                                    : "Pilih Status"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HADIR">Hadir</SelectItem>
                        <SelectItem value="SAKIT">Sakit</SelectItem>
                        <SelectItem value="IZIN">Izin</SelectItem>
                        <SelectItem value="ALFA">Alfa</SelectItem>
                        <SelectItem value="TIDAK_HADIR">Tidak Hadir</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}

            <Controller
              name="keterangan"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Keterangan (Opsional)
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Contoh: Surat sakit dokter / Kronologi pelanggaran"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Simpan Log"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
