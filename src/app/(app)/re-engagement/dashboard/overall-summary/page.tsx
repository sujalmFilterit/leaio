"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import StackedBarWithLine1 from "@/components/mf/charts/StackedBarwithLine";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import HeaderRow from "@/components/mf/HeaderRow";
import { onExpand, downloadURI, debounce, } from "@/lib/utils";
import {  ChartData } from "@/lib/chartutils";
import Endpoint from "@/common/endpoint";
import { useApiCall } from "@/services/api_base";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import DonutChart from "@/components/mf/charts/DonutChart";
import StatsCards from "@/components/mf/StatsCards";
import Publisher from "./Publisher";
import ResizableTable from "@/components/mf/ReportingToolTable";
import InDepthAnomalyAnalysis from "./InDepthAnomalyAnalysis";

import domToImage from "dom-to-image";

import DoubleLineChart from "@/components/mf/charts/DoubleLineChart";
import StackedBarChart from "@/components/mf/charts/stackedBarChart";

import { Filter } from "@/components/mf/Filters/Filter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Loader2 } from "lucide-react";
import ChartAreaGradient from "@/components/mf/charts/ChartAreaGradient";
import ProgressBarChart from "@/components/mf/charts/ProgressBarChart";
import { ToggleButton } from "@/components/mf/ToggleButton";

//color
interface ChartConfig {
  [key: string]: { label: string; color: string };
}

interface FraudCategory {
  color: string;
  label: string;
}

interface ColorConfig {
  [key: string]: FraudCategory;
  Invalid: FraudCategory;
  Valid: FraudCategory;
  DeviceRepetition: FraudCategory;
  IPRepeat: FraudCategory;
  ImperceptibleWindow: FraudCategory;
  DeviceSpoofing: FraudCategory;
  DeprecatedOS: FraudCategory;
  BrandBidding: FraudCategory;
  DeprecatedBrowser: FraudCategory;
  IPRepeatHourly: FraudCategory;
  ServerFarm: FraudCategory;
  PopUnder: FraudCategory;
  FakeDevice: FraudCategory;
  VPNProxy: FraudCategory;
  GeoFraud: FraudCategory;
  TimezoneMismatch: FraudCategory;
  DuplicateUser: FraudCategory;
  DistributionFraud: FraudCategory;
  BlacklistedUA: FraudCategory;
  ClickSpamming: FraudCategory;
  MouseClickPattern: FraudCategory;
  MouseMovementPattern: FraudCategory;
  DomainSpoofing: FraudCategory;
  AdStacking: FraudCategory;
  PlacementFraud: FraudCategory;
  SuspiciousDeviceRepetition: FraudCategory;
  SuspiciousBrowser: FraudCategory;
  SuspiciousOS: FraudCategory;
  NotFraud: FraudCategory;
  Cookiestuffing: FraudCategory;
  Clickinjection: FraudCategory;
  StackedClick: FraudCategory;
  PunchLead: FraudCategory;
  FakeEvent: FraudCategory;
  BotEvent: FraudCategory;
  GeoHopFraud: FraudCategory;
  BehaviorFraud: FraudCategory;
}
interface ConfigData {
  _id: string;
  ColorConfig: ColorConfig;
}

interface ColumnC {
  title: string;
  key: keyof Datac;
}
interface Datac {
  campaign_id: string;
  total_visits: number;
  visit_invalid_percent: number;
  total_events: number;
  event_invalid_percent: number;
}

interface campaignData {
  data: Datac[];
  total_records: number;
  page_number: number;
  limit: number;
  total_pages: number;
  search_term: string;
  package_name: string;
  publisher: string[];
  sub_publisher: string[];
  campaign: string[];
  channel: string[];
  agency:string[];
}


//Top 5 Sources
interface ColumnS {
  title: string;
  key: keyof DataP;
}
interface DataP {
  publisher_name: string;
  total_visits: number;
  visit_invalid_percent: string;
  total_events: number;
  event_invalid_percent: string;
  valid_conv_rate: string;
  invalid_conv_rate: string;
}

//traffic count
interface TrafficEvents {
  total_traffic: number;
  valid_traffic: number;
  invalid_traffic: number;
  valid_traffic_percent: string;
  invalid_traffic_percent: string;
}

interface TrafficVisits {
  total_traffic: number;
  valid_traffic: number;
  invalid_traffic: number;
  valid_traffic_percent: string;
  invalid_traffic_percent: string;
}

interface TrafficComparison {
  valid_conversion_rate: string;
  invalied_conversion_rate: string;
  conversion_rate: string;
}


// Add type for API response
interface FilterApiResponse {
  data: string[];
  isLoading: boolean;
}

// Add type for publisher API response
interface PublisherApiResponse {
  Affiliate: string[];
  "Whitelisted Publisher": string[];
  [key: string]: string[]; // Add index signature to make it compatible
}


// Add COLOR_PALETTE and getPercentageKey at the top (after imports, before Dashboard)
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

