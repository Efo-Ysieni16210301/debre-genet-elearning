export default function Footer() {
  return (
    <footer className="mt-16 print:hidden">
      <div className="tilet" aria-hidden />
      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <p lang="am" className="font-geez text-base text-ink">
            ደብረ ገነት ሰንበት ትምህርት ቤት
          </p>
          <p>Lessons and quizzes for our students and teachers.</p>
        </div>
      </div>
    </footer>
  );
}
