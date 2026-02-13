"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useApiCall } from "@/services/api_base";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import { onExpand, downloadURI } from "@/lib/utils";
import domToImage from "dom-to-image";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import DonutChart from "@/components/mf/charts/DonutChart";
import HeaderRow from "@/components/mf/HeaderRow";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/carousel";
import ProgressBarChart from "@/components/mf/charts/ProgressBarChart";
import ChartAreaGradient from "@/components/mf/charts/ChartAreaGradient";
import StackedBarChart from "@/components/mf/charts/stackedBarChart";
import { Loader2 } from "lucide-react";
import DoubleLineChart from "@/components/mf/charts/DoubleLineChart";
import ResizableTable from "@/components/mf/ReportingToolTable";
import { debounce } from "@/lib/utils";

interface InDepthAnomalyAnalysisProps {
  selectedType: "click" | "impression";
  publisherfilter: string[];
  campaignfilter: string[];
  countryfilter: string[];
  onclickvalue: string;
  setonclickvalue: (value: string) => void;
}

const COLORS = [
  "#8b5cf6",
  "#a855f7",
  "#c084fc",
  "#f59e42",
  "#00A86B",
  "#FF0000",
  "#D49B54",
  "#2563eb",
  "#f97316",
  "#84cc16",
  "#0d9488",
  "#9333ea",
  "#ef4444",
  "#e76e50",
  "#2a9d90",
  "#a8a032",
  "#274754",
  "#e8c468",
  "#2dc048",
  "#d97706",
  "#0ea5e9",
  "#c2410c",
  "#f59e42",
  "#d8b4fe",
  "#e9d5ff",
  "#f3e8ff",
  "#a855f7",
  "#c084fc",
  "#f59e42",
  "#8b5cf6",
];

