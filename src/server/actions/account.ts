"use server";

import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { headers } from "next/headers";

// ======================== UPDATE NAMA ========================
export async function updateName(newName: string) {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  // Update nama user melalui method bawaan Better Auth
  await auth.api.updateUser({
    body: {
      name: newName,
    },
    headers: await headers(),
  });

  return { success: true };
}

// ======================== CEK APAKAH SUDAH PUNYA PASSWORD ========================
export async function checkHasPassword(): Promise<boolean> {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  // Ambil daftar akun user; jika ada provider "credential" berarti sudah punya password
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });

  console.log(accounts);

  return accounts.some((acc) => acc.providerId === "credential");
}

// ======================== BUAT PASSWORD BARU (untuk user Google/OAuth) ========================
export async function createPassword(newPassword: string) {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  await auth.api.setPassword({
    body: {
      newPassword,
    },
    headers: await headers(),
  });

  return { success: true };
}

// ======================== UBAH PASSWORD (jika sudah punya password) ========================
export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
    },
    headers: await headers(),
  });

  return { success: true };
}

export async function getSessions() {
  const currentSession = await auth.api.getSession({
    headers: await headers(),
  });
  if (!currentSession) throw new Error("Anda harus login.");

  const sessions = await auth.api.listSessions({
    headers: await headers(),
  });

  // Tandai sesi yang sedang digunakan
  return sessions.map((s) => ({
    id: s.id,
    token: s.token,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    isCurrent: s.token === currentSession.session.token,
  }));
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  return {
    name: session.user.name,
    email: session.user.email,
  };
}
