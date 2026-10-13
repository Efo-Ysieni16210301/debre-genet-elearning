import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { updateUserRole } from "./action";

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [users, courseCount, enrollmentCount] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count(),
    prisma.enrollment.count(),
  ]);

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Courses</p>
          <p className="text-2xl font-bold">{courseCount}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Enrollments</p>
          <p className="text-2xl font-bold">{enrollmentCount}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Manage Users</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isMe = user.id === session.user.id;

              return (
                <tr key={user.id} className="border-t">
                  <td className="p-3">
                    {user.name}{" "}
                    {isMe && <span className="text-gray-400">(you)</span>}
                  </td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <form
                      action={updateUserRole.bind(null, user.id)}
                      className="flex gap-2"
                    >
                      <select
                        name="role"
                        defaultValue={user.role}
                        disabled={isMe}
                        className="border rounded px-2 py-1"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      {!isMe && (
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                      )}
                    </form>
                  </td>
                  <td className="p-3">{user.createdAt.toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
