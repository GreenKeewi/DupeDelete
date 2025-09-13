"use client";

import { useRouter } from "next/navigation";
import React from "react";

export const useScrollToSection = () => {
  const router = useRouter();

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    // If not on the home page, navigate to home and then scroll
    if (window.location.pathname !== '/') {
      router.push(`/#${sectionId}`);
    } else {
      const targetElement = document.getElementById(sectionId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return scrollToSection;
};