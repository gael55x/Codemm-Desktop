"use client";

import { useEffect, useState } from "react";

export function useThemeMode(): { darkMode: boolean; toggleDarkMode: () => void } {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("codem-theme");
    setDarkMode(stored === "dark");
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("codem-theme", next ? "dark" : "light");
      return next;
    });
  };

  return { darkMode, toggleDarkMode };
}

