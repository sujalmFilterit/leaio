"use client";
import React, { useRef, Dispatch, SetStateAction, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  createExpandHandler,
  createPngExportHandler,
  exportCsvFromUrl,
} from "@/lib/utils";
import DonutChart from "@/components/mf/charts/DonutChart";
import ChartAreaGradient from "@/components/mf/charts/ChartAreaGradient";
import ProgressBarChart from "@/components/mf/charts/ProgressBarChart";
import StackedBarChart from "@/components/mf/charts/stackedBarChart";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";
import {
  useFraudCategories,
  useFraudSubCategoryProgressBar,
  useDateWiseFraudSubCategory,
  usePublisherWiseFraudSubCategory,
  type DashboardPayload,
} from "../../hooks/useDashboard";

interface InDepthAnomalyAnalysisProps {
  // Fraud Categories Donut Chart
  donutData: any[];
  donutConfig: any;
  fraudStatsLoading: boolean;
  isExportingFraudCategories: boolean;
  onDonutSegmentClick: (data: any) => void;
  refetchFraudCategories: () => void;

  // Progress Bar Chart
  progressBarData: any[];
  progressBarLoading: boolean;
  isExportingProgressBar: boolean;
  refetchProgressBar: () => void;

  // Area Chart
  areaChartData1: any[];
  areaBarConfig: any;
  areaChartApiLoading: boolean;
  isExportingAreaChart: boolean;
  refetchAreaChart: () => void;

  // Reattribution Chart
  reattributionChartData: any[];
  reattributionStackedBarConfig: any;
  reattributionLoading: boolean;
  isExportingReattribution: boolean;
  refetchReattribution: () => void;

  // Common props
  onclickvalue: string;
  selectedRadio1: "Publisher" | "Vendor";
  setSelectedRadio1: (value: "Publisher" | "Vendor") => void;
  isInitialLoading: boolean;
  cardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  expandedCard: string | null;
  setExpandedCard: Dispatch<SetStateAction<string | null>>;
  
  // Export props
  baseDashboardPayload: DashboardPayload;
  selectedType: "install" | "event";
  setExporting: React.Dispatch<React.SetStateAction<{
    fraudCategories: boolean;
    progressBar: boolean;
    reattribution: boolean;
    dwTrend: boolean;
    publisherVendor: boolean;
    areaChart: boolean;
    splitOfSources: boolean;
  }>>;
}

