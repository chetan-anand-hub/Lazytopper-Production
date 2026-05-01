import { createContext, useContext, useEffect, type ReactNode } from "react";

export type AppTheme = "dark" | "light";

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (t: AppTheme) => void;
}

const STORAGE_KEY = "lazytopper.theme";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: AppTheme = "light";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "light");
    } catch {}
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const toggleTheme = () => {};
  const setTheme = (_t: AppTheme) => {};

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
