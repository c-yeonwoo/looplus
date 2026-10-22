import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { Icon } from "@/components/Icon";

export default function ProfilePage() {
  return (
    <div className="habit-page">
      <Link className="habit-text-button mb-4" href="/home">
        <Icon name="chevron-left" size={18} />
        오늘
      </Link>
      <h1 className="habit-title">프로필</h1>
      <section className="mt-8">
        <h2 className="habit-section-title">계정과 백업</h2>
        <AccountMenu />
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          계정 없이 만든 기록은 이 기기에 저장돼요. 브라우저 데이터 삭제 전 계정
          백업을 확인해 주세요.
        </p>
      </section>
      <section className="mt-8">
        <h2 className="habit-section-title">도구</h2>
        <Link className="habit-text-button mb-3" href="/tools/routines">
          루틴 관리 · 보관
        </Link>
        <Link
          className="habit-choice rounded-xl border border-ink-200"
          href="/tools"
        >
          <Icon name="layers" />
          <span className="flex-1">필요할 때 꺼내 쓰는 도구</span>
          <Icon name="chevron-right" size={18} />
        </Link>
      </section>
      <section className="mt-8">
        <h2 className="habit-section-title">안내</h2>
        <div className="flex flex-wrap gap-4 text-ink-600">
          <Link href="/legal/terms" className="habit-text-button">
            이용약관
          </Link>
          <Link href="/legal/privacy" className="habit-text-button">
            개인정보 처리방침
          </Link>
          <a href="/licenses/Pretendard-OFL.txt" className="habit-text-button">
            폰트 라이선스
          </a>
        </div>
      </section>
    </div>
  );
}
