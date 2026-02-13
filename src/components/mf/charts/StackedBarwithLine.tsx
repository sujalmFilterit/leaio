"use client";

import type * as React from "react";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  formatNumber,
  getRightAxisTickFormatter,
  CustomLegendContent,
  ChartAnimations,
  labelFormatter,
  ClickableXAxisTick,
  ClickableYAxisTick,
} from "@/lib/utils";
import { StackedBarChartSkeleton } from "./ChartSkeletons";

import ChartHeader from "./ChartHeader";

interface TrafficTrendData {
  label?: string;
  clean_count?: number;
  fraud_count?: number;
  fraud_percentage?: string | number;
  visit?: number;
  price?: number | string;
}

interface StackBarLineProps {
  chartData?: TrafficTrendData[];
  chartConfig?: {
    [key: string]: {
      label: string;
      color: string;
    };
  }
  handleExportCsv?: () => void; 
  handleExportPng?: (title: string, key: string) => void; 
  handleExpand?: () => void; 
  exportKey?: string;
  title?: string;
  titleIcon?: React.ReactNode;
  showHeader?: boolean;
  showExport?: boolean; 
  frequencyShow?: boolean;
  frequencyOptions?: string[];
  selectedFrequency?: string;
  handleFrequencyChange?: (value: string) => void;
  frequencyPlaceholder?: string;
  filterType?: "radio" | "single-select" | "multi-select";
  filterOptions?: { value: string; label: string }[];
  selectedFilterValue?: string | string[]; 
  handleFilterChange?: (value: string | string[]) => void;
  filterPlaceholder?: string;
  filterClassName?: string;
  selectedRadio?: string;
  isLoading?: boolean;
  isLegend?: boolean;
  legendPosition?: "top" | "bottom";
  rightAxisType?: "percentage" | "price" | "number";
  showLeftAxis?: boolean;
  showRightAxis?: boolean;
  barHeight?: number | string;
  cardHeight?: number | string; 
  className?: string; 
  contentHeight?: number | string;
  barWidth?: number; // Width per data point for chart width calculation (default: 40)
  barSize?: number; // Individual bar width in pixels (default: 60)
  barGap?: number;
  barRadius?: number; // Bar corner radius - simple number for all corners 
  animationDuration?: number; // Animation duration in ms for bars and line (default: 1200)
  animationDelayPerPoint?: number; // Delay between each point appearing in ms (default: 200)
  showAxisLine?: boolean;
  showTickLine?: boolean;
  xAxisAngle?: number; // Angle for X-axis labels (default: 0, use negative for slant left e.g. -45)
  cartesianGridColor?: string;
  cartesianGridHorizontal?: boolean;
  cartesianGridVertical?: boolean;
  cartesianGridStrokeDasharray?: string;
  // Hover effect props
  hoverScale?: number; // Scale factor when bar is hovered (default: 1.12)
  hoverBrightness?: number; // Brightness increase on hover (default: 1.15)
  hoverSaturation?: number; // Saturation increase on hover (default: 1.1)
  
  chartMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  // Click handler - sends clicked data to parent
  onDataClick?: (data: any, index: number, dataKey: string) => void;
}

