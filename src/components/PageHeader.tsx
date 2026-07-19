import { Icon, type IconName } from "./Icon";

export function PageHeader({
  icon,
  title,
  desc,
}: {
  icon: IconName;
  title: string;
  desc?: string;
}) {
  return (
    <header className="flex items-start gap-3 pb-1">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 pt-0.5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-800">{title}</h1>
        {desc && (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">{desc}</p>
        )}
      </div>
    </header>
  );
}
