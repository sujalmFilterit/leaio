
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useFullscreen } from '@/hooks/full-screen';
import { Label, Pie, PieChart, ResponsiveContainer, LabelList, Cell } from "recharts";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatNumber, renderActiveShape, formatValue } from "@/lib/utils";
import { DonutChartSkeleton } from "./ChartSkeletons";
import ChartHeader from './ChartHeader';
 
interface DonutChartProps {
  chartData?: { label?: string;[key: string]: string | number | undefined }[];
  dataKey: string;  // Dynamic key for chart data
  nameKey?: string;  // Dynamic key for name
  chartConfig?: {
    [key: string]: {
      label: string;
      color: string;
    };
  };
  displayMode?: "percentage" | "value" | "both";
  exportKey?: string;
  innerRadiusProp?: number;
  outerRadiusProp?: number;
  frequencyShow?: boolean;
  frequencyOptions?: string[];
  selectedFrequency?: string;
  handleFrequencyChange?: (value: string) => void;
  frequencyPlaceholder?: string;
  // Filter options - supports radio, single-select, and multi-select
  filterType?: "radio" | "single-select" | "multi-select";
  filterOptions?: { value: string; label: string }[];
  selectedFilterValue?: string | string[]; // string for radio/single-select, string[] for multi-select
  handleFilterChange?: (value: string | string[]) => void;
  filterPlaceholder?: string;
  filterClassName?: string;
  // Legacy props for backward compatibility
  marginTop?: string;
  isdonut?: boolean;
  isLoading?: boolean;
  isView: boolean;
  handleExport?: () => void;
  onExpand?: () => void;
  onExport?: (s: string, title: string, index: number) => void;
  visitEventOptions?: { value: string; label: string }[];
  handleTypeChange?: (value: string) => void;
  selectedType?: string;
  title?: string;
  titleIcon?: React.ReactNode;
  isSelect?: boolean;
  isRadioButton?: boolean;
  selectoptions?: string[];
  placeholder?: string;
  isPercentageValue?: boolean;
  isLabelist?: boolean;
  direction?: string;
  totalV?: number;
  position?: string;
  contentHeight?: number | string;
  cardHeight?: number | string;
  isPercentage?: boolean;
  istotalvistors?: boolean;
  handleExportCsv?: () => void;
  handleExportPng?: (title: string, key: string) => void;
  handleExpand?: () => void;
  onSegmentClick?: (data: any) => void;
  donutHeight?: number | string;
  radii?: {
    default?: { inner: number; outer: number };
    mobile?: { inner: number; outer: number };
    tablet?: { inner: number; outer: number };
    laptop?: { inner: number; outer: number };
    laptopL?: { inner: number; outer: number };  // ← Add this
  };
 
  expandedRadii?: {
    default?: { inner: number; outer: number };
    mobile?: { inner: number; outer: number };
    tablet?: { inner: number; outer: number };
    laptop?: { inner: number; outer: number };
    laptopL?: { inner: number; outer: number };  // ← Add this
  };
  showHeader?: boolean;
  showExport?: boolean;
  className?: string;
  chartMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  legendClickable?: boolean;
}
 
