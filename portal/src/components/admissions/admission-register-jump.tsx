"use client";

import { useEffect } from "react";

export function AdmissionRegisterJump({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;

    const element = document.getElementById("admission-list");
    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [active]);

  return null;
}
