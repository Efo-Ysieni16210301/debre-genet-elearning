import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isStudent = session.user.role === "STUDENT";
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold">
        Hello, {firstName}
      </h1>
      <p className="mt-1 text-muted">
        {isStudent
          ? "Here is where your learning stands."
          : "Here are your courses and your students."}
      </p>

      <div className="mt-8">
        {isStudent ? (
          <StudentDashboard studentId={session.user.id} />
        ) : (
          <TeacherDashboard
            teacherId={session.user.id}
            isAdmin={session.user.role === "ADMIN"}
          />
        )}
      </div>
    </div>
  );
}
