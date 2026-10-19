import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/i18n/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { t } = await getI18n();

  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: t("auth.api.required") },
        { status: 400 },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: t("auth.api.nameTooLong") },
        { status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: t("auth.api.emailInvalid") },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: t("auth.api.passwordShort") },
        { status: 400 },
      );
    }

    if (password.length > 72) {
      return NextResponse.json(
        { error: t("auth.api.passwordLong") },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: t("auth.api.emailTaken") },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email },
      { status: 201 },
    );
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return NextResponse.json({ error: t("auth.api.generic") }, { status: 500 });
  }
}