const InDepthAnomalyAnalysis: React.FC<InDepthAnomalyAnalysisProps> = ({
  selectedType,
  publisherfilter,
  campaignfilter,
  countryfilter,
  onclickvalue,
  setonclickvalue,
}) => {
  const { selectedPackage, isPackageLoading } = usePackage();
  const { startDate, endDate } = useDateRange();
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  // Fraud Categories States
  const [donutData, setDonutData] = useState<any[]>([]);
  const [donutConfig, setDonutConfig] = useState<any>({});
  const [isExportingFraudCategories, setIsExportingFraudCategories] = useState(false);
  const [fraudStatsLoading, setFraudStatsLoading] = useState(false);

  // Progress Bar States
  const [progressBarData, setProgressBarData] = useState<any[]>([]);
  const [progressBarLoading, setProgressBarLoading] = useState(false);
  const [isExportingProgressBar, setIsExportingProgressBar] = useState(false);

  // Area Chart States
  const [areaChartData1, setareaChartData1] = useState<any[]>([]);
  const [isExportingAreaChart, setIsExportingAreaChart] = useState(false);
  const [areaBarConfig, setareaBarConfig] = useState();
  const [areaChartLoading, setAreaChartLoading] = useState(false);

  // Reattribution States
  const [reattributionLoading, setReattributionLoading] = useState(false);
  const [isExportingReattribution, setIsExportingReattribution] = useState(false);
  const [reattributionChartData, setReattributionChartData] = useState<any[]>([]);
  const [reattributionStackedBarConfig, setreattributionStackedBarConfig] = useState();

  // Analysis Insights States
  const [fraudSubCategories, setFraudSubCategories] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("table");
  const [searchTermIncent, setSearchTermIncent] = useState("");
  const [tableDataIncent, setTableDataIncent] = useState<any[]>([]);
  const [chartDataIncent, setChartDataIncent] = useState<any[]>([]);
  const [chartConfigIncent, setChartConfigIncent] = useState<any>({});
  const [dynamicTableColumns, setDynamicTableColumns] = useState<any[]>([]);
  const [progressDataIncent, setProgressDataIncent] = useState<any[]>([]);
  const [progressConfigIncent, setProgressConfigIncent] = useState<any>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Handle expand functionality
  const handleExpand = (chartType: string) => {
    onExpand(chartType, cardRefs, expandedCard, setExpandedCard);
  };

  // Handle export functionality
  const onExportChart = async (format: string, title: string, chartId: string) => {
    if (format === "png") {
      const ref = cardRefs.current[chartId];
      if (!ref) return;
      
      try {
        const screenshot = await domToImage.toPng(ref);
        downloadURI(screenshot, `${title}.png`);
      } catch (error) {
        console.error("Error exporting chart:", error);
      }
    }
  };

  // API integration for donut chart (fraud categories)
  const fraudCategoriesApi = useApiCall<any>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType === "click" ? "click" : "impression"}/fraud_category`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType === "click" ? "click" : "impression"}/fraud_category`,
    method: "POST",
    manual: true,
    onSuccess: (response: any) => {
      if (response && response.url) {
        const link = document.createElement("a");
        link.href = response.url;
        link.setAttribute("download", "fraud_categories.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportingFraudCategories(false);
      } else {
        console.log(response, "frauddata");
        const arr = Array.isArray(response)
          ? response
          : response && Array.isArray(response.data)
            ? response.data
            : [];
        const mapped = arr.map((item: any, idx: number) => ({
          label: item.fraud_category,
          visit: item.total_count,
          percentage: item.percentage,
          fill: COLORS[idx % COLORS.length],
        }));
        setDonutData(response);
        setDonutConfig({ visit: { label: "Count", color: COLORS[0] } });
        setFraudStatsLoading(false);
      }
    },
    onError: () => {
      setDonutData([]);
      setFraudStatsLoading(false);
      setIsExportingFraudCategories(false);
    },
  });

  // Call fraud categories API - intentionally excludes onclickvalue to prevent unnecessary calls when clicking segments
  useEffect(() => {
    if (
      fraudCategoriesApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      !isExportingFraudCategories &&
      !isPackageLoading
    ) {
      setFraudStatsLoading(true);
      fraudCategoriesApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        publisher: publisherfilter,
        campaign_id: campaignfilter,
        country: countryfilter,
      });
    }
  }, [
    startDate,
    endDate,
    selectedPackage,
    selectedType,
    publisherfilter,
    campaignfilter,
    countryfilter,
    // Note: Intentionally excluding onclickvalue to prevent API calls when clicking donut segments
  ]);

  // Progress Bar API
  const progressBarApi = useApiCall<any>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType === "click" ? "click" : "impression"}/fraud_sub_category_progress_bar`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType === "click" ? "click" : "impression"}/fraud_sub_category_progress_bar`,
    method: "POST",
    manual: true,
    onSuccess: (response: any) => {
      if (response && response.url) {
        const link = document.createElement("a");
        link.href = response.url;
        link.setAttribute("download", "fraud_sub_categories.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportingProgressBar(false);
      } else {
        setProgressBarData(response);
        setProgressBarLoading(false);
      }
    },
    onError: () => {
      setProgressBarData([]);
      setProgressBarLoading(false);
      setIsExportingProgressBar(false);
    },
  });

  useEffect(() => {
    if (
      progressBarApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      !isExportingProgressBar &&
      !isPackageLoading
    ) {
      setProgressBarLoading(true);
      progressBarApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        category: onclickvalue ? `${onclickvalue}` : "Bots",
        publisher: publisherfilter,
        campaign_id: campaignfilter,
        country: countryfilter,
      });
    }
  }, [
    startDate,
    endDate,
    selectedPackage,
    selectedType,
    publisherfilter,
    campaignfilter,
    countryfilter,
    onclickvalue,
  ]);

  // Area Chart API
  const areaChartApiType = selectedType === "click" ? "click" : "impression";
  // const areaChartUrl = `https://uat-api-dev.mfilterit.net/v1/app/integrity/${areaChartApiType}/date_wise_fraud_sub_category_chart`;
  const areaChartUrl = process.env.NEXT_PUBLIC_APP_PERF + `integrity/${areaChartApiType}/date_wise_fraud_sub_category_chart`;

  const areaChartPayload = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      package_name: selectedPackage,
      category: onclickvalue ? `${onclickvalue}` : "Bots",
      frequency: "daily",
      publisher: publisherfilter,
      campaign_id: campaignfilter,
      country: countryfilter,
    }),
    [
      startDate,
      endDate,
      selectedType,
      selectedPackage,
      onclickvalue,
      publisherfilter,
      campaignfilter,
      countryfilter,
    ]
  );

  const { result: areaChartResult, loading: areaChartApiLoading } = useApiCall<any[]>({
    url: areaChartUrl,
    method: "POST",
    manual: true,
    onSuccess: (data: any) => {
      if (data && data.url) {
        const link = document.createElement("a");
        link.href = data.url;
        link.setAttribute("download", "date_wise_fraud_sub_categories.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportingAreaChart(false);
        return;
      }
      console.log(data, "rrrr");
      setareaChartData1(data?.data);
      setareaBarConfig(data?.config);
    },
    onError: () => {
      setareaChartData1([]);
      setIsExportingAreaChart(false);
    },
  });

  useEffect(() => {
    setAreaChartLoading(areaChartApiLoading);

    if (areaChartResult && "mutate" in areaChartResult && !isPackageLoading) {
      areaChartResult.mutate(areaChartPayload);
    }
  }, [
    onclickvalue,
    startDate,
    endDate,
    selectedPackage,
    publisherfilter,
    campaignfilter,
    countryfilter,
  ]);

  // Reattribution API
  const reattributionApi = useApiCall<any>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType === "click" ? "click" : "impression"}/publisher_wise_fraud_sub_category`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType === "click" ? "click" : "impression"}/publisher_wise_fraud_sub_category`,
    method: "POST",
    manual: true,
    onSuccess: (response: any) => {
      if (response && response.url) {
        const link = document.createElement("a");
        link.href = response.url;
        link.setAttribute("download", "publisher_wise_fraud_sub_categories.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportingReattribution(false);
      } else {
        setReattributionChartData(response?.data);
        setreattributionStackedBarConfig(response.config);
        setReattributionLoading(false);
      }
    },
    onError: () => {
      setReattributionChartData([]);
      setReattributionLoading(false);
      setIsExportingReattribution(false);
    },
  });

  useEffect(() => {
    if (
      reattributionApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      !isExportingReattribution &&
      !isPackageLoading
    ) {
      setReattributionLoading(true);
      reattributionApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        category: onclickvalue ? `${onclickvalue}` : "Bots",
        publisher: publisherfilter,
        campaign_id: campaignfilter,
        country: countryfilter,
      });
    }
  }, [
    startDate,
    endDate,
    selectedType,
    selectedPackage,
    publisherfilter,
    campaignfilter,
    countryfilter,
    onclickvalue,
  ]);

  // Handle donut segment click - only updates the selected category for other charts
  // This WILL trigger Progress Bar, Area Chart, and Reattribution APIs but NOT Fraud Categories API
  const handleDonutSegmentClick = (data: any) => {
    setonclickvalue(data?.name);
  };

  // Analysis Insights API Calls
  const DEFAULT_PAYLOAD = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      package_name: selectedPackage,
      category: onclickvalue ? onclickvalue : "Bots",
      publisher: publisherfilter || ["all"],
      campaign_id: campaignfilter || ["all"],
      country: countryfilter || ["all"],
    }),
    [
      startDate,
      endDate,
      selectedPackage,
      onclickvalue,
      publisherfilter,
      campaignfilter,
      countryfilter,
      selectedType,
    ]
  );
