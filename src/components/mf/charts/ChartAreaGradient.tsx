"use client";
import React from "react";

import { AreaChartSkeleton } from "./ChartSkeletons";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { useRef } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import ChartHeader from "./ChartHeader";
import {
  CustomLegendContent,
  ChartAnimations,
  CustomXAxisTick,
  formatNumber,
  useBarAnimationDelay,
  getBarAnimationStyle,
  getBarHoverDimensions,
  getBarHoverStyle,
} from "@/lib/utils";

export const description = "An area chart with gradient fill";
interface chartData {
  label?: string;
  [key: string]: string | number | undefined;
}

interface chartconfig {
  [key: string]: {
    label?: string;
    color?: string;
  };
}

interface AreagradientChart {
  chartData?: chartData[];
  chartConfig?: chartconfig;
  XaxisLine?: boolean;
  Xdatakey?: string;
  CartesianGridVertical?: boolean;
  isSelect?: boolean;
  handleExportCsv?: () => void;
  handleExportPng?: (title: string, key: string) => void;
  handleExpand?: () => void;
  title?: string;
  titleIcon?: React.ReactNode;
  showHeader?: boolean;
  showExport?: boolean;
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
  animationDuration?: number; // Animation duration in ms for bars and line (default: 1200)
  animationDelayPerPoint?: number;
  animationBegin?: number;
  // Legacy props for backward compatibility
  isRadioButton?: boolean;
  showTickLineX?: boolean;
  showTickLineY?: boolean;
  YaxisLine?: boolean;
  radioOptions?: { value: string; label: string }[];
  selectedRadio?: string;
  isLoading?: boolean;
  exportKey?: string;
  height?: number | string;
  className?: string;
  contentHeight?: number | string;
  chartMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  cardHeight?: number | string;
  cartesianGridColor?: string;
  cartesianGridHorizontal?: boolean;
  cartesianGridVertical?: boolean;
  cartesianGridStrokeDasharray?: string;
  // Hover effect props
  hoverScale?: number; // Scale factor when bar is hovered (default: 1.12)
  hoverBrightness?: number; // Brightness increase on hover (default: 1.15)
  hoverSaturation?: number;
  XAxisHeight?: number;
  tickMarginX?: number;
  tickMarginY?: number;
}

const ChartAreaGradient: React.FC<AreagradientChart> = ({
  chartData = [],
  handleExportCsv,
  handleExportPng,
  handleExpand,
  XAxisHeight = 60,
  showTickLineX = true,
  showTickLineY = true,
  YaxisLine = true,
  showHeader = true,
  showExport = true,
  frequencyShow = true,
  chartConfig,
  Xdatakey = "month",
  CartesianGridVertical = true,
  animationDuration = 600,
  titleIcon,
  animationDelayPerPoint = 120,
  animationBegin = 200,
  XaxisLine = true,
  title,
  isLoading = false,
  exportKey = "",
  height = "11rem",
  chartMargins = { top: 10, right: 40, left: -10, bottom: -20 },
  className = "",
  contentHeight = "11rem",
  cardHeight = "",
  filterType,
  filterOptions = [],
  selectedFilterValue,
  handleFilterChange,
  filterPlaceholder,
  filterClassName,
  frequencyOptions = [],
  selectedFrequency,
  handleFrequencyChange,
  cartesianGridColor = "grey",
  cartesianGridHorizontal = true,
  cartesianGridVertical = false,
  cartesianGridStrokeDasharray = "2 2",
  hoverScale = 1.12,
  hoverBrightness = 1.15,
  hoverSaturation = 1.1,
  frequencyPlaceholder,
  tickMarginX = 10,
  tickMarginY = 10,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const chartHeight =
    typeof height === "number"
      ? height
      : typeof height === "string"
        ? height.endsWith("rem")
          ? Number.parseFloat(height) * 17
          : Number.parseFloat(height)
        : 200;

  const barWidth = 100;
  const chartWidth = chartData?.length * barWidth;

  const labels = Object.values(chartConfig || {})
    .map((config) => config?.label)
    .filter((label): label is string => Boolean(label));
  const colors = Object.values(chartConfig || {}).map(
    (config) => config?.color || "#3b82f6"
  );

  return (
    <Card
      ref={cardRef}
      className={`w-full h-full shadow-md rounded-lg dark:bg-card ${className}`}
      style={{
        height: typeof cardHeight === "number" ? `${cardHeight}px` : cardHeight,
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
          <div style={{ height: chartHeight }}>
            <AreaChartSkeleton />
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <ChartAnimations />
              <ChartContainer
                config={chartConfig || {}}
                className="relative w-full p-0"
                // style={{ height: chartHeight }}
              >
                <div
                  style={{
                    ...(chartWidth
                      ? { minWidth: `${chartWidth}px` }
                      : { width: "100%" }),
                  }}
                >
                  <ResponsiveContainer className="-mt-1" width="100%" height={chartHeight}>
                    <AreaChart
                      data={chartData || []}
                      margin={chartMargins}
                      height={chartHeight}
                      width={chartWidth || 800}
                    >
                      <CartesianGrid
                        vertical={cartesianGridVertical}
                        horizontal={cartesianGridHorizontal}
                        stroke={cartesianGridColor}
                        strokeDasharray={cartesianGridStrokeDasharray}
                      />

                      <XAxis
                        dataKey={Xdatakey}
                        tickLine={showTickLineX}
                        axisLine={XaxisLine}
                        tickMargin={tickMarginX}
                        height={XAxisHeight}
                        interval={0}
                        angle={0}
                        textAnchor="end"
                        style={{ fontSize: "12px" }}
                        tick={<CustomXAxisTick />}
                      />
                      <YAxis
                        tickLine={showTickLineY}
                        axisLine={YaxisLine}
                        tickMargin={tickMarginY}
                        tickCount={5}
                        style={{ fontSize: "12px" }}
                        domain={[0, "dataMax + 100"]}
                        tickFormatter={(value: number) => formatNumber(value)}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
                      />

                      <defs>
                        {chartConfig &&
                          Object.entries(chartConfig).map(([key, config]) => (
                            <linearGradient
                              key={key}
                              id={`fill${key}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={config?.color || "#3b82f6"}
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor={config?.color || "#3b82f6"}
                                stopOpacity={0.1}
                              />
                            </linearGradient>
                          ))}
                      </defs>

                      {chartConfig &&
                        Object.entries(chartConfig).map(([key, config]) => (
                          <Area
                            key={key}
                            dataKey={key}
                            type="monotone"
                            fill={`url(#fill${key})`}
                            fillOpacity={0.7}
                            stroke={config?.color || "#3b82f6"}
                            stackId="a"
                            isAnimationActive
                            animationBegin={animationBegin}
                            animationDuration={animationDuration}
                            animationEasing="ease-out"
                          />
                        ))}
                    </AreaChart>
                  </ResponsiveContainer>
                  {chartData?.length > 0 && (
                    <div className="w-full overflow-x-auto -mt-2 overflow-y-hidden">
                      <div className="flex gap- justify-center items-center min-w-max">
                        <CustomLegendContent labels={labels} colors={colors} />
                      </div>
                    </div>
                  )}
                </div>
              </ChartContainer>
            </div>
          
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartAreaGradient;