const InDepthAnomalyAnalysis: React.FC<InDepthAnomalyAnalysisProps> = ({
  donutData,
  donutConfig,
  fraudStatsLoading,
  isExportingFraudCategories,
  onDonutSegmentClick,
  refetchFraudCategories,
  progressBarData,
  progressBarLoading,
  isExportingProgressBar,
  refetchProgressBar,
  areaChartData1,
  areaBarConfig,
  areaChartApiLoading,
  isExportingAreaChart,
  refetchAreaChart,
  reattributionChartData,
  reattributionStackedBarConfig,
  reattributionLoading,
  isExportingReattribution,
  refetchReattribution,
  onclickvalue,
  selectedRadio1,
  setSelectedRadio1,
  isInitialLoading,
  cardRefs,
  expandedCard,
  setExpandedCard,
  baseDashboardPayload,
  selectedType,
  setExporting,
}) => {
  // Export payloads
  const fraudCategoriesExportPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!baseDashboardPayload || !isExportingFraudCategories) {
      return undefined;
    }
    return {
      ...baseDashboardPayload,
      export_type: "csv",
    };
  }, [baseDashboardPayload, isExportingFraudCategories]);

  const progressBarExportPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!baseDashboardPayload || !isExportingProgressBar) {
      return undefined;
    }
    return {
      ...baseDashboardPayload,
      category: onclickvalue || "Click Fraud",
      export_type: "csv",
    };
  }, [baseDashboardPayload, isExportingProgressBar, onclickvalue]);

  const areaChartExportPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!baseDashboardPayload || !isExportingAreaChart) {
      return undefined;
    }
    return {
      ...baseDashboardPayload,
      category: onclickvalue || "Click Fraud",
      frequency: "daily",
      export_type: "csv",
    };
  }, [baseDashboardPayload, isExportingAreaChart, onclickvalue]);

  const reattributionExportPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!baseDashboardPayload || !isExportingReattribution) {
      return undefined;
    }
    return {
      ...baseDashboardPayload,
      category: onclickvalue || "Click Fraud",
      type: selectedRadio1 === "Vendor" ? "agency" : "publisher",
      export_type: "csv",
    };
  }, [baseDashboardPayload, isExportingReattribution, onclickvalue, selectedRadio1]);

  // Export API hooks
  const { data: fraudCategoriesExportData } = useFraudCategories(
    selectedType,
    fraudCategoriesExportPayload,
    !!fraudCategoriesExportPayload
  );

  const { data: progressBarExportData } = useFraudSubCategoryProgressBar(
    selectedType,
    progressBarExportPayload as DashboardPayload,
    !!progressBarExportPayload
  );

  const { data: areaChartExportData } = useDateWiseFraudSubCategory(
    selectedType,
    areaChartExportPayload as DashboardPayload,
    !!areaChartExportPayload
  );

  const { data: reattributionExportData } = usePublisherWiseFraudSubCategory(
    selectedType,
    reattributionExportPayload as DashboardPayload,
    !!reattributionExportPayload
  );

  // Handle CSV export responses
  useEffect(() => {
    if (fraudCategoriesExportData?.url) {
      exportCsvFromUrl({
        url: fraudCategoriesExportData.url,
        filename: "Fraud Categories",
        onSuccess: () => {
          setExporting((prev) => ({ ...prev, fraudCategories: false }));
        },
      });
    }
  }, [fraudCategoriesExportData, setExporting]);

  useEffect(() => {
    if (progressBarExportData?.url) {
      exportCsvFromUrl({
        url: progressBarExportData.url,
        filename: "Fraud Sub Categories Progress Bar",
        onSuccess: () => {
          setExporting((prev) => ({ ...prev, progressBar: false }));
        },
      });
    }
  }, [progressBarExportData, setExporting]);

  useEffect(() => {
    if (areaChartExportData?.url) {
      exportCsvFromUrl({
        url: areaChartExportData.url,
        filename: "Date Wise Fraud Sub Categories",
        onSuccess: () => {
          setExporting((prev) => ({ ...prev, areaChart: false }));
        },
      });
    }
  }, [areaChartExportData, setExporting]);

  useEffect(() => {
    if (reattributionExportData?.url) {
      exportCsvFromUrl({
        url: reattributionExportData.url,
        filename: `${selectedRadio1 === "Publisher" ? "Publisher" : "Agency"} Wise Fraud Sub Categories`,
        onSuccess: () => {
          setExporting((prev) => ({ ...prev, reattribution: false }));
        },
      });
    }
  }, [reattributionExportData, setExporting, selectedRadio1]);

  return (
    <>
      {/* Modern Card Container with Glassmorphism */}
      <div className=" flex flex-col  w-full backdrop-blur-lg bg-background/80 dark:bg-card/80 border border-border/40 rounded-xl shadow-lg p-2 transition-all duration-300">
        <div className="w-full space-y-2">
          {/* Modern Section Header */}
          <div className="w-full">
            <div className="flex items-center justify-center gap-2">
              <div className="h-8 w-1 bg-gradient-to-b from-primary to-secondary rounded-full" />

              <h2 className="text-lg sm:text-xl font-bold text-foreground gradient-text">
                In-Depth Anomaly Analysis
              </h2>
              <div className="h-8 w-1 bg-gradient-to-b from-secondary to-primary rounded-full" />
            </div>
          </div>

          {/* Charts Grid */}
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 w-full gap-2 transition-all duration-300">
              {/* Fraud Categories Donut Chart */}
              <div
                ref={(el) => {
                  if (el) cardRefs.current["fraud_categories"] = el;
                }}
                className="transition-all duration-300 hover:shadow-xl"
              >
                <DonutChart
                  chartData={donutData}
                  chartConfig={donutConfig}
                  title="Fraud Categories"
                  titleIcon={<PieChart className="w-4 h-4 text-primary" />}
                  handleExportCsv={() => {
                    setExporting((prev) => ({ ...prev, fraudCategories: true }));
                  }}
                  handleExportPng={createPngExportHandler({
                    cardRefs,
                    key: "fraud_categories",
                    filename: "Fraud Categories",
                  })}
                  handleExpand={createExpandHandler({
                    key: "fraud_categories",
                    cardRefs,
                    expandedCard,
                    setExpandedCard,
                  })}
                  exportKey="fraud_categories"
                  isLoading={fraudStatsLoading || isInitialLoading}
                  dataKey="visit"
                  nameKey="label"
                  isView={true}
                  direction="flex-col"
                  isdonut={false}
                  marginTop="mt-0"
                  position="items-start"
                  isPercentage={false}
                  isPercentageValue={true}
                  istotalvistors={false}
                  onSegmentClick={onDonutSegmentClick}
                  cardHeight="19.6875rem"
                  contentHeight="14.375rem"
                  displayMode="both"
                />
              </div>

              {/* Progress Bar Chart */}
              <div
                ref={(el) => {
                  if (el) cardRefs.current["fraud_sub_categories"] = el;
                }}
                className="col-span-2 transition-all duration-300 hover:shadow-xl"
              >
                <ProgressBarChart
                  cardHeight="19.6875rem"
                  contentHeight="14.375rem"
                  chartData={progressBarData}
                  title={`Fraud Sub Categories for ${onclickvalue ? `${onclickvalue}` : "Click Fraud"}`}
                  titleIcon={<BarChart3 className="w-4 h-4 text-primary" />}
                  isLoading={progressBarLoading || isInitialLoading}
                  handleExportCsv={() => {
                    setExporting((prev) => ({ ...prev, progressBar: true }));
                  }}
                  handleExpand={createExpandHandler({
                    key: "fraud_sub_categories",
                    cardRefs,
                    expandedCard,
                    setExpandedCard,
                  })}
                  handleExportPng={createPngExportHandler({
                    cardRefs,
                    key: "fraud_sub_categories",
                    filename: "Fraud Sub Categories",
                  })}
                  exportKey="fraud_sub_categories"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Date Wise & Publisher/Vendor Analysis */}
        <div className="w-full mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Area Chart */}
            <div
              ref={(el) => {
                if (el) cardRefs.current["date_wise_fraud_sub_categories"] = el;
              }}
              className="transition-all duration-300 h-auto hover:shadow-xl"
            >
              <ChartAreaGradient
                chartData={areaChartData1}
                chartConfig={areaBarConfig}
                XaxisLine={true}
                Xdatakey="label"
                CartesianGridVertical={true}
                title={`Date Wise Fraud Sub Categories For ${onclickvalue ? `${onclickvalue}` : "Click Fraud"}`}
                titleIcon={<TrendingUp className="w-4 h-4 text-primary" />}
                handleExportCsv={() => {
                  setExporting((prev) => ({ ...prev, areaChart: true }));
                }}
                handleExpand={createExpandHandler({
                  key: "date_wise_fraud_sub_categories",
                  cardRefs,
                  expandedCard,
                  setExpandedCard,
                })}
                handleExportPng={createPngExportHandler({
                  cardRefs,
                  key: "date_wise_fraud_sub_categories",
                  filename: "Date Wise Fraud Sub Categories",
                })}
                exportKey="date_wise_fraud_sub_categories"
                isLoading={areaChartApiLoading || isInitialLoading}
                cardHeight="18rem"
                height="12rem"
                contentHeight="11rem"
                chartMargins={{ top: 0, right: -10, left: -10, bottom: 0 }}
              />
            </div>

            {/* Stacked Bar Chart */}
            <div>
              <StackedBarChart
                ref={(el) => {
                  if (el)
                    cardRefs.current["publisher_vendor_fraud_sub_categories"] =
                      el;
                }}
                chartData={reattributionChartData}
                chartConfig={reattributionStackedBarConfig}
                title={
                  selectedRadio1 === "Publisher"
                    ? `Publisher Wise Fraud Sub Categories For ${onclickvalue ? `${onclickvalue}` : "Click Fraud"}`
                    : `Agency Wise Fraud Sub Categories For ${onclickvalue ? `${onclickvalue}` : "Click Fraud"} Trend`
                }
                titleIcon={
                  selectedRadio1 === "Publisher" ? (
                    <Users className="w-4 h-4 text-primary" />
                  ) : (
                    <Building2 className="w-4 h-4 text-primary" />
                  )
                }
                handleExportCsv={() => {
                  setExporting((prev) => ({ ...prev, reattribution: true }));
                }}
                handleExportPng={createPngExportHandler({
                  cardRefs,
                  key: "publisher_vendor_fraud_sub_categories",
                  filename: `${selectedRadio1 === "Publisher" ? "Publisher" : "Agency"} Wise Fraud Sub Categories`,
                })}
                handleExpand={createExpandHandler({
                  key: "publisher_vendor_fraud_sub_categories",
                  cardRefs,
                  expandedCard,
                  setExpandedCard,
                })}
                exportKey="publisher_vendor_fraud_sub_categories"
                isLoading={reattributionLoading || isInitialLoading}
                isHorizontal={true}
                isInformCard={false}
                isLegend={true}
                isCartesian={true}
                yAxis={{ dataKey: "label" }}
                AxisLabel="Count"
                filterType="radio"
                filterOptions={[
                  { value: "Publisher", label: "Publisher" },
                  { value: "Vendor", label: "Agency" },
                ]}
                selectedFilterValue={selectedRadio1}
                handleFilterChange={(value: string | string[]) =>
                  setSelectedRadio1(value as "Publisher" | "Vendor")
                }
                showMenu={true}
                barHeight="13rem"
                cardHeight="18rem"
                chartMargins={{ top: 0, right: -10, left: -10, bottom: 0 }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InDepthAnomalyAnalysis;