const DonutChart: React.FC<DonutChartProps> = ({
  chartData = [],
  chartConfig,
  showExport = true,
  title,
  titleIcon,
  displayMode = "percentage",
  className = "",
  dataKey,
  nameKey,
  totalV = 200500,
  frequencyShow = true,
  frequencyOptions = [],
  selectedFrequency = "",
  handleFrequencyChange,
  frequencyPlaceholder = "",
  filterType,
  filterOptions = [],
  selectedFilterValue,
  handleFilterChange,
  filterPlaceholder = "Select...",
  filterClassName = "w-[120px] h-[30px]",
  isPercentageValue = true,
  isLabelist = false,
  direction = "flex-col",
  isLoading = false,
  marginTop,
  donutHeight = "14rem",
  position,
  exportKey = "",
  isPercentage,
  istotalvistors = true,
  cardHeight = "17.6875rem",
  contentHeight = "14.375rem",
  handleExportCsv,
  handleExportPng,
  handleExpand,
 
  onSegmentClick,
  showHeader = true,
  chartMargins = { top: -20, right: 2, left: -22, bottom: 4 },
  radii = {
    default: { inner: 55, outer: 60 },
    mobile: { inner: 35, outer: 55 },
    tablet: { inner: 35, outer: 65 },
    laptop: { inner: 35, outer: 55 },
    laptopL: { inner: 55, outer: 90 },
  },
  expandedRadii = {
    mobile: { inner: 35, outer: 70 },
    tablet: { inner: 35, outer: 70 },
    laptop: { inner: 80, outer: 140 },
    laptopL: { inner: 80, outer: 140 },
  },
  legendClickable = false,
 
}) => {
  
 
  const isFullscreen = useFullscreen();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeLegendIndex, setActiveLegendIndex] = useState<number | null>(null);
 
 
  const formatVisitors = useMemo(() => (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  }, []);
  const getBreakpoint = (width: number) => {
    if (width < 640) return "mobile";
    if (width >= 640 && width < 1024) return "tablet";
    if (width >= 1024 && width < 1440) return "laptop";
    return "laptopL";
  };
 
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );
 
  useEffect(() => {
    if (typeof window === "undefined") return;
 
    const handleResize = () => setWindowWidth(window.innerWidth);
 
    window.addEventListener("resize", handleResize);
    handleResize();
 
    return () => window.removeEventListener("resize", handleResize);
  }, []);
 
  const breakpoint = getBreakpoint(windowWidth);
 
  const currentRadii = isFullscreen
    ? expandedRadii[breakpoint]       // ← Correct fullscreen logic
    : radii[breakpoint] ?? radii.default; // ← fallback to default
 
 
  const chartHeight =
    typeof donutHeight === "number"
      ? donutHeight
      : typeof donutHeight === "string"
        ? donutHeight.endsWith("rem")
          ? Number.parseFloat(donutHeight) * 16
          : Number.parseFloat(donutHeight)
        : 180;
 
  return (
    // <Card className="flex flex-wrap justify-between border-none w-full h-full">
    <Card
      //ref={cardRef}
      className={`w-full shadow-lg rounded-2xl dark:bg-gradient-to-br dark:from-card/50 dark:via-card dark:to-card/80 bg-gradient-to-br from-card/40 via-card to-card/60 border border-border/40 hover:shadow-2xl transition-all duration-300 ${className}`}
      style={{
        height:
          typeof cardHeight === "number"
            ? `${cardHeight}px`
            : cardHeight,
      }}
    >
 
      {showHeader && (
 
        <ChartHeader
          title={title}
          titleIcon={titleIcon}
          showExport={showExport}
          handleExportCsv={handleExportCsv ? handleExportCsv : undefined}
          handleExportPng={handleExportPng ? handleExportPng : undefined}
          handleExpand={handleExpand ? handleExpand : undefined}
          exportKey={exportKey}
          frequencyShow={frequencyShow}
          frequencyOptions={frequencyOptions}
          selectedFrequency={selectedFrequency}
          handleFrequencyChange={handleFrequencyChange}
          frequencyPlaceholder={frequencyPlaceholder}
          filterType={filterType}
          filterOptions={filterOptions}
          selectedFilterValue={selectedFilterValue}
          handleFilterChange={handleFilterChange}
          filterPlaceholder={filterPlaceholder}
          filterClassName={filterClassName}
        />
      )}
 
      <CardContent
        className="w-full p-0 pt-0 "
        style={{
          height:
            typeof contentHeight === "number"
              ? `${contentHeight}px`
              : contentHeight,
        }}
      >        {isLoading ? (
        <DonutChartSkeleton height={`${chartHeight}px`} />
      ) : chartData?.length > 0 ? (
        <div className="grid grid-cols-2 h-full">
          <div className="h-full w-full flex justify-center items-center">
            {chartConfig ? (
              <ChartContainer
                config={chartConfig}
                className="relative w-full p-0"
                style={{ height: chartHeight }}
 
              >
                <div style={{ width: "100%", height: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart
                      margin={chartMargins}
                    >
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel isPercentage={isPercentage} />}
                      />
                      <Pie
                        data={chartData}
                        dataKey={dataKey}
                        nameKey={nameKey}
                        innerRadius={currentRadii?.inner}
                        outerRadius={currentRadii?.outer}
                        strokeWidth={2}
                        fill="#8884d8"
                        {...(onSegmentClick
                          ? {
                            activeIndex: activeIndex ?? undefined,
                            activeShape: renderActiveShape,
                            onClick: (data: any, index: number) => {
                              setActiveIndex(activeIndex === index ? null : index); // toggle
                              onSegmentClick?.(data);
                            },
                          }
                          : {})}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill || chartConfig[entry.label || '']?.color}
                            style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
                          />
                        ))}
                        {isLabelist && (
                          <LabelList
                            dataKey={dataKey}
                            position="inside"
                            style={{
                              fontSize: '8px',
                              fill: '#fff',
                              fontWeight: 'bold'
                            }}
                            stroke="none"
                            formatter={(value: number) => `${value}%`}
                          />
                        )}
                        {istotalvistors && (
                          <Label
                            key={totalV}
                            content={({ viewBox }) => {
                              const displayedVisitors = totalV ?? 0;
                              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                if (displayedVisitors > 0) {
                                  return (
                                    <text
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                    >
                                      <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="fill-foreground lg:text-subBody  xl:text-body md:text-text-body font-bold sm:text-body"
                                        style={{ fontSize: isFullscreen ? '12rem' : '' }}
                                      >
                                        {formatNumber(displayedVisitors)}
                                      </tspan>
                                    </text>
                                  );
                                }
                                return null;
                              }
                              return null;
                            }}
                          />
                        )}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <span className="text-body">No chart configuration available</span>
              </div>
            )}
          </div>
 
          {/* Legend Container */}{chartData.length > 0 && (
            <div className={`flex flex-col justify-start sm:col-span-1 md:col-span-1 lg:col-span-1 sm:text-subBody border-l border-border/30 ${marginTop} ${isFullscreen ? 'h-full overflow-visible' : 'h-[230px] overflow-y-auto scrollbar'} w-full pl-4`}>
              <div className={`flex ${direction} md:${direction} sm:${direction} lg:flex-col xl:flex-col mt-4 ${position} gap-3 ${isFullscreen ? 'gap-4' : ''}`}>
                {chartData.length > 0 && chartData?.map((item, index) => {
                  // Dynamically pick label and value using props (with fallback)
                  const label = String(item[nameKey || ""] ?? item.label ?? "");
                  const value = item[dataKey || ""] ?? item.value ?? 0;
                  const isActive = activeLegendIndex === index;
                  const itemColor = item?.fill || chartConfig?.[label]?.color;
 
                  return (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 p-2.5 cursor-pointer transition-all duration-200 rounded-lg border ${isActive ? "bg-gradient-to-r from-muted/40 to-muted/20 border-border/50 scale-105 shadow-sm" : "border-transparent hover:border-border/30 hover:bg-muted/10"}`}
                      onClick={() => {
                        if (legendClickable) {
                          setActiveLegendIndex(index);
                        }
                      }}
                    >
                      <div
                        className={`flex-shrink-0 rounded-lg transition-all duration-200 ${isFullscreen ? "w-6 h-6" : "w-4 h-4"}`}
                        style={{ backgroundColor: itemColor, boxShadow: `0 0 8px ${itemColor}40` }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-foreground truncate ${isFullscreen ? "text-Header" : "text-sm"}`}>
                          {label.charAt(0).toUpperCase() + label.slice(1)}
                        </p>
                        <p className={`font-semibold transition-all duration-200 ${isFullscreen ? "text-lg" : "text-xs"}`} style={{ color: itemColor }}>
                          {displayMode === "percentage" && `${value}%`}
                          {displayMode === "value" && (value.toLocaleString("en-US"))}
                          {displayMode === "both" &&
                            `${(value.toLocaleString("en-US"))} (${item?.percentage ?? value}%)`}
                        </p>
                      </div>
                    </div>
                  );
                })}
 
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-small-font">No Data Found!</span>
        </div>
      )}
      </CardContent>
 
    </Card>
  );
};
 
export default DonutChart;
 
