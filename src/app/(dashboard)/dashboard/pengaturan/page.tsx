"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

// Import komponen form dialog yang sudah dibuat
import { KategoriFormDialog } from "~/_components/pengaturan/kategori-form-dialog";
import { SesiFormDialog } from "~/_components/pengaturan/sesi-form-dialog";

export default function PengaturanPage() {
  const utils = api.useUtils();

  // ==========================================
  // STATE MANAJEMEN MODAL
  // ==========================================
  // State untuk Kategori
  const [isKategoriOpen, setIsKategoriOpen] = useState(false);
  const [selectedKategori, setSelectedKategori] = useState<any>(null);

  // State untuk Sesi
  const [isSesiOpen, setIsSesiOpen] = useState(false);
  const [selectedSesi, setSelectedSesi] = useState<any>(null);
  const [activeKategoriId, setActiveKategoriId] = useState("");

  // ==========================================
  // QUERIES & MUTATIONS
  // ==========================================
  const { data: users, isLoading: loadingUsers } =
    api.pengaturan.getAllUsers.useQuery();
  const { data: kategoriList, isLoading: loadingKategori } =
    api.pengaturan.getKategoriWithSesi.useQuery();

  const approveUserMutation = api.pengaturan.approveUser.useMutation({
    onSuccess: () => {
      toast.success("Akun berhasil disetujui!");
      utils.pengaturan.getAllUsers.invalidate();
    },
  });

  const deleteKategori = api.pengaturan.deleteKategori.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus");
      utils.pengaturan.getKategoriWithSesi.invalidate();
    },
  });

  const deleteSesi = api.pengaturan.deleteSesi.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil dihapus");
      utils.pengaturan.getKategoriWithSesi.invalidate();
    },
  });

  const unapprovedUsers = users?.filter((u) => !u.accountApproved) || [];
  const approvedUsers = users?.filter((u) => u.accountApproved) || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground">
          Kelola pengguna, kategori absensi, dan jadwal sesi.
        </p>
      </div>

      <Tabs defaultValue="kategori" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="akun">Akun Pengguna</TabsTrigger>
          <TabsTrigger value="kategori">Kategori & Jadwal Sesi</TabsTrigger>
        </TabsList>

        {/* ==========================================
            TAB 1: AKUN PENGGUNA
            ========================================== */}
        <TabsContent value="akun" className="space-y-6">
          <div className="rounded-md border border-yellow-200 bg-yellow-50/50 p-4 dark:bg-yellow-950/10">
            <h2 className="mb-4 text-xl font-semibold text-yellow-800 dark:text-yellow-500">
              Menunggu Persetujuan ({unapprovedUsers.length})
            </h2>
            {loadingUsers ? (
              <p className="text-sm">Memuat data...</p>
            ) : unapprovedUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Tidak ada akun yang menunggu persetujuan.
              </p>
            ) : (
              <div className="space-y-3">
                {unapprovedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-background flex items-center justify-between rounded-lg border p-3 shadow-sm"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        approveUserMutation.mutate({ id: user.id })
                      }
                      disabled={approveUserMutation.isPending}
                      size="sm"
                    >
                      Setujui
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border p-4">
            <h2 className="mb-4 text-xl font-semibold">
              Pengguna Aktif ({approvedUsers.length})
            </h2>
            <div className="grid gap-3">
              {approvedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {user.email}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700"
                  >
                    Aktif
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ==========================================
            TAB 2: KATEGORI & SESI
            ========================================== */}
        <TabsContent value="kategori" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Manajemen Kategori & Sesi</h2>
            {/* TOMBOL TAMBAH KATEGORI */}
            <Button
              size="sm"
              onClick={() => {
                setSelectedKategori(null);
                setIsKategoriOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
            </Button>
          </div>

          {loadingKategori ? (
            <p className="text-sm">Memuat data...</p>
          ) : (
            <Accordion type="multiple" className="w-full space-y-4">
              {kategoriList?.map((kategori) => (
                <AccordionItem
                  key={kategori.id}
                  value={kategori.id}
                  className="bg-card rounded-lg border px-4"
                >
                  <div className="flex items-center justify-between">
                    <AccordionTrigger className="flex-1 text-left hover:no-underline">
                      <div className="flex flex-col">
                        <span className="text-base font-semibold">
                          {kategori.namaKategori}
                        </span>
                        <div className="mt-1 flex gap-2">
                          <Badge variant="secondary">{kategori.tipe}</Badge>
                          <Badge
                            variant={
                              kategori.poinDefault > 0
                                ? "default"
                                : "destructive"
                            }
                          >
                            {kategori.poinDefault} Poin
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <div className="ml-4 flex items-center gap-2">
                      {/* TOMBOL EDIT KATEGORI */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedKategori(kategori);
                          setIsKategoriOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* TOMBOL HAPUS KATEGORI */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-red-500"
                        onClick={() => {
                          if (
                            confirm(
                              "Yakin ingin menghapus kategori ini? Semua sesi dan log absensi terkait bisa terhapus.",
                            )
                          ) {
                            deleteKategori.mutate({ id: kategori.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <AccordionContent className="pt-2 pb-4">
                    <div className="mt-2 ml-2 space-y-3 border-l-2 pl-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-muted-foreground text-sm font-medium">
                          Jadwal Sesi
                        </h4>

                        {/* TOMBOL TAMBAH SESI (Hanya untuk kategori RUTIN) */}
                        {kategori.tipe === "RUTIN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setActiveKategoriId(kategori.id);
                              setSelectedSesi(null);
                              setIsSesiOpen(true);
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" /> Tambah Sesi
                          </Button>
                        )}
                      </div>

                      {kategori.sesi.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic">
                          Tidak ada sesi jadwal.
                        </p>
                      ) : (
                        kategori.sesi.map((sesi) => (
                          <div
                            key={sesi.id}
                            className="bg-muted/30 flex items-center justify-between rounded-md border p-2 text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {sesi.namaSesi}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                ({sesi.waktuMulai} - {sesi.waktuSelesai})
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* TOMBOL EDIT SESI */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setActiveKategoriId(kategori.id);
                                  setSelectedSesi(sesi);
                                  setIsSesiOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {/* TOMBOL HAPUS SESI */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:text-red-500"
                                onClick={() => {
                                  if (
                                    confirm("Yakin ingin menghapus sesi ini?")
                                  ) {
                                    deleteSesi.mutate({ id: sesi.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>

      {/* ==========================================
          RENDER KOMPONEN MODAL
          ========================================== */}
      <KategoriFormDialog
        isOpen={isKategoriOpen}
        onClose={() => setIsKategoriOpen(false)}
        initialData={selectedKategori}
      />

      <SesiFormDialog
        isOpen={isSesiOpen}
        onClose={() => setIsSesiOpen(false)}
        kategoriId={activeKategoriId}
        initialData={selectedSesi}
      />
    </div>
  );
}
