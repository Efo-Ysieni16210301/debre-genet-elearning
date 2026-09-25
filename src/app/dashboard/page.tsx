import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>
        Welcome, {session.user.name} — you are logged in as a{" "}
        <strong>{session.user.role}</strong>.
      </p>

      {session.user.role === "TEACHER" && (
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <p>Teacher tools would go here (manage courses, students, etc.)</p>
        </div>
      )}

      {session.user.role === "ADMIN" && (
        <div className="mt-6 p-4 bg-purple-50 rounded">
          <p>
            Admin tools would go here (manage users, platform settings, etc.)
          </p>
        </div>
      )}
    </div>
  );
}
