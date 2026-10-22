import FinancialOverview from "@/components/home/FinancialOverview";
import Link from "next/link";
export default function MoneyPage() {
  return (
    <>
      <Link className="habit-text-button mb-5" href="/tools">
        도구로 돌아가기
      </Link>
      <FinancialOverview />
    </>
  );
}
