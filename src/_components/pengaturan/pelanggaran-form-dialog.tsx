"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "~/trpc/react";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

const formSchema = z.object({
  namaPelanggaran: z.string().min(1, "Nama wajib diisi"),
  tingkat: z.enum(["RINGAN", "SEDANG", "BERAT"]),
  poinMinus: z.coerce
    .number()
    .max(-1, "Poin harus bernilai negatif (contoh: -10)"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function PelanggaranFormDialog({ initialData }: { initialData?: any }) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      namaPelanggaran: initialData?.namaPelanggaran || "",
      tingkat: initialData?.tingkat || "RINGAN",
      poinMinus: initialData?.poinMinus || -10,
      isActive: initialData?.isActive ?? true,
    },
  });

  const createMutation = api.pengaturan.createPelanggaran.useMutation({
    onSuccess: () => {
      toast.success("Pelanggaran berhasil ditambahkan");
      utils.pengaturan.getMasterPelanggaran.invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = api.pengaturan.updatePelanggaran.useMutation({
    onSuccess: () => {
      toast.success("Pelanggaran berhasil diperbarui");
      utils.pengaturan.getMasterPelanggaran.invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: FormValues) => {
    if (initialData) {
      updateMutation.mutate({ id: initialData.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          initialData
            ? buttonVariants({ variant: "ghost", size: "sm" })
            : buttonVariants({ size: "sm" })
        }
      >
        {initialData ? (
          <>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggaran
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Pelanggaran" : "Tambah Pelanggaran Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-6">
          {/* Nama Pelanggaran */}
          <Controller
            name="namaPelanggaran"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Nama Kategori Pelanggaran
                </FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  placeholder="Contoh: Pelanggaran Berat"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Tingkat Pelanggaran (Select) */}
          <Controller
            name="tingkat"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Tingkat Pelanggaran
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Pilih tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RINGAN">Ringan</SelectItem>
                    <SelectItem value="SEDANG">Sedang</SelectItem>
                    <SelectItem value="BERAT">Berat</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Poin Minus */}
          <Controller
            name="poinMinus"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Poin Minus (Denda)</FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  {...field}
                  placeholder="-10"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Gunakan angka negatif. Contoh: -15
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Status Aktif */}
          <Controller
            name="isActive"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                className="items-center gap-2"
              >
                <input
                  type="checkbox"
                  id={field.name}
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel htmlFor={field.name} className="font-medium">
                  Aktif (Bisa digunakan oleh Wali Asuh)
                </FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Simpan Data
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