const StackedBarWithLine1: React.FC<StackBarLineProps> = ({
  chartData = [],
  chartConfig = {},
  handleExportCsv,
  handleExportPng,
  handleExpand,
  exportKey = "",
  title = "",
  titleIcon,
  showHeader = true,
  showExport = true,
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
  filterClassName = "w-[7.5rem] h-[1.875rem]",
  isLoading = false,
  isLegend = true,
  legendPosition = "bottom",
  rightAxisType = "percentage",
  showLeftAxis = true,
  showRightAxis = false,
  barHeight = 180,
  cardHeight,
  className = "",
  contentHeight = "20rem",
  barWidth = 40,
  barSize = 60,
  barGap = 50,
  animationDuration = 1200,
  showAxisLine = true,
  showTickLine = true,
  xAxisAngle = 0,
  chartMargins = { top: 12, right: 50, left: 0, bottom: 4 },
  onDataClick,
  cartesianGridColor = "grey",
  cartesianGridHorizontal = true,
  cartesianGridVertical = false,
  cartesianGridStrokeDasharray = "2 2",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Convert barHeight to number for ResponsiveContainer
  const chartHeight = useMemo(() => {
    if (typeof barHeight === "number") {
      return barHeight;
    }
    // Handle string values like "11rem", "180px", etc.
    const numericValue = parseFloat(barHeight);
    if (!isNaN(numericValue)) {
      if (barHeight.includes("rem")) {
        return numericValue * 16;
      }
      return numericValue;
    }
    return 180; // Default fallback
  }, [barHeight]);

  // 🔄 Convert fraud_percentage string to number and parse price strings
  const ChartData = useMemo(() => {
    return chartData?.map((item) => {
      const processedItem = {
        ...item,
        fraud_percentage:
          typeof item?.fraud_percentage === "string"
            ? Number.parseFloat(item?.fraud_percentage)
            : item?.fraud_percentage,
      };

      // Parse price string if it exists (handles formats like "₹211", "$123", etc.)
      if (typeof item.price === "string") {
        // Remove currency symbols and convert to number
        const priceString = item?.price?.replace(/[₹$€£¥,]/g, "");
        processedItem.price = Number.parseFloat(priceString) || 0;
      }

      return processedItem;
    });
  }, [chartData]);

  const chartWidth =
    ChartData.length * (barWidth + barGap)
  const labels = Object.values(chartConfig)
    .map((item) => item.label)
    .filter((label): label is string => Boolean(label));
  const colors = Object?.values(chartConfig)?.map((item) => item?.color);

  // Determine which key should be used for the line (right Y-axis)
  const getLineKey = () => {
    if (rightAxisType === "price" && chartConfig?.price) {
      return "price";
    }
    if (rightAxisType === "percentage" && chartConfig?.fraud_percentage) {
      return "fraud_percentage";
    }
    // Fallback: find any key that's not used for bars
    const barKeys = Object?.keys(chartConfig)?.filter(
      (key) => key !== "fraud_percentage" && key !== "price"
    );
    const lineKeys = Object?.keys(chartConfig)?.filter(
      (key) => !barKeys?.includes(key)
    );
    return lineKeys[0] || "fraud_percentage";
  };

  const lineKey = getLineKey();

  return (
    <Card
        ref={cardRef}
        className={`w-full shadow-md rounded-lg dark:bg-card ${className}`}
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
        handleExportCsv={handleExportCsv}
        handleExportPng={handleExportPng}
        handleExpand={handleExpand}
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
        className="w-full p-4"
        style={{
          height:
            typeof contentHeight === "number"
              ? `${contentHeight}px`
              : contentHeight,
        }}
      >
        {isLoading ? (
          <div className="w-full">
            <StackedBarChartSkeleton height={`${chartHeight}px`} />
          </div>
        ) : (
          <>
            {/* Legend at top if specified */}
            {ChartData?.length > 0 &&
              isLegend &&
              legendPosition === "top" && (
                <div className="w-full mb-4 flex-shrink-0">
                  <CustomLegendContent labels={labels} colors={colors} />
                </div>
              )}

            {/* Chart container with horizontal scroll */}
            <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <ChartAnimations />
              <ChartContainer
                config={chartConfig}
                className="relative w-full p-0"
                style={{
                  height: typeof barHeight === "number" ? `${barHeight}px` : barHeight,
                }}
              >
                <div
                  style={{
                    ...(chartWidth
                      ? { minWidth: `${chartWidth}px` }
                      : { width: "100%" }),
                  }}
                >
                  <ResponsiveContainer 
                    width="100%"
                    height={chartHeight}
                  >
                    {ChartData?.length > 0 ? (
                      <ComposedChart
                        data={ChartData}
                        margin={chartMargins}
                        barGap={barGap}
                      >
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" labelFormatter={labelFormatter} />}
                        />
                        <CartesianGrid vertical={cartesianGridVertical} horizontal={cartesianGridHorizontal} stroke={cartesianGridColor} strokeDasharray={cartesianGridStrokeDasharray} />

                        <XAxis
                          dataKey="label"
                          interval={0}
                          tickLine={showTickLine}
                          axisLine={showAxisLine}
                          textAnchor="middle"
                          stroke="grey"
                          tick={<ClickableXAxisTick angle={xAxisAngle} chartData={ChartData} onDataClick={onDataClick} />}
                        />

                        {showLeftAxis && (
                          <YAxis
                            yAxisId="left"
                            orientation="left"
                            axisLine={showAxisLine}
                            tickLine={showTickLine}
                            stroke="grey"
                            tickFormatter={(value: number) =>
                              formatNumber(value)
                            }
                            tick={<ClickableYAxisTick yAxisId="left" rightAxisType={rightAxisType} onDataClick={onDataClick} />}
                          />
                        )}
                        {showRightAxis && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={showAxisLine}
                            tickLine={showTickLine}
                            stroke="grey"
                            tickFormatter={(value: number) =>
                              getRightAxisTickFormatter(value, rightAxisType)
                            }
                            tick={<ClickableYAxisTick yAxisId="right" rightAxisType={rightAxisType} onDataClick={onDataClick} />}
                          />
                        )}

                        {(() => {
                          const barKeys = Object.keys(chartConfig).filter(key => key !== lineKey);
                          const totalBars = barKeys.length;
                          
                          return barKeys.map((key, index) => {
                            const isTopBar = index === totalBars - 1; // Last bar is the top bar
                            
                            return (
                              <Bar
                                key={index}
                                dataKey={key}
                                stackId="stackedbar"// dont remove this stack id
                                fill={chartConfig[key]?.color}
                                yAxisId={
                                  showLeftAxis
                                    ? "left"
                                    : showRightAxis
                                    ? "right"
                                    : "left"
                                }
                                barSize={barSize}
                                isAnimationActive={true}
                                animationBegin={0}
                                animationDuration={animationDuration}
                                animationEasing="ease-out"
                               
                              />
                            );
                          });
                        })()}

                        {Object?.keys(chartConfig)?.map((key, index) => {
                          if (key === lineKey) {
                            return (
                              <Line
                                key={index}
                                type="monotone"
                                dataKey={key}
                                stroke={chartConfig[key]?.color}
                                strokeWidth={2}
                              dot={(props: any) => {
                                const { cx, cy, payload, index: dotIndex } = props;
                                // Return invisible circle if coordinates are invalid
                                if (cx == null || cy == null) {
                                  return <circle cx={0} cy={0} r={0} fill="transparent" />;
                                }
                                
                                const dataIndex = ChartData.findIndex(
                                  (item) => item === payload
                                );
                                const isHovered = hoveredIndex === dataIndex || hoveredIndex === dotIndex;
                                
                                return (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={isHovered ? 5 : 1}
                                    fill={chartConfig[key]?.color}
                                    stroke={isHovered ? "#fff" : chartConfig[key]?.color}
                                    strokeWidth={isHovered ? 2 : 0}
                                    style={{ 
                                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                      cursor: "pointer"
                                    }}
                                    onMouseEnter={() => {
                                      if (dataIndex !== -1) {
                                        setHoveredIndex(dataIndex);
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      setHoveredIndex(null);
                                    }}
                                    onClick={() => {
                                      if (dataIndex !== -1) {
                                        console.log("Line point clicked:", { data: payload, index: dataIndex, dataKey: key });
                                        if (onDataClick) {
                                          onDataClick(payload, dataIndex, key);
                                        }
                                      }
                                    }}
                                  />
                                );
                              }}
                              activeDot={{
                                r: 5,
                                strokeWidth: 2,
                                stroke: "#fff",
                              }}
                              yAxisId={
                                showRightAxis
                                  ? "right"
                                  : showLeftAxis
                                  ? "left"
                                  : "left"
                              }
                              isAnimationActive={true}
                              animationBegin={0}
                              animationDuration={animationDuration}
                              animationEasing="ease-out"
                            />
                          );
                          }
                          return null;
                        })}
                      </ComposedChart>
                    ) : (
                      <div className="flex items-center justify-center h-full w-full">
                        <span className="text-small-font font-medium text-black dark:text-white">
                          No Data Found!
                        </span>
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            </div>
            {ChartData?.length > 0 &&
              isLegend &&
              legendPosition === "bottom" && (
                <div className="w-full overflow-x-auto overflow-y-hidden mt-2 mb-2 sm:mb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex gap-4 justify-center items-center min-w-max">
                  <CustomLegendContent labels={labels} colors={colors} />
                </div>
              </div>
              )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StackedBarWithLine1;
