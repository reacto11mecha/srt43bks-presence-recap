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

const kategoriSchema = z.object({
  namaKategori: z.string().min(1, "Wajib diisi"),
  tipe: z.enum(["RUTIN", "PELANGGARAN"]),
  tingkatPelanggaran: z.enum(["TIDAK_ADA", "RINGAN", "SEDANG", "BERAT"]),
  poinDefault: z.coerce.number(),
});

type KategoriFormValues = z.infer<typeof kategoriSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: (KategoriFormValues & { id: string }) | null;
}

export function KategoriFormDialog({ isOpen, onClose, initialData }: Props) {
  const utils = api.useUtils();

  const form = useForm<KategoriFormValues>({
    resolver: zodResolver(kategoriSchema),
    defaultValues: {
      namaKategori: "",
      tipe: "RUTIN",
      tingkatPelanggaran: "TIDAK_ADA",
      poinDefault: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({
        namaKategori: "",
        tipe: "RUTIN",
        tingkatPelanggaran: "TIDAK_ADA",
        poinDefault: 0,
      });
    }
  }, [initialData, form, isOpen]);

  const createMutation = api.pengaturan.createKategori.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil ditambahkan");
      utils.pengaturan.getKategoriWithSesi.invalidate();
      onClose();
    },
  });

  const updateMutation = api.pengaturan.updateKategori.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil diperbarui");
      utils.pengaturan.getKategoriWithSesi.invalidate();
      onClose();
    },
  });

  const onSubmit = (data: KategoriFormValues) => {
    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Kategori" : "Tambah Kategori"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="namaKategori"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Kategori</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Contoh: Shalat Subuh"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="tipe"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor={`select-${field.name}`}>
                      Tipe
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={`select-${field.name}`}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RUTIN">Rutin</SelectItem>
                      <SelectItem value="PELANGGARAN">Pelanggaran</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              name="tingkatPelanggaran"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor={`select-${field.name}`}>
                      Tingkat
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={`select-${field.name}`}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih Tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIDAK_ADA">Tidak Ada</SelectItem>
                      <SelectItem value="RINGAN">Ringan</SelectItem>
                      <SelectItem value="SEDANG">Sedang</SelectItem>
                      <SelectItem value="BERAT">Berat</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <Controller
            name="poinDefault"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Poin Default (Positif/Negatif)
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="number"
                  aria-invalid={fieldState.invalid}
                  placeholder="Contoh: 25 atau -10"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