const getPercentageKey = (sourceType: string) => {
  switch (sourceType) {
    case "Affiliate1":
      return "affiliate_percentage";
    case "Organic1":
      return "organic_percentage";
    case "Google Meta1":
      return "google_meta_percentage";
    default:
      return "percentage";
  }
};

const Dashboard = () => {
  const { selectedPackage, isPackageLoading } = usePackage();
  const { startDate, endDate } = useDateRange();
  const [selectedType, setSelectedType] = useState<"click" | "conversion" | "event">(
    "click"
  );

  // Helper function to map frontend types to backend API types
  const getApiType = (type: "click" | "conversion" | "event"): "click" | "conversion" | "event" => {
    return type; // Use the selectedType directly in API URLs
  };
  const [selectedRadio, setSelectedRadio] = useState<"Publisher" | "Vendor">(
    "Publisher"
  );

  const [selectedFrequencyV, setSelectedFrequencyV] = useState("date");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [existingvisit, setExistingvisit] = useState<any>([]);
  const [Existingevent, setExistingevent] = useState<any>([]);
  const [existingCampaign, setExistingCampaign] = useState<any>([]);
  const [existingPublisher, setExistingPublisher] = useState<any>([]);
  const [ExistingVpublisher, setExistingvPublisher] = useState<any>([]);
  const [ExistingEpublisher, setExistingEPublisher] = useState<any>([]);
  const [existingVtrend, setExistingVtrend] = useState<any>([]);
  const [existingEtrend, setExistingEtrend] = useState<any>([]);
  const [currentPagep, setCurrentPagep] = useState(1);
  const [currentPagec, setCurrentPagec] = useState(1);
  const [limitps, setLimitp] = useState(10);
  const [limitpc, setLimitc] = useState(10);
  const [colorConfig, setColorConfig] = useState<ChartConfig>({});
  const [chartConfigs, setChartConfig] = useState<ChartConfig>({});
  const [chartConfigvp, setChartConfigvp] = useState<any>({});
  const [chartConfigep, setChartConfigep] = useState<any>({});
  const [chartConfigVisit, setChartConfigVisit] = useState({});
  const [chartConfigEvent, setChartConfigEvent] = useState({});
  const [chartDatav, setChartDatav] = useState<ChartData[]>([]);
  const [chartDataE, setChartDataE] = useState<ChartData[]>([]);
  const [searchTermP, setSearchTermP] = useState("");
  const [searchTermC, setSearchTermC] = useState("");
  const [fraudStatsLoading, setFraudStatsLoading] = useState(false);
  const [totalRecordTP, setTotalRecordTP] = useState<number>(0);
  const [TotalRecordTC, setTotalRecordTC] = useState<number>(0);
  const [areaChartLoading, setAreaChartLoading] = useState(false);
  const [onclickvalue, setonclickvalue] = useState("");

  const [existingPublisherdata, setExistingPublisherdata] =
    useState<PublisherApiResponse>({
      Affiliate: [],
      "Whitelisted Publisher": [],
    });
  const [existingCampaigndata, setExistingCampaigndata] = useState<any[]>([]);
  const [existingAgencydata, setExistingAgencydata] = useState<any[]>([]);
  const [existingCountrydata, setExistingCountrydata] = useState<string[]>([]);
  const [existingEventTypedata, setExistingEventTypedata] = useState<string[]>(
    []
  );
  const exportCsvRef = useRef(false);

  // Add state to track filter API completion
  const [filterApisCompleted, setFilterApisCompleted] = useState(false);
  const [filterApisLoading, setFilterApisLoading] = useState(false);

  const [loadedFilter, setLoadedFilter] = useState<any>({});
  const [isResetting, setIsResetting] = useState(false);

  // Add additional buffer state to prevent flashing
  const [initialLoadingBuffer, setInitialLoadingBuffer] = useState(true);
  
  // Add comprehensive loading state management
  const isInitialLoading = useMemo(() => {
    return (
      isPackageLoading || 
      filterApisLoading || 
      !filterApisCompleted ||
      isResetting ||
      initialLoadingBuffer
    );
  }, [isPackageLoading, filterApisLoading, filterApisCompleted, isResetting, initialLoadingBuffer]);
  const [resetTimestamp, setResetTimestamp] = useState(Date.now());
  const [query, setQuery] = useState({
    publishers: ["all"],
    campaigns: ["all"],
    country: ["all"],
    event_type: ["all"],
    agency: ["all"],
  });
  const [selectedFrequency, setSelectedFrequency] = useState("Daily");
  const TRENDS_API_URL =
    "https://uat-api-dev.mfilterit.net/v1/app/install/trends";
  const frequencyMap: Record<string, string> = {
    Daily: "daily",
    Weekly: "weekly",
    Monthly: "monthly",
  };
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


  useEffect(() => {
    setExistingCampaigndata([]);
    setExistingAgencydata([]);
    setExistingCountrydata([]);
    setExistingEventTypedata([]);
    setExistingPublisherdata({
      Affiliate: [],
      "Whitelisted Publisher": [],
    });
    
    // Clear event type data when switching from event to click/conversion
    if (selectedType !== "event") {
      setExistingEventTypedata([]);
    }
  }, [selectedType, startDate, endDate]);



  // Publishers Filter API
  const publishersFilterApi = useApiCall<PublisherApiResponse>({
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/publisher`,
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      // Store the entire response structure
      if (data) {
        setExistingPublisherdata(data);
      }
    },
    onError: (error) => {
      // console.error("Publishers Filter Error:", error);
      setExistingPublisherdata({
        Affiliate: [],
        "Whitelisted Publisher": [],
      });
    },
  });



  // Campaigns Filter API
  const campaignsFilterApi = useApiCall<FilterApiResponse>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/${getApiType(selectedType)}/campaign`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/campaign`,
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      // Handle the response properly - it could be an array or an object with data property
      if (Array.isArray(data)) {
        setExistingCampaigndata(data);
      } else if (data && Array.isArray(data.data)) {
        setExistingCampaigndata(data.data);
      } else {
        setExistingCampaigndata([]);
      }
    },
    onError: (error) => {
      console.error("Campaign Filter Error:", error);
      setExistingCampaigndata([]);
    },
  });
  //agency filter api
  const agencyFilterApi = useApiCall<FilterApiResponse>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/${getApiType(selectedType)}/agency`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/agency`,
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      // Handle the response properly - it could be an array or an object with data property
      if (Array.isArray(data)) {
        setExistingAgencydata(data);
      } else if (data && Array.isArray(data.data)) {
        setExistingAgencydata(data.data);
      } else {
        setExistingAgencydata([]);
      }
    },
    onError: (error) => {
      console.error("Campaign Filter Error:", error);
      setExistingAgencydata([]);
    },
  });
  //country filter api

  const countryFilterApi = useApiCall<FilterApiResponse>({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/${getApiType(selectedType)}/country`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/country`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      start_date: startDate,
      end_date: endDate,
    },
    onSuccess: (data) => {
      // Handle the country response properly - it's an array of country codes
      if (Array.isArray(data)) {
        setExistingCountrydata(data);
      } else if (data && Array.isArray(data.data)) {
        setExistingCountrydata(data.data);
      } else {
        setExistingCountrydata([]);
      }
    },
    onError: (error) => {
      // console.error("Country Filter Error:", error);
      setExistingCountrydata([]);
    },
  });

  //event type filter api
  const eventTypeFilterApi = useApiCall<FilterApiResponse>({
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/event/event_list`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      start_date: startDate,
      end_date: endDate,
    },
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setExistingEventTypedata(data);
      }
    },
    onError: (error) => {
      setExistingEventTypedata([]);
    },
  });

  console.log("ttt11", existingCampaigndata);

  const filter = React.useMemo(() => {
    const publishersFilter = {
      Publishers: {
        filters: Object.entries(existingPublisherdata).map(
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
        ),
        is_select_all:
          !query.publishers ||
          query.publishers.includes("all") ||
          query.publishers?.length ===
            Object.values(existingPublisherdata).flat().length,
        selected_count: query.publishers?.includes("all")
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
        is_select_all:
          isResetting ||
          !query.campaigns ||
          query.campaigns.includes("all") ||
          query.campaigns?.length === 0 ||
          query.campaigns?.length === existingCampaigndata?.length,
        selected_count:
          isResetting ||
          query.campaigns?.includes("all") ||
          query.campaigns?.length === 0
            ? (existingCampaigndata?.length ?? 0)
            : (query.campaigns?.length ?? existingCampaigndata?.length ?? 0),
        loading: campaignsFilterApi.loading,
      },
        Agency: {
        filters:
           existingAgencydata && existingAgencydata.length > 0
          ? existingAgencydata.map((agency: string) => ({
                label: agency,
                checked:
                  isResetting ||
                  query.agency?.includes("all") ||
                  query.agency?.includes(agency) ||
                  !query.agency ||
                  query.agency?.length === 0,
              }))
            : [],
        is_select_all:
          isResetting ||
          !query.agency ||
          query.agency.includes("all") ||
          query.agency?.length === 0 ||
          query.agency?.length === existingAgencydata?.length,
        selected_count:
          isResetting ||
          query.agency?.includes("all") ||
          query.agency?.length === 0
            ? (existingAgencydata?.length ?? 0)
            : (query.agency?.length ?? existingAgencydata?.length ?? 0),
        loading: agencyFilterApi.loading,
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
        is_select_all:
          isResetting ||
          !query.country ||
          query.country.includes("all") ||
          query.country?.length === 0 ||
          query.country?.length === existingCountrydata?.length,
        selected_count:
          isResetting ||
          query.country?.includes("all") ||
          query.country?.length === 0
            ? (existingCountrydata?.length ?? 0)
            : (query.country?.length ?? existingCountrydata?.length ?? 0),
        loading: countryFilterApi.loading,
      },
    };

    // Only add Event Type filter when selectedType is "event"
    if (selectedType === "event") {
      otherFilters["Event Type"] = {
        filters:
          existingEventTypedata && existingEventTypedata.length > 0
            ? existingEventTypedata.map((eventType: string) => ({
                label: eventType,
                checked:
                  isResetting ||
                  query.event_type?.includes("all") ||
                  query.event_type?.includes(eventType) ||
                  !query.event_type ||
                  query.event_type?.length === 0,
              }))
            : [],
        is_select_all:
          isResetting ||
          !query.event_type ||
          query.event_type.includes("all") ||
          query.event_type?.length === 0 ||
          query.event_type?.length === existingEventTypedata?.length,
        selected_count:
          isResetting ||
          query.event_type?.includes("all") ||
          query.event_type?.length === 0
            ? (existingEventTypedata?.length ?? 0)
            : (query.event_type?.length ?? existingEventTypedata?.length ?? 0),
        loading: eventTypeFilterApi.loading,
      };
    }

    return { publishersFilter, otherFilters };
  }, [
    existingPublisherdata,
    existingCampaigndata,
    existingCountrydata,
    existingEventTypedata,
    query.event_type,
    query.publishers,
    query.agency,
    query.campaigns,
    query.country,
    selectedType,
    isResetting,
    publishersFilterApi.loading,
    campaignsFilterApi.loading,
    agencyFilterApi.loading,
    countryFilterApi.loading,
    eventTypeFilterApi.loading,
  ]);
  console.log(campaignsFilterApi, "tttttttttttt");
  //Filters
  const fetchPublisher = useCallback(() => {
    if ((publishersFilterApi.type === "mutation") && (selectedPackage && startDate && endDate) && !isTypeSwitching.current && !isPackageLoading) {
      publishersFilterApi.result.mutate({
        package_name: selectedPackage,
        start_date: startDate,
        end_date: endDate,
      });
    }
  }, [publishersFilterApi, selectedPackage, startDate, endDate, isPackageLoading]);
  const fetchCampaign = useCallback(() => {
    if ((campaignsFilterApi.type === "mutation") && (selectedPackage && startDate && endDate) && !isTypeSwitching.current && !isPackageLoading) {
      campaignsFilterApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
      });
    }
  }, [campaignsFilterApi, selectedPackage, startDate, endDate, isPackageLoading]);
   const fetchAgency = useCallback(() => {
    if ((agencyFilterApi.type === "mutation") && (selectedPackage && startDate && endDate) && !isTypeSwitching.current && !isPackageLoading) {
      agencyFilterApi.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
      });
    }
  }, [agencyFilterApi, selectedPackage, startDate, endDate, isPackageLoading]);
  const fetchCountry = useCallback(() => {
    if ((countryFilterApi.type === "mutation") && (selectedPackage && startDate && endDate) && !isTypeSwitching.current && !isPackageLoading) {
      countryFilterApi.result.mutate({});
    }
  }, [countryFilterApi, selectedPackage, startDate, endDate, isPackageLoading]);
  const fetchEventType = useCallback(() => {
    if ((eventTypeFilterApi.type === "mutation") && (selectedPackage && startDate && endDate) && !isTypeSwitching.current && !isPackageLoading) {
      eventTypeFilterApi.result.mutate({});
    }
  }, [eventTypeFilterApi, selectedPackage, startDate, endDate, isPackageLoading]);

  const handleFilterChange = useCallback(
    async (newState: Record<string, any>) => {
      console.log(newState, "newState");
      const publisherPayload = {
        publishers: newState.Publishers?.is_select_all
          ? ["all"]
          : [
              ...(newState.Publishers?.filters?.Affiliate || []),
              ...(newState.Publishers?.filters?.["Whitelisted Publisher"] ||
                []),
            ],
      };
      console.log(" publisher payload", publisherPayload);
      setQuery((prevQuery) => ({
        ...prevQuery,
        ...publisherPayload,
      }));

      const filtersChanged =
        !deepEqual(
          newState.Publishers?.filters || [],
          loadedFilter.Publishers?.filters || []
        ) ||
        !deepEqual(
          newState.Campaigns?.filters || [],
          loadedFilter.Campaigns?.filters || []
        ) ||
        !deepEqual(
          newState.Channels?.filters || [],
          loadedFilter.Channels?.filters || []
        ) ||
        !deepEqual(
          newState["Country"]?.filters || [],
          loadedFilter["Country"]?.filters || []
        );

      if (filtersChanged) {
        setLoadedFilter(newState);
      }
    },
    [loadedFilter]
  );
  const handleFilterChangeOther = useCallback(
    async (newState1: Record<string, any>) => {
      console.log(newState1,"nnnnnnnnnnnn")
      const otherPayload: any = {
        campaigns: newState1.Campaigns?.is_select_all
          ? ["all"]
          : newState1.Campaigns?.filters
              .filter((f: any) => f.checked)
              .map((f: any) => f.label),
              agency: newState1.Agency?.is_select_all
          ? ["all"]
          : newState1.Agency?.filters
              .filter((f: any) => f.checked)
              .map((f: any) => f.label),
        country: newState1["Country"]?.is_select_all
          ? ["all"]
          : newState1["Country"]?.filters
              .filter((f: any) => f.checked)
              .map((f: any) => f.label),
      };
      if (selectedType === "event" && newState1["Event Type"]) {
        otherPayload.event_type = newState1["Event Type"]?.is_select_all
          ? ["all"]
          : newState1["Event Type"]?.filters
              .filter((f: any) => f.checked)
              .map((f: any) => f.label);
      }

      // Update the query with other payload
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
        ) ||
        (selectedType === "event" &&
          !deepEqual(
            newState1["Event Type"]?.filters || [],
            loadedFilter["Event Type"]?.filters || []
          ));

      if (filtersChanged) {
        setLoadedFilter((prevFilter: any) => ({
          ...prevFilter,
          ...newState1,
        }));
      }
    },
    [loadedFilter, selectedType]
  );

  function isMutation(obj: any): obj is { mutate: Function } {
    return obj && typeof obj.mutate === "function";
  }


  const onExport = useCallback(
    async (s: string, title: string, key: string) => {
      const ref = cardRefs.current[key];
      if (!ref) return;

      switch (s) {
        case "png":
          const screenshot = await domToImage.toPng(ref);
          downloadURI(screenshot, title + ".png");
          break;
        default:
      }
    },
    []
  );

  const handleExpand = (key: string) => {
    onExpand(key, cardRefs, expandedCard, setExpandedCard);
  };
 
  const deepEqual = (arr1: any[], arr2: any[]) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    return arr1.every(
      (item, index) =>
        item.checked === arr2[index].checked && item.label === arr2[index].label
    );
  };

  const fetchAllData = useCallback(() => {
    // Only call these if the APIs are ready and we're not switching types
    if (!isTypeSwitching.current) {
      fetchCountry();
      fetchCampaign();
      fetchPublisher();
      fetchEventType();
      fetchAgency();
    }
  }, [fetchCountry, fetchCampaign, fetchPublisher, fetchEventType, fetchAgency]);

  // Add a ref to track if we're currently switching types
  const isTypeSwitching = useRef(false);
  const hasInitialized = useRef(false);

  // Initial load effect - only runs once when component mounts
  useEffect(() => {
    if (selectedPackage && startDate && endDate && !hasInitialized.current && !isPackageLoading) {
      hasInitialized.current = true;
      setFilterApisLoading(true);
      setInitialLoadingBuffer(true);
      fetchAllData();
      
      const timer = setTimeout(() => {
        setFilterApisCompleted(true);
        setFilterApisLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [selectedPackage, startDate, endDate]);

  // Buffer management - clear buffer after APIs are completed and give extra time for child components
  useEffect(() => {
    if (filterApisCompleted && !filterApisLoading && !isResetting) {
      const bufferTimer = setTimeout(() => {
        setInitialLoadingBuffer(false);
      }, 300); // Small delay to ensure child components start their loading states
      
      return () => clearTimeout(bufferTimer);
    } else {
      setInitialLoadingBuffer(true);
    }
  }, [filterApisCompleted, filterApisLoading, isResetting]);

  // Consolidated useEffect for fetching data and handling type switching
  useEffect(() => {
    if (selectedPackage && startDate && endDate && !isPackageLoading) {
      // Reset initialization flag when package changes
      hasInitialized.current = false;
      
      // Set switching flag to prevent multiple API calls
      isTypeSwitching.current = true;
      setFilterApisCompleted(false);
      setFilterApisLoading(true);
      setInitialLoadingBuffer(true);
      
      // Clear existing data immediately
      setExistingCampaigndata([]);
      setExistingAgencydata([]);
      setExistingCountrydata([]);
      setExistingEventTypedata([]);
      setExistingPublisherdata({
        Affiliate: [],
        "Whitelisted Publisher": [],
      });

      // Reset query state
      setIsResetting(true);
      setResetTimestamp(Date.now());
      setQuery({
        publishers: ["all"],
        campaigns: ["all"],
        country: ["all"],
        event_type: ["all"],
        agency: ["all"]
      });
      setLoadedFilter({});

      // Fetch all filter data when type changes
      const fetchFiltersOnTypeChange = async () => {
        try {
          // Call all filter APIs in parallel
          await Promise.all([
            // Publishers Filter
            publishersFilterApi.type === "mutation" && 
            publishersFilterApi.result.mutate({
              package_name: selectedPackage,
              start_date: startDate,
              end_date: endDate,
            }),
            
            // Campaigns Filter
            campaignsFilterApi.type === "mutation" && 
            campaignsFilterApi.result.mutate({
              start_date: startDate,
              end_date: endDate,
              package_name: selectedPackage,
            }),
            
            // Agency Filter
            agencyFilterApi.type === "mutation" && 
            agencyFilterApi.result.mutate({
              start_date: startDate,
              end_date: endDate,
              package_name: selectedPackage,
            }),
            
            // Country Filter
            countryFilterApi.type === "mutation" && 
            countryFilterApi.result.mutate({}),
            
            // Event Type Filter (only for event type)
            selectedType === "event" && 
            eventTypeFilterApi.type === "mutation" && 
            eventTypeFilterApi.result.mutate({})
          ].filter(Boolean));
          
          // Mark filter APIs as completed after all calls - removed timeout
          setFilterApisCompleted(true);
          setFilterApisLoading(false);
          setIsResetting(false);
          isTypeSwitching.current = false;
        } catch (error) {
          console.error("Error fetching filters on type change:", error);
          // Still mark as completed to prevent infinite loading
          setFilterApisCompleted(true);
          setFilterApisLoading(false);
          setIsResetting(false);
          isTypeSwitching.current = false;
        }
      };

      fetchFiltersOnTypeChange();
    }
  }, [selectedType, selectedPackage, startDate, endDate]);

  useEffect(() => {
    if (searchTermP || limitps || currentPagep) {
      exportCsvRef.current = false;
    }
  }, [searchTermP, limitps, currentPagep]);

  const [dwTrendSelectedFrequency, setDwTrendSelectedFrequency] =
    useState("Daily");

  const dwTrendSelectOptions = ["Daily", "Weekly", "Monthly"];
  const [dwTrendChartData, setDwTrendChartData] = useState<any[]>([]);
  const [isExportingDwTrend, setIsExportingDwTrend] = useState(false);

  const DW_TRENDS_API_URL = process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/trends`;
  const dwTrendFrequencyMap: Record<string, string> = {
    Daily: "daily",
    Weekly: "weekly",
    Monthly: "monthly",
  };
  const [dwTrendChartConfig, setDwTrendChartConfig] = useState();
  const { result: dwTrendApiResult, loading: dwTrendLoading } = useApiCall<
    any[]
  >({
    url: DW_TRENDS_API_URL,
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
    if (isMutation(dwTrendApiResult) && !isTypeSwitching.current && filterApisCompleted && !isPackageLoading) {
      dwTrendApiResult.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        frequency: dwTrendFrequencyMap[dwTrendSelectedFrequency],
        publisher: query.publishers,
        campaign_id: query.campaigns,
        country: query.country,
        vendor_id:query.agency,
        ...(selectedType === "event" && { event_type: query.event_type }),
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
    query.event_type,
    query.agency,
    selectedPackage,
    filterApisCompleted,
    isPackageLoading,
  ]);

  const handleDwTrendFrequencyChange = (value: string) => {
    setDwTrendSelectedFrequency(value);
  };

  // Add state and API logic from reattribution/page.tsx to Dashboard component
  const [publisherVendorChartData, setPublisherVendorChartData] = useState<
    any[]
  >([]);
  const [publisherVendorChartconfig, setPublisherVendorChartconfig] =
    useState();
  const [isExportingPublisherVendor, setIsExportingPublisherVendor] = useState(false);
  
  const [packageName] = useState(selectedPackage);
  const { result: publisherVendorApiResult, loading: publisherVendorLoading } =
    useApiCall<any[]>({
      url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/publisher_trends`,
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

console.log(dwTrendChartConfig,"uuu")
  useEffect(() => {
    if (isMutation(publisherVendorApiResult) && !isTypeSwitching.current && filterApisCompleted && !isPackageLoading) {
      publisherVendorApiResult.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        frequency: selectedRadio === "Publisher" ? "publisher" : "agency",
        publisher: query.publishers,
         vendor_id:query.agency,
        campaign_id: query.campaigns,
        country: query.country,
        ...(selectedType === "event" && { event_type: query.event_type }),
      });
    }
  }, [
    selectedRadio,
    startDate,
    endDate,
    selectedPackage,
    selectedPackage?.length,
    selectedType,
    query.publishers,
    query.agency,
    query.campaigns,
    query.country,
    query.event_type,
    filterApisCompleted,
    isPackageLoading,
  ]);

  const [cardData, setCardData] = useState<Record<string, { count: string | number; percentage?: string; color_code?: string }>>({});

  const totalPercentageApi = useApiCall<any>({
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/total_percentage`,
    method: "POST",
    params: {
      start_date: startDate,
      end_date: endDate,
      package_name: selectedPackage,
      publisher: query.publishers,
       vendor_id:query.agency,
      campaign_id: query.campaigns,
      country: query.country,
      ...(selectedType === "event" && { event_type: query.event_type }),
    },
    onSuccess: (data) => {
      console.log("data", data);
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
      typeof (totalPercentageApi as any)["trigger"] === "function" &&
      !isTypeSwitching.current &&
      filterApisCompleted &&
      !isPackageLoading
    ) {
      (totalPercentageApi as any)["trigger"]();
    }
  }, [
    startDate,
    endDate,
    selectedType,
    query.publishers,
    query.agency,
    query.campaigns,
    query.country,
    query.event_type,
    selectedPackage,
    filterApisCompleted,
    isPackageLoading,
  ]);

  const [splitOfSourcesChartData, setSplitOfSourcesChartData] = useState<any[]>(
    []
  );
  const [splitOfSourcesChartConfig, setSplitOfSourcesChartConfig] = useState<
    Record<string, { label: string; color: string }>
  >({});
  const [isExportingSplitOfSources, setIsExportingSplitOfSources] = useState(false);
 
  const splitOfSourcesApiCall = useApiCall<any[]>({
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${getApiType(selectedType)}/source_split`,
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
        setIsExportingSplitOfSources(false);
      } 
      else if (Array.isArray(response)) {
        const labelColorMap: Record<string, string> = {};
        let colorIndex = 0;
        const mapped = response
          .filter((item) => item.total_count > 0) // Filter out items with 0 values
          .map((item) => {
            const label = item.source_type;
            if (!labelColorMap[label]) {
              labelColorMap[label] =
                COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
              colorIndex++;
            }
            const visit = item.total_count;
            const percentage = item[getPercentageKey(label)] || "";
            const fill = labelColorMap[label];
            return { label, visit, percentage, fill };
          });
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
      }
    },
    onError: () => {
      setSplitOfSourcesChartData([]);
      setSplitOfSourcesChartConfig({});
      setIsExportingSplitOfSources(false);
    },
  });
  useEffect(() => {
    if (
      splitOfSourcesApiCall &&
      splitOfSourcesApiCall.type === "mutation" &&
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      !isTypeSwitching.current &&
      filterApisCompleted &&
      !isPackageLoading
    ) {
      splitOfSourcesApiCall.result.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        publisher: query.publishers,
         vendor_id:query.agency,
        campaign_id: query.campaigns,
        country: query.country,
        ...(selectedType === "event" && { event_type: query.event_type }),
      });
    }
  }, [
    startDate,
    endDate,
    selectedType,
    selectedPackage,
    query.publishers,
    query.agency,
    query.campaigns,
    query.country,
    query.event_type,
    filterApisCompleted,
    isPackageLoading,
  ]);



  const handleDonutSegmentClick = (data: any) => {
    setonclickvalue(data?.name);
  };
  return (
    <>
      <div className="flex flex-col gap-3 w-full min-h-screen bg-gradient-to-br from-background via-background to-background/95">
        {/* Enhanced Filters Row + Toggle */}
        <div className="sticky top-0 z-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl bg-card/50 backdrop-blur-md border border-border/30 shadow-lg px-4 py-4 md:px-6 md:py-5 transition-all duration-300 hover:bg-card/60 hover:border-border/50">
          {/* Filters Section with improved spacing */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full flex-wrap">
            {/* Publisher Filter */}
            <Filter
              key={`publishers-${selectedType}-${resetTimestamp}-${JSON.stringify(existingCampaigndata)}-${JSON.stringify(existingPublisherdata)}-${isInitialLoading}`}
              filter={filter.publishersFilter}
              onChange={handleFilterChange}
              grouped={true}
              publisherGroups={existingPublisherdata}
            />
            <Filter
              key={`other-${selectedType}-${resetTimestamp}-${existingCountrydata.length}-${existingEventTypedata.length}-${existingCampaigndata.length}-${isInitialLoading}`}
              filter={filter.otherFilters}
              onChange={handleFilterChangeOther}
              grouped={false}
            />
          </div>

          {/* Toggle Button Section - styled consistently */}
          <div className="self-end md:self-auto flex items-center gap-2">
            <ToggleButton
              options={[
                { label: "Click", value: "click" },
                { label: "Conversion", value: "conversion" },
                { label: "Event", value: "event" },
              ]}
              selectedValue={selectedType}
              onChange={(value) =>
                setSelectedType(value as "click" | "conversion" | "event")
              }
            />
          </div>
        </div>

        <StatsCards
          data={cardData}
          customLabels={{
            Total: `Total ${selectedType === "event" ? "Events" : selectedType === "click" ? "Clicks" : "Conversions"}`,
            Valid: `Valid ${selectedType === "event" ? "Events" : selectedType === "click" ? "Clicks" : "Conversions"}`,
            Invalid: `Invalid ${selectedType === "event" ? "Events" : selectedType === "click" ? "Clicks" : "Conversions"}`
          }}
          isLoading={totalPercentageApi.loading || isInitialLoading}
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
                    if (splitOfSourcesApiCall.type === "mutation") {
                      setIsExportingSplitOfSources(true);
                      // No need to reset loading since it's managed by useApiCall
                      splitOfSourcesApiCall.result.mutate({
                        start_date: startDate,
                        end_date: endDate,
                        package_name: selectedPackage,
                        publisher: query.publishers,
                         vendor_id:query.agency,
                        campaign_id: query.campaigns,
                        country: query.country,
                        ...(selectedType === "event" && { event_type: query.event_type }),
                        export_type: "csv",
                      });
                    }
                  }}
                onExpand={() => {
                  handleExpand("split_of_sources");
                }}
                onExport={() => {
                  onExport("png","Split Of Sources","split_of_sources")
                }}
                dataKey="visit"
                nameKey="label"
                isLoading={(splitOfSourcesApiCall.loading || isInitialLoading) && !isExportingSplitOfSources}
                isView={true}
                direction="flex-col"
                isdonut={false}
                marginTop="mt-0"
                position="items-start"
                isPercentage={false}
                isPercentageValue={true}
                istotalvistors={false}
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
                  if (isMutation(dwTrendApiResult)) {
                    setIsExportingDwTrend(true);
                    // No need to reset dwTrendLoading since it's managed by useApiCall
                    dwTrendApiResult.mutate({
                      start_date: startDate,
                      end_date: endDate,
                      package_name: selectedPackage,
                      frequency: dwTrendFrequencyMap[dwTrendSelectedFrequency],
                      publisher: query.publishers,
                       vendor_id:query.agency,
                      campaign_id: query.campaigns,
                      country: query.country,
                      ...(selectedType === "event" && { event_type: query.event_type }),
                      export_type: "csv",
                    });
                  }
                }}
                onExpand={() => {
                  handleExpand("date_wise_trend");
                }}
                onExport={() => {
                  onExport("png","Date Wise Trend","date_wise_trend")
                }}
              />
            </CardTitle>
            <CardContent className="w-full h-full overflow-y-auto scrollbar">
              <div className="w-full overflow-x-auto scrollbar h-full">
                <StackedBarWithLine1
                  chartData={dwTrendChartData}
                  chartConfig={dwTrendChartConfig}
                  isLegend={true}
                  isLoading={(dwTrendLoading || isInitialLoading) && !isExportingDwTrend}
                  onExpand={() => {
                    handleExpand("date_wise_trend");
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Row: Publisher/Vendor Wise Trend (Replaced with logic from reattribution/page.tsx) */}
        <div className="w-full p-0">
          <Card
            ref={(el) => {
              if (el) cardRefs.current["publisher_vendor_trend"] = el;
            }}
            className="w-full shadow-md hover:shadow-xl rounded-xl border-border/40 bg-card dark:bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-border/60 h-[320px]"
          >
            <CardTitle className="p-2">
              <HeaderRow
                title={`${selectedRadio === "Publisher" ? "Publisher Wise Trend" : "Agency Wise Trend"}`}
                isRadioButton={true}
                isSelect={false}
                visitEventOptions={[
                  { value: "Publisher", label: "Publisher" },
                  { value: "Vendor", label: "Agency" },
                ]}
                selectedType={selectedRadio}
                handleTypeChange={(value) => setSelectedRadio(value as "Publisher" | "Vendor")}
                handleExport={() => {
                  if (isMutation(publisherVendorApiResult)) {
                    setIsExportingPublisherVendor(true);
                    // No need to reset publisherVendorLoading since it's managed by useApiCall
                    publisherVendorApiResult.mutate({
                      start_date: startDate,
                      end_date: endDate,
                      package_name: selectedPackage,
                      frequency: selectedRadio === "Publisher" ? "publisher" : "agency",
                      publisher: query.publishers,
                       vendor_id:query.agency,
                      campaign_id: query.campaigns,
                      country: query.country,
                      ...(selectedType === "event" && { event_type: query.event_type }),
                      export_type: "csv",
                    });
                  }
                }}
                onExpand={() => {
                  handleExpand("publisher_vendor_trend");
                }}
                onExport={() => {
                  onExport("png","Publisher/Vendor Wise Trend","publisher_vendor_trend")
                }}
              />
            </CardTitle>
            <CardContent className="w-full h-full overflow-y-auto scrollbar">
              <div className="w-full overflow-x-auto scrollbar h-full">
               

                <StackedBarWithLine1
                  chartData={publisherVendorChartData}
                  chartConfig={publisherVendorChartconfig}
                  isLegend={true}
                  isLoading={(publisherVendorLoading || isInitialLoading) && !isExportingPublisherVendor}
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
            query={query}
            onclickvalue={onclickvalue}
            setonclickvalue={setonclickvalue}
            filterApisCompleted={filterApisCompleted}
            isInitialLoading={isInitialLoading}
          />
          {/* Third Row - Incent Samples (Dynamic) */}
        </div>
        <Publisher
          publisherfilter={query.publishers}
          campaignfilter={query.campaigns}
           agencyfilter={query.agency}
          countryfilter={query.country}
          eventTypeFilter={query.event_type}
          selectedType={selectedType}
        />
      </div>
    </>
  );
};

export default Dashboard;








