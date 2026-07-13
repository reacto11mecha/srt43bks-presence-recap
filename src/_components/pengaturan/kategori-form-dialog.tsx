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
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

const formSchema = z.object({
  namaKategori: z.string().min(1, "Nama wajib diisi"),
  isActive: z.boolean().default(true),
});

export function KategoriFormDialog({ initialData }: { initialData?: any }) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const form = useForm<z.infer<typeof formSchema>>({
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
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* MENGGUNAKAN BUTTON VARIANTS PADA TRIGGER */}
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
        <form
          onSubmit={form.handleSubmit((d) =>
            mutation.mutate(initialData ? { id: initialData.id, ...d } : d),
          )}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Kategori Induk</label>
            <Input
              {...form.register("namaKategori")}
              placeholder="Contoh: Absen Makan"
            />
          </div>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                {...form.register("isActive")}
                className="h-4 w-4"
              />
              Kategori Aktif
            </label>
          </div>
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
