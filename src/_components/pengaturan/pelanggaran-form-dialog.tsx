"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "~/trpc/react";
import { Button, buttonVariants } from "~/components/ui/button"; // <-- Import buttonVariants
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
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

const formSchema = z.object({
  namaPelanggaran: z.string().min(1, "Nama wajib diisi"),
  tingkat: z.enum(["RINGAN", "SEDANG", "BERAT"]),
  poinMinus: z.coerce
    .number()
    .max(-1, "Poin harus bernilai negatif (contoh: -10)"),
  isActive: z.boolean().default(true),
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
  });

  const updateMutation = api.pengaturan.updatePelanggaran.useMutation({
    onSuccess: () => {
      toast.success("Pelanggaran berhasil diperbarui");
      utils.pengaturan.getMasterPelanggaran.invalidate();
      setOpen(false);
    },
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
      {/* MENGGUNAKAN BUTTON VARIANTS PADA TRIGGER */}
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nama Kategori Pelanggaran
            </label>
            <Input
              {...form.register("namaPelanggaran")}
              placeholder="Contoh: Pelanggaran Berat"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tingkat Pelanggaran</label>
            <Select
              value={form.watch("tingkat")}
              onValueChange={(val: any) => form.setValue("tingkat", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RINGAN">Ringan</SelectItem>
                <SelectItem value="SEDANG">Sedang</SelectItem>
                <SelectItem value="BERAT">Berat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Poin Minus (Denda)</label>
            <Input
              type="number"
              {...form.register("poinMinus")}
              placeholder="-10"
            />
            <p className="text-muted-foreground text-xs">
              Gunakan angka negatif. Contoh: -15
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                {...form.register("isActive")}
                className="h-4 w-4"
              />
              Aktif (Bisa digunakan oleh Wali Asuh)
            </label>
          </div>

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
