import type { Metadata } from "next";
import Link from "next/link";
import VerificationResult from "@/components/VerificationResult";

export const metadata: Metadata = {
  title: "Verify a certificate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function VerifyCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold">
        Verify a certificate
      </h1>

      <div className="mt-8">
        <VerificationResult code={safeDecode(code).slice(0, 40)} />
      </div>

      <p className="mt-8 text-sm text-muted">
        Checking a different certificate?{" "}
        <Link
          href="/verify"
          className="font-bold text-lapis underline underline-offset-4"
        >
          Enter another code
        </Link>
      </p>
    </div>
  );
}
