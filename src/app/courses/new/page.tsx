import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createCourse } from "../actions";

export default async function NewCoursePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/courses");
  }

  return (
    <div className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create a New Course</h1>

      <form action={createCourse} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            name="title"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            required
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
        >
          Create Course
        </button>
      </form>
    </div>
  );
}
