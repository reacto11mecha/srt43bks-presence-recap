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
import { Input } from "~/components/ui/input";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

const formSchema = z.object({
  namaKategori: z.string().min(1, "Nama wajib diisi"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function KategoriFormDialog({ initialData }: { initialData?: any }) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      namaKategori: initialData?.namaKategori || "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const mutation = api.pengaturan[
    initialData ? "updateKategori" : "createKategori"
  ].useMutation({
    onSuccess: () => {
      toast.success(
        `Kategori berhasil ${initialData ? "diperbarui" : "dibuat"}`,
      );
      utils.pengaturan.getKategoriWithSesi.invalidate();
      setOpen(false);
      if (!initialData) form.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: FormValues) => {
    if (initialData) {
      mutation.mutate({ id: initialData.id, ...data });
    } else {
      mutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          initialData
            ? buttonVariants({ variant: "outline", size: "sm" })
            : buttonVariants({})
        }
      >
        {initialData ? (
          <>
            <Edit className="mr-2 h-4 w-4" /> Edit Kategori
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" /> Tambah Kategori Baru
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Kategori" : "Kategori Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-6">
          {/* Nama Kategori */}
          <Controller
            name="namaKategori"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Nama Kategori Induk
                </FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  placeholder="Contoh: Absen Makan"
                  aria-invalid={fieldState.invalid}
                />
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
                  Kategori Aktif
                </FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              Simpan Kategori
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
