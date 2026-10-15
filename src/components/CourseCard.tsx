import Link from "next/link";
import { spineFor } from "@/lib/spine";

type CourseCardProps = {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  lessonCount: number;
  studentCount: number;
};

export default function CourseCard({
  id,
  title,
  description,
  teacherName,
  lessonCount,
  studentCount,
}: CourseCardProps) {
  return (
    <Link
      href={`/courses/${id}`}
      className="group flex w-full overflow-hidden rounded-sm border border-rule bg-white transition-colors hover:border-ink"
    >
      <div aria-hidden className={`w-3 shrink-0 ${spineFor(id)}`} />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold leading-snug underline-offset-4 group-hover:underline">
          {title}
        </h3>
        <p className="mt-2 line-clamp-3 text-[0.95rem] text-muted">
          {description}
        </p>
        <p className="mt-auto pt-4 text-sm font-bold">
          Taught by {teacherName}
        </p>
        <p className="mt-1 text-sm text-muted">
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"},{" "}
          {studentCount} {studentCount === 1 ? "student" : "students"}
        </p>
      </div>
    </Link>
  );
}
