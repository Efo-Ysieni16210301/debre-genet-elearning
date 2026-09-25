import { auth, signOut } from "@/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Debre Genet Sunday School</h1>

      {session ? (
        <>
          <p>
            Logged in as <strong>{session.user.name}</strong> (
            {session.user.role})
          </p>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="bg-red-600 text-white px-4 py-2 rounded">
              Log Out
            </button>
          </form>
        </>
      ) : (
        <div className="flex gap-4">
          <Link href="/login" className="text-blue-600 underline">
            Log In
          </Link>
          <Link href="/signup" className="text-blue-600 underline">
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );
}
