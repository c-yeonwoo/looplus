import { SCENE_META, type SceneType } from "../types";

/** 장면별 연출 방향 — 사용자가 쓴 문장을 이미지로 옮길 때의 뼈대 */
const SCENE_DIRECTION: Record<SceneType, string> = {
  place: "the home and neighbourhood they live in, seen from inside or just outside",
  day: "a quiet everyday moment in their morning or afternoon routine",
  work: "the work they do because they want to, in their own space",
  people: "the people they spend time with, warm and unposed",
};

/**
 * 비전보드 장면 프롬프트.
 *
 * 얼굴을 알아볼 수 있는 인물·실존 인물·브랜드·글자를 피한다.
 * 사진에 글자가 들어가면 한국어가 깨져 나오고, 알아볼 수 있는 얼굴은
 * '내 미래'가 아니라 '남의 사진'처럼 보인다.
 */
export function buildScenePrompt(type: SceneType, text: string, why?: string): string {
  const wish = text.trim();
  const motive = why?.trim();
  return [
    `A calm, aspirational lifestyle photograph representing ${SCENE_DIRECTION[type]}.`,
    wish && `The person described it like this (Korean): "${wish}".`,
    motive && `Their reason for wanting this life: "${motive}".`,
    "Photographic, natural daylight, soft muted colours, shallow depth of field,",
    "editorial magazine quality, calm and hopeful mood.",
    "No text, no letters, no logos, no watermarks.",
    "No recognizable faces — show people from behind, at a distance, or out of frame.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function scenePromptLabel(type: SceneType): string {
  return SCENE_META[type].label;
}
