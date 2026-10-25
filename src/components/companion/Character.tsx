import {
  characterPose,
  type CompanionActivity,
  type CompanionStage,
} from "@/lib/companion";

export function Character({
  characterId,
  stage = "hello",
  activity = "idle",
  className = "",
}: {
  characterId?: string;
  stage?: CompanionStage;
  activity?: CompanionActivity;
  className?: string;
}) {
  const pose = characterPose(characterId, stage, activity);
  return (
    <div
      className={`companion-character ${className}`}
      role="img"
      aria-label={pose.label}
      style={{
        backgroundImage: `url("${pose.src}")`,
        backgroundSize: `${pose.columns * 100}% 100%`,
        backgroundPosition: `${pose.columns > 1 ? (pose.column / (pose.columns - 1)) * 100 : 0}% 50%`,
      }}
    />
  );
}
