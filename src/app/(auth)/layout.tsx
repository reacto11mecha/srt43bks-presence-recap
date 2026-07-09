import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getSession();

  if (auth) redirect("/dashboard");

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
