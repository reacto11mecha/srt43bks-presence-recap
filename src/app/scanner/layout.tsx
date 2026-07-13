import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

export default async function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getSession();

  if (!auth) redirect("/login");

  return <>{children}</>;
}
