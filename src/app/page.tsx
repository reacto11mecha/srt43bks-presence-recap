import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

export default async function Index() {
  const auth = await getSession();

  if (auth) redirect("/dashboard");

  redirect("/login");

  return <></>;
}
