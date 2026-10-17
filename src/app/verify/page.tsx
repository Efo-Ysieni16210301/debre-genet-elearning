import type { Metadata } from "next";
import VerificationResult from "@/components/VerificationResult";

export const metadata: Metadata = {
  title: "Verify a certificate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const entered = (code ?? "").trim().slice(0, 40);

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold">
        Verify a certificate
      </h1>
      <p className="mt-2 text-muted">
        Enter the verification code printed on a Debre Genet Sunday School
        certificate to check that it is genuine.
      </p>

      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <label htmlFor="verify-code" className="sr-only">
          Verification code
        </label>
        <input
          id="verify-code"
          name="code"
          defaultValue={entered}
          placeholder="DG-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          className="field min-w-0 flex-1 font-mono"
        />
        <button type="submit" className="btn btn-primary">
          Verify
        </button>
      </form>

      {entered && (
        <div className="mt-8">
          <VerificationResult code={entered} />
        </div>
      )}
    </div>
  );
}
