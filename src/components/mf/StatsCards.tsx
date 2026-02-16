import React, { useMemo, useState, useEffect, useRef } from 'react';
import { StatsCardsSkeleton } from './charts/ChartSkeletons';
import { LucideIcon } from 'lucide-react';

/**
 * Structure for individual stat card data
 */
export interface StatCardItem {
  count: string | number;
  percentage?: string;
  color_code?: string;
}

/**
 * Dynamic stats data structure - keys can be any string
 * Example: { "Total": { count: "1000", color_code: "#820d76" }, ... }
 */
export type StatsData = Record<string, StatCardItem>;

/**
 * Optional custom labels mapping - if not provided, keys from data will be used
 */
export interface CustomLabels {
  [key: string]: string;
}

/**
 * Optional icons mapping - maps data keys to icon components
 */
export interface CustomIcons {
  [key: string]: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

/**
 * Props for StatsCards component
 */
export interface StatsCardsProps {
  /**
   * Dynamic stats data - accepts any number of keys
   * Each key should have: count (required), percentage (optional), color_code (optional)
   */
  data: StatsData;
  
  /**
   * Optional custom labels to override key names
   * Example: { "Total": "Total Installs", "Valid": "Valid Installs" }
   */
  customLabels?: CustomLabels;
  
  /**
   * Optional icons mapping - maps data keys to icon components
   * Example: { "Total": Download, "Valid": CheckCircle2, "Invalid": XCircle }
   */
  icons?: CustomIcons;
  
  /**
   * Loading state
   */
  isLoading?: boolean;
  
  /**
   * Card height - defaults to 100px
   */
  cardHeight?: number | string;
  
  /**
   * Grid columns configuration
   * Defaults to responsive: 1 on mobile, 3 on desktop
   */
  gridCols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  
  /**
   * Default border color if color_code is not provided
   */
  defaultBorderColor?: string;
  
  /**
   * Default text color for count if color_code is not provided
   */
  defaultCountColor?: string;
  
  /**
   * Show percentage badge - defaults to true if percentage exists
   */
  showPercentage?: boolean;
  
  /**
   * Custom className for the container
   */
  className?: string;
  
  /**
   * Number of skeleton cards to show when loading
   * If not provided, will use the number of keys in data or default to 3
   */
  skeletonCardCount?: number;
}

/**
 * Hook to animate number counting with proper dependency tracking
 * Only animates when targetValue actually changes
 */
const useCountUp = (
  targetValue: string | number,
  duration: number = 1500
) => {
  // Memoize the numeric target to ensure stable reference
  const targetNum = useMemo(() => {
    const num =
      typeof targetValue === "string"
        ? Number.parseFloat(targetValue)
        : targetValue;
    return Number.isNaN(num) ? 0 : num;
  }, [targetValue]);

  const [count, setCount] = useState<number>(0);
  
  const animationRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);
  const initialTargetRef = useRef<number>(targetNum);

  useEffect(() => {
    // Only animate if:
    // 1. Haven't animated yet (initial mount)
    // 2. OR the target value has actually changed
    const shouldAnimate = 
      !hasAnimatedRef.current || 
      initialTargetRef.current !== targetNum;

    if (!shouldAnimate) {
      return;
    }

    // Mark as animated and store current target
    hasAnimatedRef.current = true;
    initialTargetRef.current = targetNum;

    let startTime: number | null = null;
    setCount(0);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const progress = Math.min(
        (timestamp - startTime) / duration,
        1
      );

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(targetNum * easeOut);

      setCount(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCount(targetNum);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetNum, duration]);

  return count;
};

/**
 * Animated count component with formatting
 */
const AnimatedCount: React.FC<{ targetValue: string | number }> = ({
  targetValue,
}) => {
  const animatedCount = useCountUp(targetValue);
  
  // Format number with locale string
  const formatNumber = (value: number): string => {
    if (Number.isNaN(value)) return '0';
    return value.toLocaleString('en-US');
  };

  return <>{formatNumber(animatedCount)}</>;
};

/**
 * StatsCards Component
 * 
 * A fully dynamic component that renders stat cards based on the provided data structure.
 * Automatically handles any number of cards and uses color codes from the response.
 * 
 * @example
 * ```tsx
 * <StatsCards
 *   data={{
 *     "Total": { count: "2189869", color_code: "#820d76" },
 *     "Valid": { count: "2153750", percentage: "98.35%", color_code: "#008000" },
 *     "Invalid": { count: "36119", percentage: "1.65%", color_code: "#FF0000" }
 *   }}
 *   customLabels={{ "Total": "Total Installs" }}
 *   isLoading={false}
 * />
 * ```
 */
const StatsCards: React.FC<StatsCardsProps> = ({
  data,
  customLabels = {},
  icons = {},
  isLoading = false,
  cardHeight = 100,
  gridCols = {
    mobile: 1,
    tablet: 1,
    desktop: 3,
  },
  defaultBorderColor = '#7C3AED',
  defaultCountColor = '#000000',
  showPercentage = true,
  className = '',
  skeletonCardCount,
}) => {
  /**
   * Transform data into array of card items with proper ordering
   */
  const cardItems = useMemo(() => {
    if (!data || typeof data !== 'object') {
      return [];
    }

    return Object.entries(data)
      .filter(([_, value]) => value && typeof value === 'object')
      .map(([key, value]) => {
        const item = value as StatCardItem;
        return {
          key,
          label: customLabels[key] || key,
          count: item.count ?? 0,
          percentage: item.percentage,
          colorCode: item.color_code || defaultBorderColor,
        };
      });
  }, [data, customLabels, defaultBorderColor]);

  /**
   * Get grid columns class
   * Tailwind requires full class names, so we map common values
   */
  const getGridColsClass = () => {
    const mobile = gridCols.mobile ?? 1;
    const tablet = gridCols.tablet ?? gridCols.mobile ?? 1;
    const desktop = gridCols.desktop ?? 3;
    
    // Map to Tailwind classes
    const colsMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };
    
    const mobileClass = colsMap[mobile] || 'grid-cols-1';
    const tabletClass = colsMap[tablet] || 'grid-cols-1';
    const desktopClass = colsMap[desktop] || 'grid-cols-3';
    
    return `${mobileClass} sm:${tabletClass} md:${desktopClass} lg:${desktopClass} xl:${desktopClass}`;
  };

