import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Navbar() {
  const session = await auth();
  const role = session?.user.role;

  return (
    <nav className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold">
          Debre Genet Sunday School
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/courses" className="hover:underline">
            Courses
          </Link>

          {session ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>

              {(role === "TEACHER" || role === "ADMIN") && (
                <Link href="/courses/new" className="hover:underline">
                  Create Course
                </Link>
              )}

              {role === "ADMIN" && (
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              )}

              <span className="text-gray-500">
                {session.user.name} ({role})
              </span>

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                  Log Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
