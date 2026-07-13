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
import { Field, FieldLabel, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

const sesiSchema = z.object({
  namaSesi: z.string().min(1, "Wajib diisi"),
  waktuMulai: z.string().min(5, "Format HH:MM wajib diisi"),
  waktuSelesai: z.string().min(5, "Format HH:MM wajib diisi"),
});

type SesiFormValues = z.infer<typeof sesiSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kategoriId: string;
  initialData?: (SesiFormValues & { id: string }) | null;
}

export function SesiFormDialog({
  isOpen,
  onClose,
  kategoriId,
  initialData,
}: Props) {
  const utils = api.useUtils();

  const form = useForm<SesiFormValues>({
    resolver: zodResolver(sesiSchema),
    defaultValues: {
      namaSesi: "",
      waktuMulai: "",
      waktuSelesai: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        namaSesi: initialData.namaSesi,
        waktuMulai: initialData.waktuMulai.substring(0, 5),
        waktuSelesai: initialData.waktuSelesai.substring(0, 5),
      });
    } else {
      form.reset({ namaSesi: "", waktuMulai: "", waktuSelesai: "" });
    }
  }, [initialData, form, isOpen]);

  const createMutation = api.pengaturan.createSesi.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil ditambahkan");
      utils.pengaturan.getKategoriWithSesi.invalidate();
      onClose();
    },
  });

  const updateMutation = api.pengaturan.updateSesi.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil diperbarui");
      utils.pengaturan.getKategoriWithSesi.invalidate();
      onClose();
    },
  });

  const onSubmit = (data: SesiFormValues) => {
    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, ...data });
    } else {
      createMutation.mutate({ kategoriId, ...data });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Sesi Jadwal" : "Tambah Sesi Jadwal"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="namaSesi"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Sesi</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Contoh: Sesi Pagi"
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
              name="waktuMulai"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Waktu Mulai</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="time"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="waktuSelesai"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Waktu Selesai</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="time"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

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
