"use client";
import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  createExpandHandler,
  createPngExportHandler,
  exportCsvFromUrl,
} from "@/lib/utils";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import ResizableTable from "@/components/mf/ReportingToolTable";
import DoubleLineChart from "@/components/mf/charts/DoubleLineChart";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Download, Loader2 } from "lucide-react";
import ProgressBarChart from "@/components/mf/charts/ProgressBarChart";
import { MFSingleSelect } from "@/components/mf/MFSingleSelect";
import {
  useFraudSubCategory,
  useFraudSubCategoryDetails,
  type DashboardPayload,
  type FraudSubCategoryDetailsPayload,
} from "../../hooks/useDashboard";

interface AnalysisInsightsProps {
  selectedViewType: "install" | "events";
  onclickvalue1: string;
  setSelectedViewType: (type: "install" | "events") => void;
  publisherfilter: string[];
  campaignfilter: string[];
  countryfilter: string[];
  eventTypeFilter: string[];
  agencyfilter: string[];
  selectedRadio1Type?: "Publisher" | "Vendor";
  isInitialLoading?: boolean;
  conversionvalue?: boolean;
  baseDashboardPayload: DashboardPayload;
  selectedType: "install" | "event";
  setExporting: Dispatch<SetStateAction<{
    fraudCategories: boolean;
    progressBar: boolean;
    reattribution: boolean;
    dwTrend: boolean;
    publisherVendor: boolean;
    areaChart: boolean;
    splitOfSources: boolean;
    fraudSubCategoryDetails?: boolean;
  }>>;
}

