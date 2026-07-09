import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { KelasTable } from "~/_components/kelas/kelas-table";
import { PesertaTable } from "~/_components/peserta/peserta-table";

export default function ManajemenAkademikPage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Manajemen Akademik
        </h2>
        <p className="text-muted-foreground">
          Kelola data kelas operasional dan peserta didik Sekolah Rakyat.
        </p>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="peserta" className="w-full">
        {/* Tombol Tab */}
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="peserta">Data Peserta</TabsTrigger>
          <TabsTrigger value="kelas">Data Kelas</TabsTrigger>
        </TabsList>

        {/* Konten Tab Peserta */}
        <TabsContent value="peserta">
          <PesertaTable />
        </TabsContent>

        {/* Konten Tab Kelas */}
        <TabsContent value="kelas">
          <KelasTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
