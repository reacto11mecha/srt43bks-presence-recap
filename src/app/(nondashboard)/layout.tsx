import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export default async function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getSession();

  if (!auth) redirect("/login");

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, auth.user.id),
    columns: { accountApproved: true, email: true, name: true },
  });

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.accountApproved) {
    redirect("/");
  }

  return <>{children}</>;
}
