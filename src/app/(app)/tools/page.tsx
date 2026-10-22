import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function ToolsPage() {
  return (
    <div className="habit-page">
      <Link className="habit-text-button mb-4" href="/profile">
        <Icon name="chevron-left" size={18} />
        프로필
      </Link>
      <h1 className="habit-title">필요할 때만 꺼내 쓰세요.</h1>
      <p className="mt-3 text-ink-600">
        루틴은 이 도구 없이도 이어갈 수 있어요.
      </p>
      <h2 className="habit-section-title mt-8">돈 관리</h2>
      <ul className="habit-list">
        {[
          {
            href: "/tools/money",
            title: "자산 현황",
            desc: "기존 자산 대시보드와 주간 점검",
            icon: "trending-up" as const,
          },
          {
            href: "/engine",
            title: "자산 설계",
            desc: "내 자산과 계획 살펴보기",
            icon: "engine" as const,
          },
          {
            href: "/spending",
            title: "지출",
            desc: "생활비 기록과 예산 확인",
            icon: "wallet" as const,
          },
          {
            href: "/tools/money/goals",
            title: "재무 목표와 비전",
            desc: "기존 목표 설정과 미래 장면",
            icon: "target" as const,
          },
        ].map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="habit-choice">
              <Icon name={item.icon} />
              <span className="flex-1">
                <span className="block font-semibold">{item.title}</span>
                <span className="mt-1 block text-sm text-ink-600">
                  {item.desc}
                </span>
              </span>
              <Icon name="chevron-right" size={18} />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm leading-relaxed text-ink-600">
        자산 설계와 지출은 이곳으로 옮겼어요.
        <br />
        기존 데이터와 기록은 그대로 보관돼요.
      </p>
      <Link className="habit-text-button mt-6" href="/tools/routines">
        루틴 관리 · 보관
      </Link>
    </div>
  );
}
