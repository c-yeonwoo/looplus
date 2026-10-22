"use client";
import { useEffect, useState } from "react";
import { dateKey } from "../tracking";

/** 자정과 백그라운드 복귀 시 오늘을 갱신한다. 기록 대화상자의 귀속 날짜는 별도로 고정한다. */
export function useToday() {
  const [today, setToday] = useState(() => dateKey());
  useEffect(() => {
    const update = () => setToday(dateKey());
    const timer = setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}