console.log(onclickvalue,selectedType,"pppppppppppppp")
  const apiType = selectedType === "click" ? "click" : "impression";
  // const FRAUD_SUB_CATEGORY_API = `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/fraud_sub_category`;
  const FRAUD_SUB_CATEGORY_API = process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/fraud_sub_category`;
  // const FRAUD_SUB_CATEGORY_DETAILS_API = `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/fraud_sub_category_details`;
  const FRAUD_SUB_CATEGORY_DETAILS_API = process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/fraud_sub_category_details`;

  const { result: fraudSubCategoryApi, loading: fraudSubCategoryLoading } =
    useApiCall<any[]>({
      url: FRAUD_SUB_CATEGORY_API,
      method: "POST",
      manual: true,
      onSuccess: () => {},
      onError: () => {},
      params: DEFAULT_PAYLOAD,
    });

  const {
    result: fraudSubCategoryDetailsApi,
    loading: fraudSubCategoryDetailsLoading,
  } = useApiCall<any>({
    url: FRAUD_SUB_CATEGORY_DETAILS_API,
    method: "POST",
    manual: true,
    onSuccess: () => {},
    onError: () => {},
  });

  // Fetch API on mount and when view type changes
  useEffect(() => {
    if ("mutate" in fraudSubCategoryApi) {
      fraudSubCategoryApi.mutate(DEFAULT_PAYLOAD);
    }
  }, [
    startDate,
    endDate,
    selectedPackage,
    selectedType,
    publisherfilter,
    campaignfilter,
    countryfilter,
    onclickvalue,
  ]);

  // Update state when API data changes
  useEffect(() => {
    if (fraudSubCategoryApi.data && Array.isArray(fraudSubCategoryApi.data)) {
      setFraudSubCategories(fraudSubCategoryApi.data);
      if (fraudSubCategoryApi.data.length > 0) {
        setSelectedKey(fraudSubCategoryApi.data[0].fraud_subcategory);
        setSelectedAnalysisType(fraudSubCategoryApi.data[0].type);
      } else {
        setSelectedKey(null);
        setSelectedAnalysisType("");
        setTableDataIncent([]);
        setChartDataIncent([]);
        setDynamicTableColumns([]);
      }
    } else {
      setFraudSubCategories([]);
      setSelectedKey(null);
      setSelectedAnalysisType("");
      setTableDataIncent([]);
      setChartDataIncent([]);
      setDynamicTableColumns([]);
    }
  }, [fraudSubCategoryApi.data]);

  // Fetch details API when selectedKey/type changes
  useEffect(() => {
    if (
      (selectedAnalysisType === "table" ||
        selectedAnalysisType === "graph" ||
        selectedAnalysisType === "carousel" ||
        selectedAnalysisType === "progress") &&
      selectedKey &&
      "mutate" in fraudSubCategoryDetailsApi
    ) {
      const payload = {
        ...DEFAULT_PAYLOAD,
        fraud_sub_category: selectedKey,
      };
      fraudSubCategoryDetailsApi.mutate(payload);
    } else if (!selectedKey || !selectedAnalysisType) {
      setTableDataIncent([]);
      setChartDataIncent([]);
      setDynamicTableColumns([]);
    }
  }, [selectedKey, selectedAnalysisType, DEFAULT_PAYLOAD]);

  // Map API data to table/chart dynamically
  useEffect(() => {
    
    if (
      fraudSubCategoryDetailsApi?.data?.data &&
      Array.isArray(fraudSubCategoryDetailsApi?.data?.data) &&
      fraudSubCategoryDetailsApi?.data?.data.length > 0
    ) {
      if (selectedAnalysisType === "table") {
        const firstItem = fraudSubCategoryDetailsApi?.data?.data[0];
        const columns = Object.keys(firstItem).map((key) => ({
          title: key
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          key: key,
        }));

        setDynamicTableColumns(columns);
        setTableDataIncent(fraudSubCategoryDetailsApi?.data?.data);
      } else if (selectedAnalysisType === "graph") {
        const chartData = fraudSubCategoryDetailsApi.data.map((item: any) => ({
          label: item.bucket,
          percentage: item.percentage,
        }));
        const chartConfig = {
          percentage: { label: "Percentage", color: "#2563eb" },
        };
        setChartDataIncent(chartData);
        setChartConfigIncent(chartConfig);
      } else if (selectedAnalysisType === "progress") {
        const progressData = fraudSubCategoryDetailsApi.data.map(
          (item: any) => ({
            visit: item.visit,
            label: item.label,
            percentage: item.percentage ? item.percentage : "-",
            fill: item.fill,
          })
        );
        const progressConfig = {
          percentage: { label: "Percentage", color: "#2563eb" },
        };
        setProgressConfigIncent(progressConfig);
        setProgressDataIncent(progressData);
      }
    } else {
      setTableDataIncent([]);
      setChartDataIncent([]);
      setDynamicTableColumns([]);
    }
  }, [fraudSubCategoryDetailsApi.data, selectedAnalysisType]);

  const handleKeySelect = (key: string) => {
    setSelectedKey(key);
    const found = fraudSubCategories.find(
      (item) => item.fraud_subcategory === key
    );
    if (found) {
      setSelectedAnalysisType(found.type);
    }
  };

  // IncentSampleCard component
  const IncentSampleCard: React.FC<{ data: Record<string, any> }> = ({
    data,
  }) => {
    const { screenshot_url, ...otherData } = data;
    
    return (
      <Card className="w-full h-[290px] overflow-hidden border">
        <CardContent className="p-4">
          <div className="flex h-full w-full justify-between">
            {/* Left side - Dynamic Details */}
            <div className="w-1/2 space-y-4">
              {Object.entries(otherData).map(([key, value]) => {
                if (
                  (key === "Target URL" ||
                    key === "targetUrl" ||
                    key === "trackingUrl") &&
                  typeof value === "string"
                ) {
                  const display =
                    value.length > 30 ? value.slice(0, 30) + "..." : value;
                  return (
                    <div key={key} className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-black rounded-full"></span>
                        <span className="text-sm font-semibold">
                          Target Url:
                        </span>
                      </div>
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 truncate max-w-[200px] text-sm ml-5"
                        title={value}
                      >
                        {display}
                      </a>
                    </div>
                  );
                }
                if (key === "screenshot_url") return null;
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    <span className="text-sm font-semibold">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                      :
                    </span>
                    <span className="text-xs">{String(value)}</span>
                  </div>
                );
              })}
            </div>
            {/* Right side - screenshot_url or Image if present */}
            <div className="w-1/2 flex items-center justify-center">
              {data["Target URL"] || data["targetUrl"] ? (
                <a
                  href={data["Target URL"] || data["targetUrl"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-48 h-64"
                >
                  <img
                    src={data["screenshot_url_url"] || data["targetUrl"]}
                    alt="Incent Sample"
                    className="w-full h-full object-cover rounded-lg shadow-lg border"
                    style={{ background: "#eee" }}
                  />
                </a>
              ) : screenshot_url ? (
                <div className="w-48 h-64 bg-gradient-to-b from-orange-400 to-orange-600 rounded-lg shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-400 to-orange-600">
                    <div className="h-6 bg-orange-500 flex items-center justify-between px-2 text-xs text-white">
                      <span>{screenshot_url.time}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">●●●●</span>
                        <span className="text-xs">
                          {screenshot_url.batteryLevel}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 text-white">
                      <div className="mb-4">
                        <div className="w-12 h-12 bg-red-600 rounded-lg mb-2"></div>
                        <p className="text-sm font-medium">
                          {screenshot_url.appName}
                        </p>
                        <p className="text-xs opacity-75">
                          {screenshot_url.appDescription}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {Array.isArray(screenshot_url.features) &&
                          screenshot_url.features.map(
                            (feature: string, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <div className="w-6 h-6 bg-yellow-400 rounded-full"></div>
                                <span className="text-xs">{feature}</span>
                              </div>
                            )
                          )}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-yellow-400 text-black text-center py-3 rounded-full font-medium">
                          Install
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-64 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
                  No screenshot_url
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderIncentSamplesDynamicView = () => {
    switch (selectedAnalysisType) {
      case "table":
        return (
          <div className="w-full">
            {dynamicTableColumns.length === 0 &&
            !fraudSubCategoryDetailsLoading ? (
              <div className="p-4 text-center text-gray-500">
                No table structure available
              </div>
            ) : (
              <ResizableTable
                columns={dynamicTableColumns}
                data={tableDataIncent}
                headerColor="#DCDCDC"
                height={400}
                isSearchable={true}
                isPaginated={false}
                isLoading={fraudSubCategoryDetailsLoading || isPackageLoading}
                isUserTable={false}
                isTableDownload={false}
                SearchTerm={searchTermIncent}
                setSearchTerm={setSearchTermIncent}
              />
            )}
          </div>
        );
      case "carousel":
        const carouselData =
          fraudSubCategoryDetailsApi.data &&
          Array.isArray(fraudSubCategoryDetailsApi.data) &&
          fraudSubCategoryDetailsApi.data.length > 0
            ? fraudSubCategoryDetailsApi.data
            : [];
        return (
          <div className="w-full max-w-full overflow-hidden">
            <div className="relative">
              <Carousel
                opts={{ align: "start", loop: true }}
                className="w-full"
              >
                <div className="flex items-center gap-4">
                  <CarouselPrevious className="static" />
                  <div className="flex-1 overflow-hidden">
                    <CarouselContent>
                      {carouselData.map((sample: any, index: number) => (
                        <CarouselItem
                          key={index}
                          className="basis-full md:basis-1/2"
                        >
                          <div className="w-full h-full p-2">
                            <IncentSampleCard data={sample} />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </div>
                  <CarouselNext className="static" />
                </div>
              </Carousel>
            </div>
          </div>
        );
      case "graph":
        return (
          <div
            className="w-full"
            ref={(el) => {
              if (el) cardRefs.current["fraud_sub_category_trend"] = el;
            }}
          >
            <DoubleLineChart
              chartData={chartDataIncent}
              chartConfig={chartConfigIncent}
              isRadioButton={false}
              isLoading={fraudSubCategoryDetailsLoading || isPackageLoading}
              AxisLabel="Percentage"
              selectoptions={["Desktop", "Mobile"]}
              handleFrequencyChange={() => {}}
              selectedFrequency="desktop"
              isPercentage={true}
              onExpand={() => {
                handleExpand("fraud_sub_category_trend");
              }}
              onExport={() => {
                onExportChart("png","Fraud Sub Categories Trend","fraud_sub_categories_trend")
              }}
              showMenu={false}
              xAxisLabel="Hours"
              yAxisLabel="Percentage"
            />
          </div>
        );
      case "progress":
        return (
          <div className="w-full">
            <Card
              className="p-4 w-full h-[420px] overflow-hidden"
              ref={(el) => {
                if (el) cardRefs.current["fraud_sub_category_trend"] = el;
              }}
            >
              <div className="h-full">
                <ProgressBarChart
                  chartData={progressDataIncent}
                  onExpand={() => {
                    handleExpand("fraud_sub_category_trend");
                  }}
                  onExport={() => {
                    onExportChart("png","Fraud Sub Categories Trend","fraud_sub_categories_trend")
                  }}
                  isLoading={fraudSubCategoryDetailsLoading || isPackageLoading}
                />
              </div>
            </Card>
          </div>
        );

      default:
        return (
          <div className="w-full flex items-center justify-center p-8">
            <div className="text-gray-500">
              {fraudSubCategoryDetailsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                `No view available for type: ${selectedAnalysisType}`
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full overflow-x-hidden">
      {/* In-Depth Anomaly Analysis Section */}
      <div className="w-full p-4 border-2 border-gray-200 rounded-md">
        <div className="w-full">
          <div className="w-full bg-gray-200 text-sub-header font-semibold text-center sm:text-body p-2">
            In-Depth Anomaly Analysis
          </div>
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 w-full gap-1 min-h-[140px]">
              <Card
                ref={(el) => {
                  if (el) cardRefs.current["fraud_categories"] = el;
                }}
                className="p-4 w-full h-[320px]"
              >
                <DonutChart
                  chartData={donutData}
                  chartConfig={donutConfig}
                                  onExport={() => {
                  onExportChart("png","Fraud Categories","fraud_categories")
                }}
                  onExpand={() => {
                    handleExpand("fraud_categories");
                  }}
                  title="Fraud Categories"
                  isLoading={fraudStatsLoading && !isExportingFraudCategories || isPackageLoading}
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
                  handleExport={() => {
                    if (fraudCategoriesApi.type === "mutation") {
                      setIsExportingFraudCategories(true);
                      setFraudStatsLoading(false);
                      fraudCategoriesApi.result.mutate({
                        start_date: startDate,
                        end_date: endDate,
                        package_name: selectedPackage,
                        publisher: publisherfilter,
                        campaign_id: campaignfilter,
                        country: countryfilter,
                        export_type: "csv",
                      });
                    }
                  }}
                  onSegmentClick={handleDonutSegmentClick}
                />
              </Card>

              <Card
                ref={(el) => {
                  if (el) cardRefs.current["fraud_sub_categories"] = el;
                }}
                className="p-4 w-full h-[320px] overflow-hidden col-span-2"
              >
                <div className="h-full">
                  <ProgressBarChart
                    chartData={progressBarData}
                    title={`Fraud Sub Categories for ${onclickvalue ? `${onclickvalue}` : "Bots"}`}
                    isLoading={progressBarLoading && !isExportingProgressBar || isPackageLoading}
                    handleExport={() => {
                      if (progressBarApi.type === "mutation") {
                        setIsExportingProgressBar(true);
                        setProgressBarLoading(false);
                        progressBarApi.result.mutate({
                          start_date: startDate,
                          end_date: endDate,
                          package_name: selectedPackage,
                          category: onclickvalue ? `${onclickvalue}` : "Bots",
                          publisher: publisherfilter,
                          campaign_id: campaignfilter,
                          country: countryfilter,
                          export_type: "csv",
                        });
                      }
                    }}
                    onExpand={() => handleExpand("fraud_sub_categories")}
                                      onExport={() => {
                    onExportChart("png","Fraud Sub Categories","fraud_sub_categories")
                  }}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Second Row - Fraud Sub Categories For Click Fraud */}
        <div className="w-full mt-1">
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
              <div className="w-full">
                <Card
                  ref={(el) => {
                    if (el) cardRefs.current["date_wise_fraud_sub_categories"] = el;
                  }}
                  className="p-4 w-full h-[420px]"
                >
                  <div className="h-full">
                    <ChartAreaGradient
                      chartData={areaChartData1}
                      chartConfig={areaBarConfig}
                      XaxisLine={true}
                      Xdatakey="label"
                      CartesianGridVertical={true}
                      title={`Date Wise Fraud Sub Categories For ${onclickvalue ? `${onclickvalue}` : "Bots"}`}
                      handleExport={() => {
                        if (areaChartResult && "mutate" in areaChartResult) {
                          setIsExportingAreaChart(true);
                          setAreaChartLoading(false);
                          areaChartResult.mutate({
                            ...areaChartPayload,
                            export_type: "csv",
                          });
                        }
                      }}
                      onExpand={() => handleExpand("date_wise_fraud_sub_categories")}
                                        onExport={() => {
                    onExportChart("png","Date Wise Fraud Sub Categories","date_wise_fraud_sub_categories")
                  }}
                      isLoading={areaChartApiLoading && !isExportingAreaChart || isPackageLoading}
                    />
                  </div>
                </Card>
              </div>
              <div className="w-full">
                <Card
                  ref={(el) => {
                    if (el)
                      cardRefs.current["publisher_vendor_fraud_sub_categories"] = el;
                  }}
                  className="p-4 w-full h-[420px] overflow-hidden"
                >
                  <CardTitle className="p-2">
                    <HeaderRow
                      handleExport={() => {
                        if (reattributionApi.type === "mutation") {
                          setIsExportingReattribution(true);
                          setReattributionLoading(false);
                          reattributionApi.result.mutate({
                            start_date: startDate,
                            end_date: endDate,
                            package_name: selectedPackage,
                            category: onclickvalue ? `${onclickvalue}` : "Bots",
                            publisher: publisherfilter,
                            campaign_id: campaignfilter,
                            country: countryfilter,
                            export_type: "csv",
                          });
                        }
                      }}
                      onExpand={() =>
                        handleExpand("publisher_vendor_fraud_sub_categories")
                      }
                                              onExport={() => {
                          onExportChart("png","Publisher/Vendor Wise Fraud Sub Categories","publisher_vendor_fraud_sub_categories")
                        }}
                      title={`Publisher Wise Fraud Sub Categories For ${onclickvalue ? `${onclickvalue}` : "Bots"}`}
                      isSelect={true}
                    />
                  </CardTitle>
                  <div className="">
                    <div className="h-full">
                      <StackedBarChart
                        chartData={reattributionChartData}
                        chartConfig={reattributionStackedBarConfig}
                        onExport={() => {
                          onExportChart("png","Publisher/Vendor Wise Fraud Sub Categories","publisher_vendor_fraud_sub_categories")
                        }}
                        onExpand={() => {
                          handleExpand("publisher_vendor_fraud_sub_categories");
                        }}
                        isLoading={reattributionLoading && !isExportingReattribution || isPackageLoading}
                        isHorizontal={true}
                        isInformCard={false}
                        layoutDirection="flex-col"
                        isLegend={true}
                        ischangeLegend={true}
                        isCartesian={true}
                        yAxis={{ dataKey: "label" }}
                        AxisLabel="Count"
                        handleExport={() => {
                          if (reattributionApi.type === "mutation") {
                            setIsExportingReattribution(true);
                            setReattributionLoading(false);
                            reattributionApi.result.mutate({
                              start_date: startDate,
                              end_date: endDate,
                              package_name: selectedPackage,
                              category: onclickvalue ? `${onclickvalue}` : "Bots",
                              publisher: publisherfilter,
                              campaign_id: campaignfilter,
                              country: countryfilter,
                              export_type: "csv",
                            });
                          }
                        }}
                        showMenu={false}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Insights Section */}

      {fraudSubCategories.length > 0 &&
      <>
      <div className="w-full">
        <div className="w-full bg-gray-200 text-sub-header font-semibold text-center sm:text-body p-2 relative flex flex-col sm:flex-row sm:justify-center sm:items-center gap-2">
          {/* Title */}
          <span className="text-center w-full sm:w-auto">
            {onclickvalue ? onclickvalue : `Bots`}
          </span>

          {/* Dropdown / Message */}
          <div className="w-full sm:w-auto sm:absolute sm:right-2">
            {fraudSubCategories.length > 0 ? (
              <select
                value={selectedKey || ""}
                onChange={(e) => {
                  const key = e.target.value;
                  handleKeySelect(key);
                }}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-sm w-full sm:min-w-[180px]"
              >
                {fraudSubCategories.map((item) => (
                  <option
                    key={item.fraud_subcategory}
                    value={item.fraud_subcategory}
                  >
                    {item.fraud_subcategory}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-gray-500 block sm:inline">
                No sub categories available
              </span>
            )}
          </div>
        </div>

        <div className="w-full">
          {fraudSubCategories.length > 0 ? (
            renderIncentSamplesDynamicView()
          ) : (
            <div className="w-full flex items-center justify-center p-8">
              <div className="text-gray-500">
                {fraudSubCategoryLoading ? (
                  <div className="flex items-center gap-2"></div>
                ) : (
                  <span className="text-small-font font-medium text-black dark:text-white">
                    No Data Found!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      }
    </div>
  );
};

export default InDepthAnomalyAnalysis; 