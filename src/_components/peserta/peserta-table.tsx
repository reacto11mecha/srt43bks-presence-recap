"use client";

import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";
import { DataTable } from "~/_components/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "~/components/ui/button";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";

type Peserta = RouterOutputs["peserta"]["getAll"][number];

const columns: ColumnDef<Peserta>[] = [
  { accessorKey: "nipd", header: "NIPD" },
  { accessorKey: "namaLengkap", header: "Nama Lengkap" },
  {
    accessorKey: "kelas.jenjang",
    header: "Jenjang",
    cell: ({ row }) => row.original.kelas.jenjang,
  },
  {
    accessorKey: "kelas.tingkat",
    header: "Kelas",
    cell: ({ row }) =>
      `${row.original.kelas.tingkat} ${row.original.kelas.namaKelas}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
        {row.original.status}
      </span>
    ),
  },
];

export function PesertaTable() {
  const { data = [], isLoading } = api.peserta.getAll.useQuery();

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Excel
        </Button>
        <Button
          render={
            <Link href="/dashboard/peserta/tambah">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Peserta
            </Link>
          }
          nativeButton={false}
        />
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} />
    </div>
  );
}
