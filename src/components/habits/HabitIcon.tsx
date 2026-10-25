import { Icon, type IconName } from "../Icon";

export function HabitIcon({
  templateId,
  size = 24,
}: {
  templateId?: string;
  size?: number;
}) {
  const icons: Record<string, IconName> = {
    read: "book",
    stretch: "activity",
    walk: "activity",
    journal: "receipt",
    tomorrow: "check-circle",
    tidy: "layers",
    language: "book",
    lesson: "book",
    notes: "receipt",
  };
  return (
    <Icon
      name={icons[templateId ?? ""] ?? "loop"}
      size={size}
      className="shrink-0 habit-routine-icon"
    />
  );
}
