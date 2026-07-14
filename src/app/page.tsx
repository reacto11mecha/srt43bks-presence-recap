import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { logoutAction } from "~/server/actions/account";
import { Clock } from "lucide-react";

export default async function Index() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { accountApproved: true, email: true, name: true },
  });

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.accountApproved) {
    redirect("/dashboard");
  }

  return (
    <main className="from-muted/30 to-background flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Akun Belum Disetujui
          </CardTitle>
          <CardDescription>
            Akun Anda sedang dalam proses verifikasi oleh administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-2 text-sm">
            Halo,{" "}
            <span className="font-medium">
              {currentUser.name || "Pengguna"}
            </span>
            .
          </p>
          <p className="text-muted-foreground text-sm">
            Akun dengan email{" "}
            <span className="font-medium">{currentUser.email}</span> belum
            disetujui. Silakan hubungi pengguna lain yang memiliki akses untuk
            menyetujui akun Anda.
          </p>
        </CardContent>
        <CardFooter>
          <form action={logoutAction} className="w-full">
            <Button type="submit" variant="outline" className="w-full">
              Keluar / Logout
            </Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}
