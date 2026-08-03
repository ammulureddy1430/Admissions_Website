"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MentorRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/study-abroad/mentor/dashboard");
  }, [router]);

  return null;
}
