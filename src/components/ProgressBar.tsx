export default function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full bg-rule"
    >
      <div className="h-full bg-fern" style={{ width: `${percent}%` }} />
    </div>
  );
}
