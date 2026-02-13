"use client";
 
import { useEffect, useState, useRef } from "react";
 
interface ScrollProgressProps {
  scrollContainer?: string; // CSS selector for scroll container (defaults to window)
  height?: number; // Height of progress bar in pixels (default: 3)
  color?: string; // Color of progress bar (default: primary color)
  position?: "top" | "bottom"; // Position of progress bar (default: "top")
  className?: string; // Additional CSS classes
  topOffset?: number; // Top offset in pixels (for positioning below fixed headers)
}
 
export const ScrollProgress: React.FC<ScrollProgressProps> = ({
  scrollContainer,
  height = 3,
  color,
  position = "top",
  className = "",
  topOffset = 0,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    const container = scrollContainer
      ? document.querySelector(scrollContainer)
      : window;
 
    if (!container) return;
 
    const calculateScrollProgress = () => {
      let scrollTop: number;
      let scrollHeight: number;
      let clientHeight: number;
 
      if (scrollContainer) {
        const element = container as HTMLElement;
        scrollTop = element.scrollTop;
        scrollHeight = element.scrollHeight;
        clientHeight = element.clientHeight;
      } else {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      }
 
      const totalScroll = scrollHeight - clientHeight;
      const progress = totalScroll > 0 ? (scrollTop / totalScroll) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };
 
    // Initial calculation
    calculateScrollProgress();
 
    // Add scroll event listener
    container.addEventListener("scroll", calculateScrollProgress, { passive: true });
 
    // Also listen for resize events to recalculate
    window.addEventListener("resize", calculateScrollProgress, { passive: true });
 
    return () => {
      container.removeEventListener("scroll", calculateScrollProgress);
      window.removeEventListener("resize", calculateScrollProgress);
    };
  }, [scrollContainer]);
 
  const progressColor = color || "bg-primary";
 
  // Use sticky if className contains "sticky", otherwise use fixed
  const isSticky = className.includes("sticky");
  const positionClass = isSticky
    ? `sticky ${position === "top" ? "top-0" : "bottom-0"}`
    : `fixed ${position === "top" ? "top-0" : "bottom-0"}`;
 
  // Calculate top position with offset for fixed positioning
  const topPosition = !isSticky && position === "top" && topOffset > 0
    ? `${topOffset}px`
    : position === "top" ? "0" : "auto";
 
  return (
    <div
      ref={progressRef}
      className={`${positionClass} left-0 right-0 z-[9998] ${className.replace("sticky", "").trim()}`}
      style={{
        height: `${height}px`,
        top: topPosition,
      }}
    >
      <div
        className={`h-full transition-all duration-150 ease-out ${progressColor}`}
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};
 
 
 