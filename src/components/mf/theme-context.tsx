"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Create a context for theme management
interface ThemeContextProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// Initialize context with default values
const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  toggleTheme: () => {},
});

// Theme provider component to wrap around the app
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check local storage for saved theme preference on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Toggle between dark and light mode and save to localStorage
  const toggleTheme = () => {
    const newTheme = !isDarkMode ? "dark" : "light";
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  return (
   
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use the ThemeContext in components
export function useTheme() {
  return useContext(ThemeContext);
}
