const en = {
  title: "Courses",
  intro:
    "Pick a course to see its lessons. Enroll to unlock the videos, notes and quizzes.",
  create: "Create a course",
  emptyTitle: "No courses are published yet",
  emptyTeacher: "Create a course and publish it to see it here.",
  emptyStudent:
    "Your teachers are preparing the first courses. Check back soon.",
  taughtBy: "Taught by {name}",
  lessonCount: { one: "{count} lesson", other: "{count} lessons" },
  studentCount: { one: "{count} student", other: "{count} students" },
};

const am: typeof en = {
  title: "ኮርሶች",
  intro: "ትምህርቶቹን ለማየት ኮርስ ይምረጡ። ቪዲዮዎቹን፣ ማስታወሻዎቹንና ፈተናዎቹን ለመክፈት በኮርሱ ይመዝገቡ።",
  create: "ኮርስ ይፍጠሩ",
  emptyTitle: "እስካሁን የታተመ ኮርስ የለም",
  emptyTeacher: "ኮርስ ፈጥረው ካሳተሙ እዚህ ይታያል።",
  emptyStudent: "መምህራንዎ የመጀመሪያዎቹን ኮርሶች እያዘጋጁ ነው። በቅርቡ ተመልሰው ይመልከቱ።",
  taughtBy: "መምህር፡ {name}",
  lessonCount: { one: "{count} ትምህርት", other: "{count} ትምህርቶች" },
  studentCount: { one: "{count} ተማሪ", other: "{count} ተማሪዎች" },
};

export const courses = { en, am };
