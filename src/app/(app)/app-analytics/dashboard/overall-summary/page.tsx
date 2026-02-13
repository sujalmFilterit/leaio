"use client";
import React, { useState, useMemo, useRef, useEffect, lazy } from "react";
import StackedBarWithLine from "@/components/mf/charts/StackedBarwithLine";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import DonutChart from "@/components/mf/charts/DonutChart";
import StatsCards from "@/components/mf/StatsCards";
const Publisher = lazy(() => import("./Publisher"));
const InDepthAnomalyAnalysis = lazy(() => import("./InDepthAnomalyAnalysis"));
const AnalysisInsights = lazy(() => import("./AnalysisInsights"));
import { Filter } from "@/components/mf/Filters/Filter";
import { MobileFilterSidebar } from "@/components/mf/Filters/MobileFilterSidebar";
import { ToggleButton } from "@/components/mf/ToggleButton";
import { Checkbox } from "@/components/ui/checkbox";
import LazyComponentWrapper from "@/components/mf/LazyComponentWrapper";
import {
  PieChart,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  Filter as FilterIcon,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Hooks (API calls)
import {
  useTotalPercentage,
  useDateWiseTrend,
  usePublisherVendorTrend,
  useSplitOfSources,
  useFraudCategories,
  useFraudSubCategoryProgressBar,
  useDateWiseFraudSubCategory,
  usePublisherWiseFraudSubCategory,
  type DashboardPayload,
  type FilterPayload,
} from "../../hooks/useDashboard";
import { COLOR_PALETTE, CHART_COLORS, getPercentageKey } from "./constants";

import { Button } from "@/components/ui/button";
import {
  createExpandHandler,
  createPngExportHandler,
  exportCsvFromUrl,
} from "@/lib/utils";
import { createDashboardFilters } from "../../hooks/filterConfigHelpers";
import { useAppAnalyticsFilters } from "../../hooks/useAppAnalyticsFilters";

const Dashboard = () => {
  const { selectedPackage, isPackageLoading } = usePackage();
  const { startDate, endDate } = useDateRange();
  const [selectedType, setSelectedType] = useState<"install" | "event">(
    "install"
  );
  const [publisherVendorFilter, setPublisherVendorFilter] = useState<
    "Publisher" | "Vendor"
  >("Publisher");
  const [onclickvalue, setonclickvalue] = useState("");
  const [conversionvalue, setConversionvalue] = useState<boolean>(false);
  const [dwTrendSelectedFrequency, setDwTrendSelectedFrequency] =
    useState("Daily");
  // Mobile filter sidebar state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Export states grouped
  const [exporting, setExporting] = useState({
    fraudCategories: false,
    progressBar: false,
    reattribution: false,
    dwTrend: false,
    publisherVendor: false,
    areaChart: false,
    splitOfSources: false,
  });

  // Refs
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  const baseFilterPayload = {
    package_name: selectedPackage,
    start_date: startDate,
    end_date: endDate,
  };

  // Use centralized filter hook with dynamic configuration
  const filterConfigs = useMemo(
    () => createDashboardFilters(selectedType),
    [selectedType]
  );

  const {
    query,
    filterData,
    filterConfig,
    resetFilters,
    handlePublisherFilterChange,
    handleOtherFiltersChange,
  } = useAppAnalyticsFilters(filterConfigs, baseFilterPayload);

  const baseDashboardPayload = {
    start_date: startDate,
    end_date: endDate,
    package_name: selectedPackage,
    publisher: query.publishers,
    vendor_id: query.agency,
    campaign_id: query.campaigns,
    country: query.country,
    ...(selectedType === "event" && {
      event_type: query.event_type,
      useConversionDate: conversionvalue,
    }),
  };

  // Progress Bar API Payload (after baseDashboardPayload)
  const progressBarPayload = {
    ...baseDashboardPayload,
    category: onclickvalue || "Click Fraud",
  };

  // Reattribution API Payload (after baseDashboardPayload)
  const reattributionPayload = {
    ...baseDashboardPayload,
    category: onclickvalue || "Click Fraud",
    type: publisherVendorFilter === "Vendor" ? "agency" : "publisher",
  };

  // Date Wise Trend API Payload
  const dwTrendFrequencyMap: Record<string, string> = {
    Daily: "daily",
    Weekly: "weekly",
    Monthly: "monthly",
  };
  const dwTrendPayload = {
    ...baseDashboardPayload,
    frequency: dwTrendFrequencyMap[dwTrendSelectedFrequency] || "daily",
  };

  // Publisher Vendor Trend API Payload
  const publisherVendorPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!baseDashboardPayload) {
      return undefined;
    }
    return {
      ...baseDashboardPayload,
      frequency: publisherVendorFilter === "Publisher" ? "publisher" : "agency",
    };
  }, [baseDashboardPayload, publisherVendorFilter]);

  // CSV Export Payloads
  const splitOfSourcesExportPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!baseDashboardPayload || !exporting.splitOfSources) {
      return undefined;
    }
    return {
      ...baseDashboardPayload,
      export_type: "csv",
    };
  }, [baseDashboardPayload, exporting.splitOfSources]);

  const dateWiseTrendExportPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!dwTrendPayload || !exporting.dwTrend) {
      return undefined;
    }
    return {
      ...dwTrendPayload,
      export_type: "csv",
    };
  }, [dwTrendPayload, exporting.dwTrend]);

  const publisherVendorTrendExportPayload = useMemo<DashboardPayload | undefined>(() => {
    if (!publisherVendorPayload || !exporting.publisherVendor) {
      return undefined;
    }
    return {
      ...publisherVendorPayload,
      export_type: "csv",
    };
  }, [publisherVendorPayload, exporting.publisherVendor]);

  // Date Wise Fraud Sub Category API Payload
  const areaChartPayload = {
    ...baseDashboardPayload,
    category: onclickvalue || "Click Fraud",
    frequency: "daily",
  };

  // Progress Bar API Hook
  const {
    data: progressBarDataResponse,
    isLoading: isLoadingProgressBar,
    refetch: refetchProgressBar,
  } = useFraudSubCategoryProgressBar(
    selectedType,
    progressBarPayload as DashboardPayload,
    !!progressBarPayload
  );

  // Reattribution API Hook
  const {
    data: reattributionData,
    isLoading: isLoadingReattribution,
    refetch: refetchReattribution,
  } = usePublisherWiseFraudSubCategory(
    selectedType,
    reattributionPayload as DashboardPayload,
    !!reattributionPayload
  );

  // Date Wise Trend API Hook
  const dwTrendSelectOptions = ["Daily", "Weekly", "Monthly"];
  const {
    data: dwTrendData,
    isLoading: isLoadingDwTrend,
    refetch: refetchDwTrend,
  } = useDateWiseTrend(
    selectedType,
    dwTrendPayload as DashboardPayload,
    !!dwTrendPayload
  );

  // Publisher Vendor Trend API Hook
  const {
    data: publisherVendorData,
    isLoading: isLoadingPublisherVendor,
    refetch: refetchPublisherVendor,
  } = usePublisherVendorTrend(
    selectedType,
    publisherVendorPayload,
    !!publisherVendorPayload && !exporting.publisherVendor
  );

  // Total Percentage API Hook
  const { data: totalPercentageData, isLoading: isLoadingTotalPercentage } =
    useTotalPercentage(
      selectedType,
      baseDashboardPayload,
      !!baseDashboardPayload
    );

  // Split of Sources API Hook
  const {
    data: splitOfSourcesData,
    isLoading: isLoadingSplitOfSources,
    refetch: refetchSplitOfSources,
  } = useSplitOfSources(
    selectedType,
    baseDashboardPayload,
    !!baseDashboardPayload
  );

  // CSV Export API Hooks
  const {
    data: splitOfSourcesExportData,
  } = useSplitOfSources(
    selectedType,
    splitOfSourcesExportPayload,
    !!splitOfSourcesExportPayload
  );

  const {
    data: dateWiseTrendExportData,
  } = useDateWiseTrend(
    selectedType,
    dateWiseTrendExportPayload as DashboardPayload,
    !!dateWiseTrendExportPayload
  );

  const {
    data: publisherVendorTrendExportData,
  } = usePublisherVendorTrend(
    selectedType,
    publisherVendorTrendExportPayload,
    !!publisherVendorTrendExportPayload
  );

  console.log("loading checking", isLoadingSplitOfSources, isPackageLoading);

  // Compute split of sources chart data and config from API response
  const { splitOfSourcesChartData, splitOfSourcesChartConfig } = useMemo(() => {
    const response = Array.isArray(splitOfSourcesData)
      ? splitOfSourcesData
      : splitOfSourcesData?.data || [];

    const labelColorMap: Record<string, string> = {};
    let colorIndex = 0;
    const mapped = response
      .filter((item: any) => item?.total_count > 0)
      .map((item: any) => {
        const label = item?.source_type;
        if (!labelColorMap[label]) {
          labelColorMap[label] =
            COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
          colorIndex++;
        }
        return {
          label,
          visit: item?.total_count,
          percentage: item?.[getPercentageKey(label)] || "",
          fill: labelColorMap[label],
        };
      });

    const config: Record<string, { label: string; color: string }> = {};
    mapped.forEach((item) => {
      config[item?.label] = { label: item?.label, color: item?.fill };
    });

    return {
      splitOfSourcesChartData: mapped,
      splitOfSourcesChartConfig: config,
    };
  }, [splitOfSourcesData]);

  // Date Wise Fraud Sub Category API Hook
  const {
    data: areaChartDataResponse,
    isLoading: isLoadingAreaChart,
    refetch: refetchAreaChart,
  } = useDateWiseFraudSubCategory(
    selectedType,
    areaChartPayload,
    !!areaChartPayload
  );
  const {
    data: fraudCategoriesData,
    isLoading: isLoadingFraudCategories,
    refetch: refetchFraudCategories,
    error: fraudCategoriesError,
  } = useFraudCategories(
    selectedType,
    baseDashboardPayload,
    !!baseDashboardPayload
  );

  const donutChartConfig = useMemo(() => {
    return { visit: { label: "Count", color: CHART_COLORS[0] } };
  }, []);

  const handleDwTrendFrequencyChange = (value: string) => {
    setDwTrendSelectedFrequency(value);
  };

  const handleDonutSegmentClick = (data: any) => {
    setonclickvalue(data?.name);
  };

  // Handle CSV export responses
  useEffect(() => {
    if (splitOfSourcesExportData?.url) {
      exportCsvFromUrl({
        url: splitOfSourcesExportData.url,
        filename: "Split Of Sources",
        onSuccess: () => {
          setExporting((prev) => ({ ...prev, splitOfSources: false }));
        },
      });
    }
  }, [splitOfSourcesExportData]);

  useEffect(() => {
    if (dateWiseTrendExportData?.url) {
      exportCsvFromUrl({
        url: dateWiseTrendExportData.url,
        filename: "Date Wise Trend",
        onSuccess: () => {
          setExporting((prev) => ({ ...prev, dwTrend: false }));
        },
      });
    }
  }, [dateWiseTrendExportData]);

  useEffect(() => {
    if (publisherVendorTrendExportData?.url) {
      exportCsvFromUrl({
        url: publisherVendorTrendExportData.url,
        filename: "Publisher Vendor Trend",
        onSuccess: () => {
          setExporting((prev) => ({ ...prev, publisherVendor: false }));
        },
      });
    }
  }, [publisherVendorTrendExportData]);

  console.log("loading checking", isLoadingTotalPercentage, isPackageLoading);
  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        <div className="md:hidden sticky top-0 z-50 bg-background px-4 py-3 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-foreground text-center">
            Overall Summary
          </h1>
        </div>
        {/* Modern Filters Row with Glassmorphism Effect */}
        <div className="sticky top-0 z-50   dark:bg-card bg-white border border-border/40 rounded-xl shadow-lg mt-2 ">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 p-2 sm:p-2">
            {/* Mobile Filter Button - Only visible on small devices */}
            <div className="lg:hidden w-full flex flex-col gap-2">
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="outline"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="flex items-center gap-2"
                >
                  <FilterIcon className="w-4 h-4" />
                  <span>Filters</span>
                  {Object.values(filterConfig.publishersFilter).reduce(
                    (sum, f) => sum + (f.selectedCount || 0),
                    0
                  ) +
                    Object.values(filterConfig.otherFilters).reduce(
                      (sum, f) => sum + (f.selectedCount || 0),
                      0
                    ) >
                    0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {Object.values(filterConfig.publishersFilter).reduce(
                        (sum, f) => sum + (f.selectedCount || 0),
                        0
                      ) +
                        Object.values(filterConfig.otherFilters).reduce(
                          (sum, f) => sum + (f.selectedCount || 0),
                          0
                        )}
                    </span>
                  )}
                </Button>
                <ToggleButton
                  options={[
                    { label: "Install", value: "install" },
                    { label: "Event", value: "event" },
                  ]}
                  selectedValue={selectedType}
                  onChange={(value) =>
                    setSelectedType(value as "install" | "event")
                  }
                />
              </div>
              {selectedType === "event" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all duration-200 w-full">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Conversion Date
                  </span>
                  <Checkbox
                    checked={conversionvalue}
                    onCheckedChange={(checked) =>
                      setConversionvalue(checked === true)
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary ml-auto"
                  />
                </div>
              )}
            </div>

            {/* Desktop Filters - Only visible on large devices */}
            <div className="hidden lg:flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Publisher Filter */}
              <Filter
                key={`publishers-${selectedType}-${JSON.stringify(filterData?.campaigns)}-${JSON.stringify(filterData?.publishers)}`}
                filter={filterConfig?.publishersFilter || {}}
                onChange={handlePublisherFilterChange}
                grouped={true}
                publisherGroups={{ Publishers: (filterData?.publishers as any) || {} }}
              />
              <Filter
                key={`other-${selectedType}-${(filterData.country as string[])?.length || 0}-${(filterData.event_type as string[])?.length || 0}-${(filterData.campaigns as string[])?.length || 0}`}
                filter={filterConfig.otherFilters}
                onChange={handleOtherFiltersChange}
                grouped={false}
              />
              {selectedType === "event" && (
                <div className="group relative flex items-center gap-2 rounded-full border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-105  hover:shadow-md  active:scale-100">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Conversion Date
                  </span>
                  <Checkbox
                    checked={conversionvalue}
                    onCheckedChange={(checked) =>
                      setConversionvalue(checked === true)
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Modern Toggle Button - Desktop */}
            <div className="hidden lg:block self-end lg:self-auto">
              <ToggleButton
                options={[
                  { label: "Install", value: "install" },
                  { label: "Event", value: "event" },
                ]}
                selectedValue={selectedType}
                onChange={(value) =>
                  setSelectedType(value as "install" | "event")
                }
              />
            </div>
          </div>
        </div>

        {/* Mobile Filter Sidebar */}
        <MobileFilterSidebar
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
          filter={{
            ...filterConfig.publishersFilter,
            ...filterConfig.otherFilters,
          }}
          onChange={(newState) => {
            // Separate publishers and other filters based on known keys
            const publishersState: { [key: string]: any } = {};
            const otherFiltersState: { [key: string]: any } = {};

            // Publishers filter has "Publishers" key
            if (newState.Publishers) {
              publishersState.Publishers = newState.Publishers;
            }

            // Other filters have: Campaigns, Agency, Country, Event Type
            Object.keys(newState).forEach((key) => {
              if (key !== "Publishers") {
                otherFiltersState[key] = newState[key];
              }
            });

            // Apply changes
            if (Object.keys(publishersState).length > 0) {
              handlePublisherFilterChange(publishersState);
            }
            if (Object.keys(otherFiltersState).length > 0) {
              handleOtherFiltersChange(otherFiltersState);
            }
          }}
          onApply={() => {
            // Filters are already applied via onChange
          }}
          onCancel={() => {
            // Reset to original state
            setIsMobileFilterOpen(false);
          }}
          grouped={true}
          publisherGroups={{ Publishers: filterData.publishers as any }}
        />

        {/* Enhanced Stats Cards with Modern Design */}
        <div className="transition-all duration-300 ease-in-out">
          <StatsCards
            data={totalPercentageData || {}}
            customLabels={{
              Total: `Total ${selectedType === "install" ? "Installs" : "Events"}`,
              Valid: `Valid ${selectedType === "install" ? "Installs" : "Events"}`,
              Invalid: `Invalid ${selectedType === "install" ? "Installs" : "Events"}`,
            }}
            icons={{
              Total: Download,
              Valid: CheckCircle2,
              Invalid: XCircle,
            }}
            isLoading={isLoadingTotalPercentage || isPackageLoading}
          />
        </div>

        {/* Modern Charts Grid with Better Spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 w-full gap-2 transition-all duration-300">
          {/* Donut Chart with Modern Card */}
          <div
            ref={(el) => {
              if (el) cardRefs.current["split_of_sources"] = el;
            }}
            className="transition-all duration-300 hover:shadow-xl"
          >
            <DonutChart
              chartData={splitOfSourcesChartData}
              chartConfig={splitOfSourcesChartConfig}
              title="Split Of Sources"
              titleIcon={<PieChart className="w-4 h-4 text-primary" />}
              handleExportCsv={() => {
                setExporting((prev) => ({ ...prev, splitOfSources: true }));
              }}
              handleExpand={createExpandHandler({
                key: "split_of_sources",
                cardRefs,
                expandedCard,
                setExpandedCard,
              })}
              handleExportPng={createPngExportHandler({
                cardRefs,
                key: "split_of_sources",
                filename: "Split Of Sources",
              })}
              exportKey="split_of_sources"
              dataKey="visit"
              nameKey="label"
              isLoading={isLoadingSplitOfSources || isPackageLoading}
              isView={true}
              direction="flex-col"
              marginTop="mt-0"
              position="items-start"
              isPercentage={false}
              isPercentageValue={true}
              istotalvistors={false}
              displayMode="both"
              contentHeight="14.375rem"
              cardHeight="17rem"
            />
          </div>

          {/* Date Wise Trend Chart with Modern Card */}
          <div
            ref={(el) => {
              if (el) cardRefs.current["date_wise_trend"] = el;
            }}
            className="lg:col-span-2 transition-all duration-300 hover:shadow-xl"
          >
            <StackedBarWithLine
              chartData={dwTrendData?.data || []}
              chartConfig={dwTrendData?.config || {}}
              title="Date Wise Trend"
              titleIcon={<TrendingUp className="w-4 h-4 text-primary" />}
              frequencyOptions={dwTrendSelectOptions}
              selectedFrequency={dwTrendSelectedFrequency}
              handleFrequencyChange={handleDwTrendFrequencyChange}
              frequencyPlaceholder="Daily"
              handleExportCsv={() => {
                setExporting((prev) => ({ ...prev, dwTrend: true }));
              }}
              handleExpand={createExpandHandler({
                key: "date_wise_trend",
                cardRefs,
                expandedCard,
                setExpandedCard,
              })}
              handleExportPng={createPngExportHandler({
                cardRefs,
                key: "date_wise_trend",
                filename: "Date Wise Trend",
              })}
              selectedFilterValue={publisherVendorFilter}
              handleFilterChange={(value) => {
                if (value === "Publisher" || value === "Vendor") {
                  setPublisherVendorFilter(value);
                }
              }}
              exportKey="date_wise_trend"
              isLegend={true}
              isLoading={isLoadingDwTrend || isPackageLoading}
              barHeight="10rem"
              contentHeight="12rem"
              cardHeight="17rem"
              showRightAxis={true}
              chartMargins={{ top: 0, right: -10, left: -10, bottom: -4 }}
            />
          </div>
        </div>

        {/* Publisher/Vendor Wise Trend - Full Width Modern Card */}
        <div
          ref={(el) => {
            if (el) cardRefs.current["publisher_vendor_trend"] = el;
          }}
          className="w-full transition-all duration-300 hover:shadow-xl"
        >
          <StackedBarWithLine
            chartData={publisherVendorData?.data || []}
            chartConfig={publisherVendorData?.config || {}}
            title={`${publisherVendorFilter === "Publisher" ? "Publisher Wise Trend" : "Agency Wise Trend"}`}
            titleIcon={
              publisherVendorFilter === "Publisher" ? (
                <Users className="w-4 h-4 text-primary" />
              ) : (
                <Building2 className="w-4 h-4 text-primary" />
              )
            }
            filterType="radio"
            filterOptions={[
              { value: "Publisher", label: "Publisher" },
              { value: "Vendor", label: "Agency" },
            ]}
            selectedFilterValue={publisherVendorFilter}
            handleFilterChange={(value) => {
              if (value === "Publisher" || value === "Vendor") {
                setPublisherVendorFilter(value);
              }
            }}
            handleExportCsv={() => {
              setExporting((prev) => ({ ...prev, publisherVendor: true }));
            }}
            handleExpand={createExpandHandler({
              key: "publisher_vendor_trend",
              cardRefs,
              expandedCard,
              setExpandedCard,
            })}
            handleExportPng={createPngExportHandler({
              cardRefs,
              key: "publisher_vendor_trend",
              filename: "Publisher Vendor Trend",
            })}
            exportKey="publisher_vendor_trend"
            isLegend={true}
            isLoading={isLoadingPublisherVendor || isPackageLoading}
            barHeight="12.5rem"
            contentHeight="14.375rem"
            cardHeight="19.6875rem"
            showRightAxis={true}
            chartMargins={{ top: 0, right: -10, left: -10, bottom: -4 }}
          />
        </div>

        {/* In-Depth Analysis Section with Modern Spacing */}
        <div className="transition-all duration-300">
          <LazyComponentWrapper>
            <InDepthAnomalyAnalysis
              donutData={
                Array.isArray(fraudCategoriesData)
                  ? fraudCategoriesData
                  : fraudCategoriesData?.data || []
              }
              donutConfig={donutChartConfig}
              fraudStatsLoading={isLoadingFraudCategories}
              isExportingFraudCategories={exporting.fraudCategories}
              onDonutSegmentClick={handleDonutSegmentClick}
              refetchFraudCategories={() => () => {}}
              progressBarData={
                Array.isArray(progressBarDataResponse)
                  ? progressBarDataResponse
                  : progressBarDataResponse?.data || []
              }
              progressBarLoading={isLoadingProgressBar}
              isExportingProgressBar={exporting.progressBar}
              refetchProgressBar={() => () => {}}
              areaChartData1={areaChartDataResponse?.data || []}
              areaBarConfig={areaChartDataResponse?.config}
              areaChartApiLoading={isLoadingAreaChart}
              isExportingAreaChart={exporting.areaChart}
              refetchAreaChart={() => () => {}}
              reattributionChartData={reattributionData?.data || []}
              reattributionStackedBarConfig={reattributionData?.config}
              reattributionLoading={isLoadingReattribution}
              isExportingReattribution={exporting.reattribution}
              refetchReattribution={() => () => {}}
              onclickvalue={onclickvalue}
              selectedRadio1={publisherVendorFilter}
              setSelectedRadio1={setPublisherVendorFilter}
              isInitialLoading={isPackageLoading}
              cardRefs={cardRefs}
              expandedCard={expandedCard}
              setExpandedCard={setExpandedCard}
              baseDashboardPayload={baseDashboardPayload}
              selectedType={selectedType}
              setExporting={setExporting}
            />
          </LazyComponentWrapper>
        </div>

        {/* Analysis Insights Section */}
        <div className="transition-all duration-300">
          <LazyComponentWrapper>
            <AnalysisInsights
              selectedViewType={selectedType === "event" ? "events" : "install"}
              setSelectedViewType={(val) =>
                setSelectedType(val === "events" ? "event" : "install")
              }
              publisherfilter={query.publishers}
              campaignfilter={query.campaigns}
              agencyfilter={query.agency}
              countryfilter={query.country}
              eventTypeFilter={query.event_type}
              onclickvalue1={onclickvalue}
              selectedRadio1Type={publisherVendorFilter}
              isInitialLoading={isPackageLoading}
              conversionvalue={conversionvalue}
              baseDashboardPayload={baseDashboardPayload}
              selectedType={selectedType}
              setExporting={setExporting}
            />
          </LazyComponentWrapper>
        </div>

        {/* Publisher Section */}
        <div className="transition-all duration-300">
          <LazyComponentWrapper>
            <Publisher
              publisherfilter={query.publishers}
              campaignfilter={query.campaigns}
              agencyfilter={query.agency}
              countryfilter={query.country}
              eventTypeFilter={query.event_type}
            />
          </LazyComponentWrapper>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
