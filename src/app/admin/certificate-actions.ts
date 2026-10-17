"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Not authorized.");
  }

  return session;
}

export async function revokeCertificate(certificateId: string) {
  const session = await requireAdmin();

  const certificate = await prisma.certificate.update({
    where: { id: certificateId },
    data: { revokedAt: new Date() },
    select: { code: true },
  });

  console.info("CERTIFICATE WITHDRAWN", {
    by: session.user.id,
    code: certificate.code,
  });

  revalidatePath("/admin/certificates");
}

export async function restoreCertificate(certificateId: string) {
  const session = await requireAdmin();

  const certificate = await prisma.certificate.update({
    where: { id: certificateId },
    data: { revokedAt: null },
    select: { code: true },
  });

  console.info("CERTIFICATE RESTORED", {
    by: session.user.id,
    code: certificate.code,
  });

  revalidatePath("/admin/certificates");
}