  /**
   * Get card height style
   */
  const getCardHeightStyle = (): string => {
    if (typeof cardHeight === 'number') {
      return `${cardHeight}px`;
    }
    return cardHeight;
  };

  // Show skeleton when loading
  if (isLoading) {
    const count = skeletonCardCount ?? (cardItems.length > 0 ? cardItems.length : 3);
    return (
      <StatsCardsSkeleton
        cardCount={count}
        cardHeight={cardHeight}
        gridCols={gridCols}
        className={className}
      />
    );
  }

  // Return null if no data and not loading
  if (cardItems.length === 0) {
    return null;
  }

  return (
    <div className={`grid ${getGridColsClass()} w-full gap-3 ${className}`}>
      {cardItems.map((item) => {
        const hasPercentage = showPercentage && item.percentage;
        const borderColor = item.colorCode;
        const countColor = item.colorCode !== defaultBorderColor ? item.colorCode : defaultCountColor;

        return (
          <div key={item.key} className="flex-1 group">
            <div
              className="relative overflow-hidden h-full bg-gradient-to-br from-card/50 via-card to-card/80 backdrop-blur-md dark:from-card/40 dark:via-card dark:to-card/60 rounded-2xl border border-border/40 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-border/60 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:rounded-2xl"
              style={{
                height: getCardHeightStyle(),
              }}
            >
              {/* Decorative accent bar */}
              <div
                className="absolute top-0 right-0 w-1.5 h-1/2 transition-all duration-300 group-hover:w-2"
                style={{
                  background: `linear-gradient(180deg, ${borderColor}, ${borderColor}00)`,
                }}
              />
              
              {/* Decorative glow accent */}
              <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-5 transition-all duration-300 group-hover:opacity-15"
                style={{
                  background: borderColor,
                }}
              />

              {/* Icon in top right corner */}
              {icons[item.key] && (() => {
                const IconComponent = icons[item.key];
                return (
                  <div className="absolute top-3 right-3 z-10 p-2 rounded-lg transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: `${borderColor}15` }}>
                    <IconComponent 
                      className="w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300" 
                      style={{ color: borderColor }}
                    />
                  </div>
                );
              })()}

              <div className="relative p-4 h-full flex flex-col justify-center items-start">
                <div className="flex flex-col gap-3 items-start w-full">
                  {/* Label first */}
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider opacity-75">
                    {item.label}
                  </div>
                  
                  {/* Count Row */}
                  <div className="flex flex-row gap-2 items-baseline flex-wrap">
                    <div
                      className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight transition-all duration-300 dark:text-white"
                      style={{ color: countColor }}
                    >
                      <AnimatedCount targetValue={item.count} />
                    </div>
                    {hasPercentage && (
                      <span
                        className="text-xs sm:text-sm font-bold rounded-lg px-2 py-0.5 shadow-md transition-all duration-300 group-hover:scale-105 whitespace-nowrap"
                        style={{
                          backgroundColor: `${borderColor}20`,
                          color: borderColor,
                          border: `1.5px solid ${borderColor}40`,
                        }}
                      >
                        {item.percentage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
