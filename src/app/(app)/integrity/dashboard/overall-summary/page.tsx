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
import { Filter } from "@/components/mf/Filters/Filter";
import { ToggleButton } from "@/components/mf/ToggleButton";
import type { FilterApiResponse, PublisherApiResponse } from "./Types/index";
import StatsCards from "@/components/mf/StatsCards";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import DonutChart from "@/components/mf/charts/DonutChart";
import StackedBarWithLine1 from "@/components/mf/charts/StackedBarwithLine";
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
import { debounce, onExpand, downloadURI } from "@/lib/utils";
import domToImage from "dom-to-image";
import Publisher from "./Publisher";
import InDepthAnomalyAnalysis from "./InDepthAnomalyAnalysis";


const getPercentageKey = (sourceType: string) => {
  switch (sourceType) {
    case "Blocked":
      return "percentage";
    case "Forwarded":
      return "percentage";
   
    default:
      return "percentage";
  }
};

const Dashboard = () => {
  const { selectedPackage, isPackageLoading } = usePackage();
  const { startDate, endDate } = useDateRange();
  const [selectedType, setSelectedType] = useState<"impression" | "click">(
    "impression"
  );
  const [existingPublisherdata, setExistingPublisherdata] =
    useState<PublisherApiResponse>({
      Affiliate: [],
      "Whitelisted Affiliate": [""],
      "Whitelisted Publisher": [],
    });
  const [existingCampaigndata, setExistingCampaigndata] = useState<any[]>([]);
  const [existingCountrydata, setExistingCountrydata] = useState<string[]>([]);
  const [loadedFilter, setLoadedFilter] = useState<any>({});
  const [isResetting, setIsResetting] = useState(false);
  const [resetTimestamp, setResetTimestamp] = useState(Date.now());
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [query, setQuery] = useState({
    publishers: ["all"],
    campaigns: ["all"],
    country: ["all"],
  });

  const [cardData, setCardData] = useState<Record<string, { count: string | number; percentage?: string; color_code?: string }>>({});

  const [dwTrendSelectedFrequency, setDwTrendSelectedFrequency] =
  useState("Daily");


  const [onclickvalue, setonclickvalue] = useState("");

const dwTrendSelectOptions = ["Daily", "Weekly", "Monthly"];
const [dwTrendChartData, setDwTrendChartData] = useState<any[]>([]);
const [isExportingDwTrend, setIsExportingDwTrend] = useState(false);

  const COLOR_PALETTE = [
  "#5DADEC",
  "#FF7F0E",
  "#9B59B6",
  "#FF0000",
  "#b91c1c",
  "#604652",
  "#1E90FF",
  "#FFD700",
  "#FF69B4",
  "#8A2BE2",
  "#FF7F50",
  "#20B2AA",
  "#DC143C",
  "#00CED1",
  "#FF4500",
  "#2E8B57",
  "#DAA520",
  "#4B0082",
  "#7FFF00",
  "#D2691E",
  "#6495ED",
  "#FF6347",
  "#40E0D0",
  "#A0522D",
  "#C71585",
  "#BDB76B",
  "#4682B4",
  "#9ACD32",
  "#008B8B",
  "#B22222",
  "#5F9EA0",
  "#9932CC",
];

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
  // Split of Sources Chart Data State
  const [splitOfSourcesChartData, setSplitOfSourcesChartData] = useState<any[]>(
    []
  );
  const [splitOfSourcesChartConfig, setSplitOfSourcesChartConfig] =
    useState<any>({});
  const [isExportingData, setIsExportingData] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [publisherVendorChartData, setPublisherVendorChartData] = useState<
    any[]
  >([]);
  const [publisherVendorChartconfig, setPublisherVendorChartconfig] =
    useState();
  const [isExportingPublisherVendor, setIsExportingPublisherVendor] = useState(false);
  // Utility function to check if result is a mutation
  const isMutation = (result: any) => {
    return result && typeof result.mutate === "function";
  };

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

  // Publishers Filter API
  const publishersFilterApi = useApiCall<PublisherApiResponse>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/publisher`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/publisher`,
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      if (data) {
        setExistingPublisherdata(data);
      }
    },
    onError: (error) => {
      setExistingPublisherdata({
        Affiliate: [],
        "Whitelisted Affiliate": [],
        "Whitelisted Publisher": [],
      });
    },
  });

  // Campaigns Filter API
  const campaignsFilterApi = useApiCall<FilterApiResponse>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/campaign`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/campaign`,
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setExistingCampaigndata(data);
      } else if (data && Array.isArray(data.data)) {
        setExistingCampaigndata(data.data);
      } else {
        setExistingCampaigndata([]);
      }
    },
    onError: (error) => {
      setExistingCampaigndata([]);
    },
  });

  // Country filter api
  const countryFilterApi = useApiCall<FilterApiResponse>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/country`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/country`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      start_date: startDate,
      end_date: endDate,
    },
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setExistingCountrydata(data);
      } else if (data && Array.isArray(data.data)) {
        setExistingCountrydata(data.data);
      } else {
        setExistingCountrydata([]);
      }
    },
    onError: (error) => {
      setExistingCountrydata([]);
    },
  });
  // Create filter structure
  const filter = React.useMemo(() => {
    const publishersFilter = {
      Publishers: {
        filters:
          Object.keys(existingPublisherdata).length > 0
            ? Object.entries(existingPublisherdata).map(
                ([group, publishers]) => ({
                  label: group,
                  checked: true,
                  subItems: publishers.map((publisher: string) => ({
                    label: publisher,
                    checked:
                      query.publishers?.includes("all") ||
                      query.publishers?.includes(publisher) ||
                      !query.publishers,
                  })),
                })
              )
            : [
                {
                  label: "Affiliate",
                  checked: true,
                  subItems: [],
                },
                {
                  label: "Whitelisted Affiliate",
                  checked: true,
                  subItems: [],
                },
              ],
        isSelectAll:
          !query.publishers ||
          query.publishers.includes("all") ||
          query.publishers?.length ===
            Object.values(existingPublisherdata).flat().length,
        selectedCount: query.publishers?.includes("all")
          ? Object.values(existingPublisherdata).flat().length
          : (query.publishers?.length ??
            Object.values(existingPublisherdata).flat().length),
        loading: publishersFilterApi.loading,
      },
    };

    const otherFilters: Record<string, any> = {
      Campaigns: {
        filters:
          existingCampaigndata && existingCampaigndata.length > 0
            ? existingCampaigndata.map((campaign: string) => ({
                label: campaign,
                checked:
                  isResetting ||
                  query.campaigns?.includes("all") ||
                  query.campaigns?.includes(campaign) ||
                  !query.campaigns ||
                  query.campaigns?.length === 0,
              }))
            : [],
        isSelectAll:
          isResetting ||
          !query.campaigns ||
          query.campaigns.includes("all") ||
          query.campaigns?.length === 0 ||
          query.campaigns?.length === existingCampaigndata?.length,
        selectedCount:
          isResetting ||
          query.campaigns?.includes("all") ||
          query.campaigns?.length === 0
            ? (existingCampaigndata?.length ?? 0)
            : (query.campaigns?.length ?? existingCampaigndata?.length ?? 0),
        loading: campaignsFilterApi.loading,
      },
      Country: {
        filters:
          existingCountrydata && existingCountrydata.length > 0
            ? existingCountrydata.map((country: string) => ({
                label: country,
                checked:
                  isResetting ||
                  query.country?.includes("all") ||
                  query.country?.includes(country) ||
                  !query.country ||
                  query.country?.length === 0,
              }))
            : [],
        isSelectAll:
          isResetting ||
          !query.country ||
          query.country.includes("all") ||
          query.country?.length === 0 ||
          query.country?.length === existingCountrydata?.length,
        selectedCount:
          isResetting ||
          query.country?.includes("all") ||
          query.country?.length === 0
            ? (existingCountrydata?.length ?? 0)
            : (query.country?.length ?? existingCountrydata?.length ?? 0),
        loading: countryFilterApi.loading,
      },
    };

    return { publishersFilter, otherFilters };
  }, [
    existingPublisherdata,
    existingCampaigndata,
    existingCountrydata,
    query.publishers,
    query.campaigns,
    query.country,
    isResetting,
    publishersFilterApi.loading,
    campaignsFilterApi.loading,
    countryFilterApi.loading,
  ]);

  // Filter change handlers
  const handleFilterChange = useCallback(
    async (newState: Record<string, any>) => {
      console.log("newState1", newState);
      const publisherPayload = {
        publishers: newState.Publishers?.isSelectAll
          ? ["all"]
          : [
              ...(newState.Publishers?.filters?.Affiliate || []),
              ...(newState.Publishers?.filters?.["Whitelisted Affiliate"] ||
                []),
            ],
      };
      setQuery((prevQuery) => ({
        ...prevQuery,
        ...publisherPayload,
      }));

      const filtersChanged = !deepEqual(
        newState.Publishers?.filters || [],
        loadedFilter.Publishers?.filters || []
      );

      if (filtersChanged) {
        setLoadedFilter(newState);
      }
    },
    [loadedFilter]
  );

  const handleFilterChangeOther = useCallback(
    async (newState1: Record<string, any>) => {
      const otherPayload: any = {
        campaigns: newState1.Campaigns?.isSelectAll
          ? ["all"]
          : newState1.Campaigns?.filters
              .filter((f: any) => f.checked)
              .map((f: any) => f.label),
        country: newState1["Country"]?.isSelectAll
          ? ["all"]
          : newState1["Country"]?.filters
              .filter((f: any) => f.checked)
              .map((f: any) => f.label),
      };

      setQuery((prevQuery) => ({
        ...prevQuery,
        ...otherPayload,
      }));

      const filtersChanged =
        !deepEqual(
          newState1.Campaigns?.filters || [],
          loadedFilter.Campaigns?.filters || []
        ) ||
        !deepEqual(
          newState1["Country"]?.filters || [],
          loadedFilter["Country"]?.filters || []
        );

      if (filtersChanged) {
        setLoadedFilter((prevFilter: any) => ({
          ...prevFilter,
          ...newState1,
        }));
      }
    },
    [loadedFilter]
  );

  // Fetch functions
  const fetchPublisher = useCallback(() => {
    if (
      publishersFilterApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate
    ) {
      publishersFilterApi.result.mutate({
        package_name: selectedPackage,
        start_date: startDate,
        end_date: endDate,
      });
    }
  }, [publishersFilterApi, selectedType, selectedPackage, startDate, endDate]);

  const fetchCampaign = useCallback(() => {
    if (
      campaignsFilterApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate
    ) {
      campaignsFilterApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
      });
    }
  }, [campaignsFilterApi, selectedType, selectedPackage, startDate, endDate]);

  const fetchCountry = useCallback(() => {
    if (
      countryFilterApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate
    ) {
      countryFilterApi.result.mutate({
        package_name: selectedPackage,
        start_date: startDate,
        end_date: endDate,
      });
    }
  }, [countryFilterApi, selectedType, selectedPackage, startDate, endDate]);

  const fetchAllData = useCallback(() => {
    fetchCountry();
    fetchCampaign();
    fetchPublisher();
  }, [selectedType, selectedPackage, startDate, endDate]);

  // Utility function for deep comparison
  const deepEqual = (arr1: any[], arr2: any[]) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    return arr1.every(
      (item, index) =>
        item.checked === arr2[index].checked && item.label === arr2[index].label
    );
  };

  // Effect to clear data when selectedType changes
  useEffect(() => {
    setExistingCampaigndata([]);
    setExistingCountrydata([]);
    setExistingPublisherdata({
      Affiliate: [],
      "Whitelisted Publisher": [],
    });
  }, [selectedType, startDate, endDate]);

  // Check if filter data is loaded - Modified to allow API calls even without complete filter data
  const isFilterDataLoaded = useMemo(() => {
    return (
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      !isPackageLoading && // Package is not loading
      ((existingPublisherdata && Object.keys(existingPublisherdata).length > 0) ||
      (existingCampaigndata && existingCampaigndata.length > 0) ||
      (existingCountrydata && existingCountrydata.length > 0))
    );
  }, [existingPublisherdata, existingCampaigndata, existingCountrydata, selectedPackage, startDate, endDate, isPackageLoading]);

  // Check if any filter APIs are loading
  const isFilterLoading = useMemo(() => {
    return (
      publishersFilterApi.loading ||
      campaignsFilterApi.loading ||
      countryFilterApi.loading
    );
  }, [publishersFilterApi.loading, campaignsFilterApi.loading, countryFilterApi.loading]);

  // Effect to fetch all filter data when conditions change
  useEffect(() => {
    if (selectedPackage && selectedPackage.length > 0 && startDate && endDate) {
      fetchAllData();
    }
  }, [selectedType, selectedPackage, startDate, endDate]);

  // Reset query state when selectedType changes
  useEffect(() => {
    setIsResetting(true);
    setResetTimestamp(Date.now());
    setQuery({
      publishers: ["all"],
      campaigns: ["all"],
      country: ["all"],
    });
    setLoadedFilter({});

    const timer = setTimeout(() => {
      setIsResetting(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedType, selectedPackage, startDate, endDate]);

  // api call for total percentage
  const totalPercentageApi = useApiCall<any>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/total_percentage`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/total_percentage`,
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      // Data comes in format: { "Total": { count: "...", color_code: "..." }, ... }
      setCardData(data || {});
    },
    onError: () => {
      setCardData({});
    },
  });

  useEffect(() => {
    if (
      totalPercentageApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      isFilterDataLoaded
    ) {
      console.log("Triggering total percentage API call");
      totalPercentageApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        publisher: query.publishers,
        campaign_id: query.campaigns,
        country: query.country,
      });
    }
  }, [
    startDate,
    endDate,
    selectedType,
    query.publishers,
    query.campaigns,
    query.country,
    selectedPackage,
    isFilterDataLoaded,
  ]);

  // Single API call for split of sources (both data and export)
  const splitOfSourcesApi = useApiCall<any>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/source_split`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/source_split`,
    method: "POST",
    manual: true,
    onSuccess: (response: any) => {
      if (response && response.url) {
        const link = document.createElement("a");
        link.href = response.url;
        link.setAttribute("download", "split_of_sources.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportingData(false);
      }
       else {
        let dataArray = [];
        if (Array.isArray(response)) {
          dataArray = response.filter((item: any) => item.total_count > 0);
        } else if (response && Array.isArray(response.data)) {
          dataArray = response.data.filter((item: any) => item.total_count > 0);
        } else if (response && response.response && Array.isArray(response.response)) {
          dataArray = response.response.filter((item: any) => item.total_count > 0);
        } 

        if (dataArray && dataArray.length > 0) {
          const labelColorMap: Record<string, string> = {};
          let colorIndex = 0;
          const mapped = dataArray.map((item: any) => {
            const label = item.source_type || item.label || item.name || item.category;
            if (!labelColorMap[label]) {
              labelColorMap[label] =
                COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
              colorIndex++;
            }
            const visit = item.total_count || item.count || item.value || item.visit || 0;
            const percentage = item[getPercentageKey(label)] || item.percentage || item.percent || "";
            const fill = labelColorMap[label];
            return { label, visit, percentage, fill };
          });
          console.log("Mapped split of sources data:", mapped);
          setSplitOfSourcesChartData(mapped);
          const config: Record<string, { label: string; color: string }> = {};
          mapped.forEach(
            (item: {
              label: string;
              visit: number;
              percentage: string;
              fill: string;
            }) => {
              config[item.label] = { label: item.label, color: item.fill };
            }
          );
          setSplitOfSourcesChartConfig(config);
        } else {
          console.log("No data received from split of sources API");
          setSplitOfSourcesChartData([]);
          setSplitOfSourcesChartConfig({});
        }
        setIsDataLoading(false);
      }
    },
    onError: () => {
      setSplitOfSourcesChartData([]);
      setSplitOfSourcesChartConfig({});
      setIsExportingData(false);
      setIsDataLoading(false);
    },
  });

  // Fetch split of sources data on component mount and dependency changes
  useEffect(() => {
    if (
      splitOfSourcesApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      isFilterDataLoaded
    ) {
      console.log("Triggering split of sources API call", {
        selectedType,
        selectedPackage,
        startDate,
        endDate,
        publishers: query.publishers,
        campaigns: query.campaigns,
        country: query.country,
      });
      setIsDataLoading(true);
      splitOfSourcesApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        publisher: query.publishers,
        campaign_id: query.campaigns,
        country: query.country,
      });
    }
  }, [
    startDate,
    endDate,
    selectedType,
    selectedPackage,
    query.publishers,
    query.campaigns,
    query.country,
    isFilterDataLoaded,
  ]);

  // api call for date wise trend
  const dwTrendFrequencyMap: Record<string, string> = {
    Daily: "daily",
    Weekly: "weekly",
    Monthly: "monthly",
  };
  const [dwTrendChartConfig, setDwTrendChartConfig] = useState();
  const dwTrendApiResult = useApiCall<any>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/trends`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/trends`,
    method: "POST",
    manual: true,
    onSuccess: (response: any) => {
      if (response && response.url) {
        const link = document.createElement("a");
        link.href = response.url;
        link.setAttribute("download", "date_wise_trend.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportingDwTrend(false);
      } else {
        setDwTrendChartData(response?.data);
        setDwTrendChartConfig(response?.config);
      }
    },
    onError: () => {
      setDwTrendChartData([]);
      setIsExportingDwTrend(false);
    },
  });

  useEffect(() => {
    if (
      dwTrendApiResult.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      isFilterDataLoaded
    ) {
      console.log("Triggering date wise trend API call");
      dwTrendApiResult.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        frequency: dwTrendFrequencyMap[dwTrendSelectedFrequency],
        publisher: query.publishers,
        campaign_id: query.campaigns,
        country: query.country,
      });
    }
  }, [
    dwTrendSelectedFrequency,
    startDate,
    endDate,
    selectedType,
    query.publishers,
    query.campaigns,
    query.country,
    selectedPackage,
    isFilterDataLoaded,
  ]);

  const handleDwTrendFrequencyChange = (value: string) => {
    setDwTrendSelectedFrequency(value);
  };

  // Add state for fraud categories
  const [donutData, setDonutData] = useState<any[]>([]);
  const [donutConfig, setDonutConfig] = useState<any>({});
  const [isExportingFraudCategories, setIsExportingFraudCategories] = useState(false);
  const [fraudStatsLoading, setFraudStatsLoading] = useState(false);

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
        console.log("Fraud categories API response:", response);
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
        setDonutData(mapped);
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

  useEffect(() => {
    if (
      fraudCategoriesApi.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      isFilterDataLoaded
    ) {
      console.log("Triggering fraud categories API call");
      setFraudStatsLoading(true);
      fraudCategoriesApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        publisher: query.publishers,
        campaign_id: query.campaigns,
        country: query.country,
      });
    }
  }, [
    startDate,
    endDate,
    query.publishers,
    query.campaigns,
    query.country,
    selectedPackage,
    selectedType,
    isFilterDataLoaded,
  ]);

  // api call for publisher  trend

  const publisherVendorApiResult = useApiCall<any[]>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/integrity/${selectedType}/publisher_trends`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `integrity/${selectedType}/publisher_trends`,
    method: "POST",
    manual: true,
    onSuccess: (response: any) => {
      if (response && response.url) {
        const link = document.createElement("a");
        link.href = response.url;
        link.setAttribute("download", "publisher_vendor_trend.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportingPublisherVendor(false);
      } else {
        setPublisherVendorChartData(response.data);
        setPublisherVendorChartconfig(response.config);
      }
    },
    onError: () => {
      setPublisherVendorChartData([]);
      setIsExportingPublisherVendor(false);
    },
  });


  useEffect(() => {
    if (
      publisherVendorApiResult.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      isFilterDataLoaded
    ) {
      console.log("Triggering publisher vendor API call");
      publisherVendorApiResult.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        publisher: query.publishers,
        campaign_id: query.campaigns,
        country: query.country,
      });
    }
  }, [
    startDate,
    endDate,
    selectedPackage,
    selectedType,
    query.publishers,
    query.campaigns,
    query.country,
    isFilterDataLoaded,
  ]);
  

  // Comprehensive loading state for data APIs
  const isDataApiLoading = useMemo(() => {
    return (
      isFilterLoading || // Filter APIs are actually loading
      (dwTrendApiResult.loading && !isExportingDwTrend) ||
      isPackageLoading // Package is loading
    );
  }, [isFilterLoading, dwTrendApiResult.loading, isExportingDwTrend, isPackageLoading]);

  // Loading state for split of sources chart
  const isSplitSourcesLoading = useMemo(() => {
    return (
      isFilterLoading || // Filter APIs are actually loading
      isDataLoading ||
      (splitOfSourcesApi.loading && !isExportingData) ||
      isPackageLoading // Package is loading
    );
  }, [isFilterLoading, isDataLoading, splitOfSourcesApi.loading, isExportingData, isPackageLoading]);

  // Loading state for stats cards
  const isStatsLoading = useMemo(() => {
    return (
      isFilterLoading || // Filter APIs are actually loading
      totalPercentageApi.loading ||
      isPackageLoading // Package is loading
    );
  }, [isFilterLoading, totalPercentageApi.loading, isPackageLoading]);

  const isPublisherVendorLoading = useMemo(() => {
    return (
      isFilterLoading || // Filter APIs are actually loading
      (publisherVendorApiResult.loading && !isExportingPublisherVendor) ||
      isPackageLoading // Package is loading
    );
  }, [isFilterLoading, publisherVendorApiResult.loading, isExportingPublisherVendor, isPackageLoading]);


  // Add missing API call for donut chart click handling
  const handleDonutClick = (data: any) => {
    setonclickvalue(data?.label || data?.name);
  };

  return (
    <>
      <div className="flex flex-col gap-3 w-full min-h-screen bg-gradient-to-br from-background via-background to-background/95">
        {/* Enhanced Filters Row + Toggle */}
        <div className="sticky top-0 z-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl bg-card/50 backdrop-blur-md border border-border/30 shadow-lg px-4 py-4 md:px-6 md:py-5 transition-all duration-300 hover:bg-card/60 hover:border-border/50">
          {/* Filters Section with improved spacing */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full flex-wrap">
            <Filter
              key={`publishers-${selectedType}-${resetTimestamp}-${JSON.stringify(existingPublisherdata)} ${selectedPackage}`}
              filter={filter.publishersFilter}
              onChange={handleFilterChange}
              grouped={true}
              publisherGroups={{ Publishers: existingPublisherdata }}
            />
            <Filter
              key={`other-${selectedType}-${resetTimestamp}-${existingCountrydata.length}-${existingCampaigndata.length}`}
              filter={filter.otherFilters}
              onChange={handleFilterChangeOther}
              grouped={false}
            />
          </div>

          {/* Toggle Button Section - styled consistently */}
          <div className="self-end md:self-auto flex items-center gap-2">
            <ToggleButton
              options={[
                 { label: "Impression", value: "impression" },
                { label: "Click", value: "click" },

              ]}
              selectedValue={selectedType}
              onChange={(value) =>
                setSelectedType(value as "click" | "impression")
              }
            />
          </div>
        </div>
        <StatsCards
          data={cardData}
          customLabels={{
            Total: `Total ${selectedType === "click" ? "Clicks" : "Impressions"}`,
            Valid: `Valid ${selectedType === "click" ? "Clicks" : "Impressions"}`,
            Invalid: `Invalid ${selectedType === "click" ? "Clicks" : "Impressions"}`
          }}
          isLoading={isStatsLoading}
          className="mb-2"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 w-full gap-3 min-h-[320px]">
          <Card
            ref={(el) => {
              if (el) cardRefs.current["split_of_sources"] = el;
            }}
            className="w-full shadow-md hover:shadow-xl rounded-xl border-border/40 bg-card dark:bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-border/60 gap-2 h-full"
          >
            <CardContent className="w-full min-h-[300px]">
              <DonutChart
                chartData={splitOfSourcesChartData}
                chartConfig={splitOfSourcesChartConfig}
                title="Split Of Sources"
                handleExport={() => {
                  if (splitOfSourcesApi.type === "mutation") {
                    setIsExportingData(true);
                    splitOfSourcesApi.result.mutate({
                      start_date: startDate,
                      end_date: endDate,
                      package_name: selectedPackage,
                      publisher: query.publishers,
                      campaign_id: query.campaigns,
                      country: query.country,
                      export_type: "csv",
                    });
                  }
                }}
                onExpand={() => {
                  handleExpand("split_of_sources");
                }}
                onExport={() => {
                  onExportChart("png", "Split Of Sources", "split_of_sources");
                }}
                dataKey="visit"
                nameKey="label"
                isLoading={isSplitSourcesLoading}
                isView={true}
                direction="flex-col"
                isdonut={false}
                marginTop="mt-0"
                position="items-start"
                isPercentage={false}
                isPercentageValue={true}
                istotalvistors={false}
                onSegmentClick={handleDonutClick}
              />
            </CardContent>
          </Card>
          <Card
            ref={(el) => {
              if (el) cardRefs.current["date_wise_trend"] = el;
            }}
            className="w-full shadow-md hover:shadow-xl rounded-xl border-border/40 bg-card dark:bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-border/60 h-[320px] lg:col-span-2"
          >
            <CardTitle className="p-2">
              <HeaderRow
                title="Date Wise Trend"
                isSelect={true}
                selectoptions={dwTrendSelectOptions}
                selectedFrequency={dwTrendSelectedFrequency}
                handleFrequencyChange={handleDwTrendFrequencyChange}
                placeholder="Daily"
                handleExport={() => {
                  if (dwTrendApiResult.type === "mutation") {
                    setIsExportingDwTrend(true);
                    dwTrendApiResult.result.mutate({
                      start_date: startDate,
                      end_date: endDate,
                      package_name: selectedPackage,
                      frequency: dwTrendFrequencyMap[dwTrendSelectedFrequency],
                      publisher: query.publishers,
                      campaign_id: query.campaigns,
                      country: query.country,
                      export_type: "csv",
                    });
                  }
                }}
                onExpand={() => {
                  handleExpand("date_wise_trend");
                }}
                onExport={() => {
                  onExportChart("png","Date Wise Trend","date_wise_trend")
                }}
              />
            </CardTitle>
            <CardContent className="w-full h-full overflow-y-auto scrollbar">
              <div className="w-full overflow-x-auto scrollbar h-full">
                <StackedBarWithLine1
                  chartData={dwTrendChartData}
                  chartConfig={dwTrendChartConfig}
                  isLegend={true}
                  isLoading={isDataApiLoading}
                  onExpand={() => {
                    handleExpand("date_wise_trend");
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full p-0">
          <Card
            ref={(el) => {
              if (el) cardRefs.current["publisher_vendor_trend"] = el;
            }}
            className="w-full shadow-md hover:shadow-xl rounded-xl border-border/40 bg-card dark:bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-border/60 h-[320px]"
          >
            <CardTitle className="p-2">
              <HeaderRow
                title="Publisher Wise Trend" 
                isSelect={false}
                handleExport={() => {
                  if (publisherVendorApiResult.type === "mutation") {
                    setIsExportingPublisherVendor(true);
                    publisherVendorApiResult.result.mutate({
                      start_date: startDate,
                      end_date: endDate,
                      package_name: selectedPackage,
                      publisher: query.publishers,
                      campaign_id: query.campaigns,
                      country: query.country,
                      export_type: "csv",
                    });
                  }
                }}
                onExpand={() => {
                  handleExpand("publisher_vendor_trend");
                }}
                onExport={() => {
                  onExportChart("png","Publisher/Vendor Wise Trend","publisher_vendor_trend")
                }}
              />
            </CardTitle>
            <CardContent className="w-full h-full overflow-y-auto scrollbar">
              <div className="w-full overflow-x-auto scrollbar h-full">
                <StackedBarWithLine1
                  chartData={publisherVendorChartData}
                  chartConfig={publisherVendorChartconfig}
                  isLegend={true}
                  isLoading={isPublisherVendorLoading}
                  onExpand={() => {
                    handleExpand("publisher_vendor_trend");
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-2 w-full overflow-x-hidden">
          <InDepthAnomalyAnalysis
            selectedType={selectedType}
            publisherfilter={query.publishers}
            campaignfilter={query.campaigns}
            countryfilter={query.country}
            onclickvalue={onclickvalue}
            setonclickvalue={setonclickvalue}
          />
        </div>

        <Publisher
          publisherfilter={query.publishers}
          campaignfilter={query.campaigns}
          countryfilter={query.country}
          eventTypeFilter={["all"]}
           selectedTypeFromDashboard={selectedType}
        />
      </div>
    </>
  );
};

export default Dashboard;
