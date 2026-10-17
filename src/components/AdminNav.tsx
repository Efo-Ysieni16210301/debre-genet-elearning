import Link from "next/link";

const ITEMS = [
  { key: "users", href: "/admin", label: "Users" },
  { key: "courses", href: "/admin/courses", label: "Courses" },
  { key: "certificates", href: "/admin/certificates", label: "Certificates" },
] as const;

export default function AdminNav({
  current,
}: {
  current: (typeof ITEMS)[number]["key"];
}) {
  return (
    <nav aria-label="Admin sections" className="mt-4 flex gap-6 text-sm">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={`border-b-2 py-1 font-bold ${
            item.key === current
              ? "border-saffron"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
