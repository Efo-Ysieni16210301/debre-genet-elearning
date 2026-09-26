import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@debregenet.com" },
    update: {},
    create: {
      name: "Abba Girma",
      email: "teacher@debregenet.com",
      password: hashedPassword,
      role: "TEACHER",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@debregenet.com" },
    update: {},
    create: {
      name: "Bethlehem Tesfaye",
      email: "student@debregenet.com",
      password: hashedPassword,
      role: "STUDENT",
    },
  });

  const course = await prisma.course.create({
    data: {
      title: "Introduction to the Book of Psalms",
      description:
        "A beginner-friendly study of the Psalms, their themes, and their meaning for daily life.",
      published: true,
      teacherId: teacher.id,
      lessons: {
        create: [
          {
            title: "Lesson 1: What Are the Psalms?",
            textContent:
              "The Psalms are a collection of sacred songs and prayers...",
            order: 1,
          },
          {
            title: "Lesson 2: Psalms of Praise",
            textContent:
              "In this lesson, we explore Psalms that focus on praising God...",
            videoUrl:
              "https://res.cloudinary.com/example/video/upload/sample.mp4",
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      courseId: course.id,
    },
  });

  console.log("Seed data created successfully:");
  console.log({
    teacher: teacher.email,
    student: student.email,
    course: course.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