const AnalysisInsights: React.FC<AnalysisInsightsProps> = ({
  selectedViewType,
  onclickvalue1,
  setSelectedViewType,
  publisherfilter,
  campaignfilter,
  agencyfilter,
  countryfilter,
  eventTypeFilter,
  selectedRadio1Type,
  isInitialLoading,
  conversionvalue = false,
  baseDashboardPayload,
  selectedType,
  setExporting,
}) => {
  const { selectedPackage } = usePackage();
  const { startDate, endDate } = useDateRange();
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchTermIncent, setSearchTermIncent] = useState("");

  // ============================================================================
  // PAYLOADS
  // ============================================================================
  const basePayload = useMemo<DashboardPayload | undefined>(() => {
    if (!selectedPackage || !startDate || !endDate) return undefined;
    
    return {
      start_date: startDate,
      end_date: endDate,
      package_name: selectedPackage,
      category: onclickvalue1 || "Click Fraud",
      publisher: publisherfilter || ["all"],
      campaign_id: campaignfilter || ["all"],
      vendor_id: agencyfilter || ["all"],
      country: countryfilter || ["all"],
      ...(selectedViewType === "events" && {
        event_type: eventTypeFilter || ["all"],
        useConversionDate: conversionvalue,
      }),
    };
  }, [
    startDate,
    endDate,
    selectedPackage,
    onclickvalue1,
    publisherfilter,
    campaignfilter,
    agencyfilter,
    countryfilter,
    selectedViewType,
    eventTypeFilter,
    conversionvalue,
  ]);

  const detailsPayload = useMemo<FraudSubCategoryDetailsPayload | undefined>(() => {
    if (!basePayload || !selectedKey) return undefined;
    
    return {
      ...basePayload,
      fraud_sub_category: selectedKey,
    };
  }, [basePayload, selectedKey]);

  // Export state
  const [isExportingDetails, setIsExportingDetails] = useState(false);

  // Export payload for fraud sub category details
  const fraudSubCategoryDetailsExportPayload = useMemo<FraudSubCategoryDetailsPayload | undefined>(() => {
    if (!detailsPayload || !isExportingDetails) return undefined;
    
    return {
      ...detailsPayload,
      export_type: "csv",
    };
  }, [detailsPayload, isExportingDetails]);

  // ============================================================================
  // API HOOKS
  // ============================================================================
  const apiType = selectedViewType === "install" ? "install" : "event";
  
  const {
    data: fraudSubCategoriesData,
    isLoading: fraudSubCategoryLoading,
  } = useFraudSubCategory(apiType, basePayload, !!basePayload && !isInitialLoading);

  const {
    data: fraudSubCategoryDetailsData,
    isLoading: fraudSubCategoryDetailsLoading,
  } = useFraudSubCategoryDetails(
    apiType,
    detailsPayload,
    !!detailsPayload && !isInitialLoading
  );

  // Export API hook
  const { data: fraudSubCategoryDetailsExportData } = useFraudSubCategoryDetails(
    apiType,
    fraudSubCategoryDetailsExportPayload,
    !!fraudSubCategoryDetailsExportPayload
  );

  // Handle CSV export response
  useEffect(() => {
    if (fraudSubCategoryDetailsExportData) {
      // Check if response has url (CSV export) or is array (regular data)
      if ((fraudSubCategoryDetailsExportData as any)?.url) {
        exportCsvFromUrl({
          url: (fraudSubCategoryDetailsExportData as any).url,
          filename: `Fraud Sub Category Details - ${selectedKey || "Details"}`,
          onSuccess: () => {
            setIsExportingDetails(false);
          },
        });
      }
    }
  }, [fraudSubCategoryDetailsExportData, selectedKey]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const fraudSubCategories = useMemo(() => {
    return Array.isArray(fraudSubCategoriesData) ? fraudSubCategoriesData : [];
  }, [fraudSubCategoriesData]);

  // Transform for MFSingleSelect
  const fraudSubCategoryItems = useMemo(() => {
    return fraudSubCategories.map((item) => ({
      title: item.fraud_subcategory,
      value: item.fraud_subcategory,
    }));
  }, [fraudSubCategories]);

  const viewType = useMemo(() => {
    if (!selectedKey || fraudSubCategories.length === 0) return "table";
    const found = fraudSubCategories.find((item) => item.fraud_subcategory === selectedKey);
    return found?.type || "table";
  }, [selectedKey, fraudSubCategories]);

  // Auto-select first item when data loads
  useMemo(() => {
    if (fraudSubCategories.length > 0 && !selectedKey) {
      setSelectedKey(fraudSubCategories[0].fraud_subcategory);
    }
  }, [fraudSubCategories, selectedKey]);

  // ============================================================================
  // DATA TRANSFORMATIONS
  // ============================================================================
  const { tableData, tableColumns } = useMemo(() => {
    if (
      viewType !== "table" ||
      !fraudSubCategoryDetailsData?.data ||
      !Array.isArray(fraudSubCategoryDetailsData.data) ||
      fraudSubCategoryDetailsData.data.length === 0
    ) {
      return { tableData: [], tableColumns: [] };
    }

    const firstItem = fraudSubCategoryDetailsData.data[0];
    const columns = Object.keys(firstItem).map((key) => ({
      title: key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      key: key,
    }));

    return {
      tableData: fraudSubCategoryDetailsData.data,
      tableColumns: columns,
    };
  }, [viewType, fraudSubCategoryDetailsData]);

  const { chartData, chartConfig, chartTitle } = useMemo(() => {
    if (
      viewType !== "graph" ||
      !fraudSubCategoryDetailsData?.data ||
      !Array.isArray(fraudSubCategoryDetailsData.data)
    ) {
      return { chartData: [], chartConfig: {}, chartTitle: "" };
    }

    const data = fraudSubCategoryDetailsData.data.map((item: any) => ({
      label: item.bucket,
      percentage: item.percentage,
    }));

    const config = {
      percentage: { label: "Percentage", color: "#2563eb" },
    };

    return {
      chartData: data,
      chartConfig: config,
      chartTitle: fraudSubCategoryDetailsData.title || "",
    };
  }, [viewType, fraudSubCategoryDetailsData]);

  const { progressData, progressTitle } = useMemo(() => {
    if (
      viewType !== "progress" ||
      !fraudSubCategoryDetailsData?.data ||
      !Array.isArray(fraudSubCategoryDetailsData.data)
    ) {
      return { progressData: [], progressTitle: "" };
    }

    const data = fraudSubCategoryDetailsData.data.map((item: any) => ({
      visit: item.visit,
      label: item.label,
      percentage: item.percentage || "-",
      fill: item.fill,
    }));

    return {
      progressData: data,
      progressTitle: fraudSubCategoryDetailsData.title || "",
    };
  }, [viewType, fraudSubCategoryDetailsData]);

  const carouselData = useMemo(() => {
    if (
      viewType !== "carousel" ||
      !fraudSubCategoryDetailsData?.data ||
      !Array.isArray(fraudSubCategoryDetailsData.data)
    ) {
      return [];
    }
    return fraudSubCategoryDetailsData.data;
  }, [viewType, fraudSubCategoryDetailsData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleExportCsv = useCallback(() => {
    setIsExportingDetails(true);
  }, []);

  const handleKeySelect = useCallback((key: string) => {
    setSelectedKey(key);
  }, []);

  // ============================================================================
  // COMPONENTS
  // ============================================================================
  const IncentSampleCard: React.FC<{ data: Record<string, any> }> = ({
    data,
  }) => {
    const { screenshot_url, ...otherData } = data;

    const renderValue = (val: string) => {
      const urlRegex = /^(https?:\/\/[^\s]+)/i;
      const isUrl = urlRegex.test(val);

      if (isUrl) {
        return (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
            title={val}
          >
            {val.length > 20 ? val.slice(0, 20) + "..." : val}
          </a>
        );
      }

      return (
        <span className="text-xs" title={val}>
          {val.length > 20 ? val.slice(0, 20) + "..." : val}
        </span>
      );
    };

    return (
      <Card className="w-full h-[290px] overflow-hidden border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <CardContent className="p-2">
          <div className="flex h-full w-full justify-between gap-4">
            <div className="w-2/3 space-y-3">
              {Object.entries(otherData).map(([key, value]) => (
                <div key={key} className="flex items-start gap-3 text-sm group">
                  <span className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0 group-hover:scale-125 transition-transform"></span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      {key
                        .split("_")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                      :
                    </span>
                    {renderValue(String(value))}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-1/2 flex items-center justify-center pl-4">
              {screenshot_url ? (
                <div className="w-48 h-64 rounded-xl overflow-hidden shadow-lg border border-border/40 hover:border-primary/50 transition-all duration-300">
                  <img
                    src={screenshot_url}
                    alt="Screenshot"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML =
                        '<div class="w-full h-full flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm">Image not available</div>';
                    }}
                  />
                </div>
              ) : (
                <div className="w-48 h-64 flex items-center justify-center bg-muted rounded-xl text-muted-foreground border border-dashed border-border/50">
                  <span className="text-sm">No screenshot</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // RENDER VIEW BASED ON TYPE
  // ============================================================================
  const renderIncentSamplesDynamicView = () => {
    switch (viewType) {
      case "table":
        return (
          <div className="w-full">
            {tableColumns.length === 0 && !fraudSubCategoryDetailsLoading ? (
              <div className="py-2 text-center text-gray-500">
                No table structure available
              </div>
            ) : (
              <ResizableTable
                columns={tableColumns}
                data={tableData}
                height={400}
                isSearchable={true}
                onSearch={setSearchTermIncent}
                isLoading={fraudSubCategoryDetailsLoading}
                
              />
            )}
          </div>
        );

      case "carousel":
        return (
          <div className="w-full max-w-full overflow-hidden">
            <div className="relative py-2">
              <Carousel
                opts={{ align: "start", loop: true }}
                className="w-full"
              >
                <div className="flex items-center gap-4">
                  <CarouselPrevious className="static hover:bg-primary hover:text-primary-foreground transition-all" />
                  <div className="flex-1 overflow-hidden">
                    <CarouselContent className="-ml-4">
                      {carouselData.map((sample: any, index: number) => (
                        <CarouselItem
                          key={index}
                          className="basis-full md:basis-1/2 pl-4"
                        >
                          <div className="w-full h-full">
                            <IncentSampleCard data={sample} />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </div>
                  <CarouselNext className="static hover:bg-primary hover:text-primary-foreground transition-all" />
                </div>
              </Carousel>
            </div>
          </div>
        );

      case "graph":
        return (
          <div
            ref={(el) => {
              if (el) cardRefs.current["fraud_sub_category_trend"] = el;
            }}
            className="w-full transition-all duration-300 hover:shadow-xl"
          >
            <DoubleLineChart
              chartData={chartData}
              title={chartTitle}
              chartConfig={chartConfig}
              isRadioButton={false}
              isLoading={fraudSubCategoryDetailsLoading}
              AxisLabel="Percentage"
              selectoptions={["Desktop", "Mobile"]}
              handleFrequencyChange={() => {}}
              selectedFrequency="desktop"
              isPercentage={true}
              handleExpand={createExpandHandler({
                key: "fraud_sub_category_trend",
                cardRefs,
                expandedCard,
                setExpandedCard,
              })}
              handleExportPng={createPngExportHandler({
                cardRefs,
                key: "fraud_sub_category_trend",
                filename: "Fraud Sub Categories Trend",
              })}
              handleExportCsv={handleExportCsv}
              showMenu={true}
              xAxisLabel="CTIT in Hours"
              yAxisLabel="Percentage"
              cardHeight="18rem"
              height="10rem"
              titleIcon={<Download className="w-4 h-4 text-primary" />}
              exportKey="fraud_sub_category_trend"
            />
          </div>
        );

      case "progress":
        return (
          <div
            ref={(el) => {
              if (el) cardRefs.current["fraud_sub_category_progress"] = el;
            }}
            className="w-full transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
          >
            <div className="h-full">
              <ProgressBarChart
                title={progressTitle}
                chartData={progressData}
                handleExpand={createExpandHandler({
                  key: "fraud_sub_category_progress",
                  cardRefs,
                  expandedCard,
                  setExpandedCard,
                })}
                handleExportPng={createPngExportHandler({
                  cardRefs,
                  key: "fraud_sub_category_progress",
                  filename: "Fraud Sub Categories Progress",
                })}
                handleExportCsv={handleExportCsv}
                exportKey="fraud_sub_category_progress"
                isLoading={fraudSubCategoryDetailsLoading}
                titleIcon={<Download className="w-4 h-4 text-primary" />}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full flex items-center justify-center p-2">
            <div className="text-gray-500">
              {fraudSubCategoryDetailsLoading || !!isInitialLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : (
                `No view available for type: ${viewType}`
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {fraudSubCategories.length > 0 && (
        <>
          {/* Modern Analysis Insights Container */}
          <div className="w-full bg-gradient-to-br from-card/40 via-card to-card/60 dark:from-card/50 dark:via-card dark:to-card/30 backdrop-blur-xl border border-border/40 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-border/60">
            <div className="flex flex-col ">
              {/* Modern Section Header with Dropdown */}
              <div className="flex items-center justify-between gap-2 p-4 border-b border-border/30">
                {/* Title with gradient bars */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-primary via-primary to-primary/50 rounded-full" />
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {onclickvalue1 ? onclickvalue1 : `Click Fraud`}
                  </h2>
                </div>

                {/* Fraud Subcategory Selector */}
                <div className="flex items-center gap-2">
                  {fraudSubCategories.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        Filter by:
                      </span>
                      <MFSingleSelect
                        items={fraudSubCategoryItems}
                        value={selectedKey || ""}
                        onValueChange={handleKeySelect}
                        placeholder="Select fraud subcategory"
                        className="w-[12rem] h-[36px] text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No sub categories available
                    </span>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="w-full px-4 py-4">
                {fraudSubCategories.length > 0 ? (
                  renderIncentSamplesDynamicView()
                ) : (
                  <div className="w-full flex items-center justify-center p-6 bg-gradient-to-br from-muted/10 to-muted/5 rounded-lg border border-border/30">
                    <div className="text-center">
                      {fraudSubCategoryLoading || !!isInitialLoading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Loading data...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-base font-medium text-foreground">
                            No Data Found!
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Try adjusting your filters
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AnalysisInsights;

