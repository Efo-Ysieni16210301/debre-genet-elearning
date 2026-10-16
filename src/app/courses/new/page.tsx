import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createCourse } from "../actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "New course" };

export default async function NewCoursePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/courses");
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Link
        href="/courses"
        className="text-sm font-bold text-lapis underline underline-offset-4"
      >
        All courses
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">
        Create a course
      </h1>

      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_16rem]">
        <form action={createCourse} className="space-y-5">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-bold">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={120}
              placeholder="For example: Introduction to the Psalms"
              className="field"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-bold"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              maxLength={2000}
              className="field"
            />
            <p className="mt-1.5 text-sm text-muted">
              Tell students what the course covers and who it is for.
            </p>
          </div>

          <SubmitButton pendingText="Creating...">Create course</SubmitButton>
        </form>

        <aside>
          <h2 className="font-display text-lg font-semibold">
            What happens next
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>You create the course. It starts as a draft.</li>
            <li>You add lessons with text, video, or both.</li>
            <li>You can add quizzes. These are optional.</li>
            <li>You publish it, and students can enroll.</li>
          </ol>
        </aside>
      </div>
    </div>
  );
}
