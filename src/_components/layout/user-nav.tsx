"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { authClient } from "~/server/better-auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";

export function UserNav() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const initials = user?.name?.substring(0, 2).toUpperCase() || "WA";

  return (
    <DropdownMenu>
      {/* Menggunakan prop 'render' sesuai dokumentasi base-nova */}
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative h-8 w-8 rounded-full" />
        }
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">
                {user?.name || "Wali Asuh"}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {user?.email || "Tidak ada email"}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={
              <Link
                href="/dashboard/akun"
                className="flex w-full cursor-pointer items-center"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan Akun</span>
              </Link>
            }
            nativeButton={false}
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600"
        >
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
