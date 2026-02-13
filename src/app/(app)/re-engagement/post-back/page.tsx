"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import HeaderRow from "@/components/mf/HeaderRow";
import { Filter } from "@/components/mf/Filters/Filter";
import ResizableTable from "@/components/mf/ReportingToolTable";
import { useApiCall } from "@/services/api_base";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import { Loader2 } from "lucide-react";

interface PostbackEventData {
  Date: string;
  "Publisher Name": string;
  "Event Type": string;
  "Total Counts": number;
  "Invalid Events": number;
  "Valid Events": number;
  "Postback Triggered Events": number;
  [key: string]: string | number; // Add index signature for table compatibility
}

interface PostbackEventsResponse {
  data: PostbackEventData[];
  Total_pages: number;
  Total_records: number;
  page_number: number;
  record_limit: number;
}

interface FilterApiResponse {
  [key: string]: string[];
}

interface PublisherApiResponse {
  Affiliate: string[];
  "Whitelisted Publisher": string[];
  [key: string]: string[]; // Add index signature for compatibility
}

const PostTracking = () => {
  const { selectedPackage, isPackageLoading } = usePackage();
  const { startDate, endDate } = useDateRange();

  const [currentPage, setCurrentPage] = useState(1);
  const [recordLimit, setRecordLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetTimestamp, setResetTimestamp] = useState(Date.now());
  const [loadedFilter, setLoadedFilter] = useState<any>({});

  // Use query state like dashboard to store filter values
  const [query, setQuery] = useState<{
    publishers: string[];
    event_type: string[];
  }>({
    publishers: ["all"], // Initially select all publishers
    event_type: ["all"], // Initially select all event types
  });

  const [existingPublisherData, setExistingPublisherData] =
    useState<PublisherApiResponse>({
      Affiliate: [],
      "Whitelisted Publisher": [],
    });
  const [existingEventTypeData, setExistingEventTypeData] = useState<string[]>(
    []
  );
  const [tableData, setTableData] = useState<PostbackEventData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Publisher filter API - exactly like overall summary
  const publishersFilterApi = useApiCall<PublisherApiResponse>({
    url: process.env.NEXT_PUBLIC_APP_PERF + "reengagement/event/publisher",
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      if (data) {
        setExistingPublisherData(data);
      }
    },
    onError: (error) => {
      console.log("Publisher filter API error:", error);
      setExistingPublisherData({
        Affiliate: [],
        "Whitelisted Publisher": [],
      });
    },
  });

  // Event type filter API - exactly like overall summary
  const eventTypeFilterApi = useApiCall<FilterApiResponse>({
    url: process.env.NEXT_PUBLIC_APP_PERF + "reengagement/event/event_list",
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setExistingEventTypeData(data);
      }
    },
    onError: (error) => {
      console.log("Event type filter API error:", error);
      setExistingEventTypeData([]);
    },
  });

  // Postback events summary API
  const postbackEventsApi = useApiCall<PostbackEventsResponse>({
    url:
      process.env.NEXT_PUBLIC_APP_PERF +
      "reengagement/event/postback_events_summary",
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      if (data) {
        setTableData(data.data || []);
        setTotalPages(data.Total_pages || 1);
        setTotalRecords(data.Total_records || 0);
      }
    },
    onError: (error) => {
      setTableData([]);
      setTotalPages(1);
      setTotalRecords(0);
    },
  });

  // Utility function for deep comparison - exactly like overall summary
  const deepEqual = (arr1: any[], arr2: any[]) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    return arr1.every(
      (item, index) =>
        item.checked === arr2[index].checked && item.label === arr2[index].label
    );
  };

  // Fetch functions - exactly like overall summary
  const fetchPublisher = useCallback(() => {
    if (
      publishersFilterApi.type === "mutation" &&
      selectedPackage &&
      startDate &&
      endDate &&
      !isPackageLoading
    ) {
      publishersFilterApi.result.mutate({
        package_name: selectedPackage,
        start_date: startDate,
        end_date: endDate,
      });
    }
  }, [
    publishersFilterApi,
    selectedPackage,
    startDate,
    endDate,
    isPackageLoading,
  ]);

  const fetchEventType = useCallback(() => {
    if (
      eventTypeFilterApi.type === "mutation" &&
      selectedPackage &&
      startDate &&
      endDate &&
      !isPackageLoading
    ) {
      eventTypeFilterApi.result.mutate({
        package_name: selectedPackage,
        start_date: startDate,
        end_date: endDate,
      });
    }
  }, [
    eventTypeFilterApi,
    selectedPackage,
    startDate,
    endDate,
    isPackageLoading,
  ]);

  // Fetch data when dependencies change - exactly like overall summary
  useEffect(() => {
    if (selectedPackage && startDate && endDate && !isPackageLoading) {
      // Call filter APIs when package/date changes
      fetchPublisher();
      fetchEventType();
    }
  }, [selectedPackage, startDate, endDate, isPackageLoading]); // Removed fetchPublisher and fetchEventType from dependencies

  // Check if filter data is loaded - exactly like overall summary
  const isFilterDataLoaded = useMemo(() => {
    return (
      selectedPackage &&
      selectedPackage.length > 0 &&
      startDate &&
      endDate &&
      !isPackageLoading && // Package is not loading
      ((existingPublisherData &&
        Object.keys(existingPublisherData).length > 0) ||
        (existingEventTypeData && existingEventTypeData.length > 0))
    );
  }, [
    existingPublisherData,
    existingEventTypeData,
    selectedPackage,
    startDate,
    endDate,
    isPackageLoading,
  ]);

  // Check if any filter APIs are loading - exactly like overall summary
  const isFilterLoading = useMemo(() => {
    return publishersFilterApi.loading || eventTypeFilterApi.loading;
  }, [publishersFilterApi.loading, eventTypeFilterApi.loading]);

  // Reset query state when package/date changes - exactly like overall summary
  useEffect(() => {
    setIsResetting(true);
    setResetTimestamp(Date.now());
    setQuery({
      publishers: ["all"],
      event_type: ["all"],
    });
    setLoadedFilter({});
    setSearchTerm(""); // Reset search term
    setDebouncedSearchTerm(""); // Reset debounced search term

    const timer = setTimeout(() => {
      setIsResetting(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedPackage, startDate, endDate]);

  // Trigger postback API when query changes (filters change) - exactly like overall summary
  useEffect(() => {
    // Only call API if we have all required data
    if (
      selectedPackage &&
      startDate &&
      endDate &&
      existingPublisherData.Affiliate.length > 0 &&
      existingEventTypeData.length > 0 &&
      postbackEventsApi.type === "mutation"
    ) {
      // Prepare payload - handle "all" selection properly
      const publisherPayload = query.publishers.includes("all")
        ? ["all"] // Send ["all"] when all publishers are selected
        : query.publishers;

      const eventTypePayload = query.event_type.includes("all")
        ? ["all"] // Send ["all"] when all event types are selected
        : query.event_type;

      // Only make API call if we have valid payloads
      if (publisherPayload.length > 0 && eventTypePayload.length > 0) {
        // Make API call when filters change
        postbackEventsApi.result.mutate({
          start_date: startDate,
          end_date: endDate,
          package_name: selectedPackage,
          publisher: publisherPayload,
          event_type: eventTypePayload,
          record_limit: recordLimit,
          page_number: currentPage,
          search: debouncedSearchTerm,
        });
      }
    } else {
    }
  }, [
    query.publishers,
    query.event_type,
    currentPage,
    recordLimit,
    selectedPackage,
    startDate,
    endDate,
    debouncedSearchTerm,
  ]); // Only depend on query changes

  // Initial load - call postback API when all data is available - exactly like overall summary
  useEffect(() => {
    if (
      selectedPackage &&
      startDate &&
      endDate &&
      existingPublisherData.Affiliate.length > 0 &&
      existingEventTypeData.length > 0 &&
      postbackEventsApi.type === "mutation"
    ) {
      // Prepare payload - handle "all" selection properly
      const publisherPayload = query.publishers.includes("all")
        ? ["all"] // Send ["all"] when all publishers are selected
        : query.publishers;

      const eventTypePayload = query.event_type.includes("all")
        ? ["all"] // Send ["all"] when all event types are selected
        : query.event_type;

      // Only make API call if we have valid payloads
      if (publisherPayload.length > 0 && eventTypePayload.length > 0) {
        // Make API call on initial load
        postbackEventsApi.result.mutate({
          start_date: startDate,
          end_date: endDate,
          package_name: selectedPackage,
          publisher: publisherPayload,
          event_type: eventTypePayload,
          record_limit: recordLimit,
          page_number: currentPage,
        });
      }
    }
  }, [
    selectedPackage,
    startDate,
    endDate,
    existingPublisherData.Affiliate.length,
    existingEventTypeData.length,
  ]); // Only depend on initial data availability

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm(""); // Reset search when filters change
    setDebouncedSearchTerm(""); // Reset debounced search when filters change
  }, [query.publishers, query.event_type]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Show loading state while any API is in progress
  const isAnyApiLoading =
    isPackageLoading ||
    publishersFilterApi.loading ||
    eventTypeFilterApi.loading ||
    postbackEventsApi.loading;

  // Show loading state while filters are being fetched
  const isFiltersLoading =
    isPackageLoading ||
    publishersFilterApi.loading ||
    eventTypeFilterApi.loading;

  // Show loading state only for postback API
  const isPostbackLoading = postbackEventsApi.loading;

  // Create filter configuration - exactly like overall summary
  const filter = useMemo(() => {
    const publishersFilter = {
      Publishers: {
        filters:
          Object.keys(existingPublisherData).length > 0
            ? Object.entries(existingPublisherData).map(
                ([group, publishers]) => ({
                  label: group,
                  checked: true,
                  subItems: publishers.map((publisher: string) => ({
                    label: publisher,
                    checked:
                      isResetting ||
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
                  label: "Whitelisted Publisher",
                  checked: true,
                  subItems: [],
                },
              ],
        is_select_all:
          isResetting ||
          !query.publishers ||
          query.publishers.includes("all") ||
          query.publishers?.length ===
            Object.values(existingPublisherData).flat().length,
        selected_count: query.publishers?.includes("all")
          ? Object.values(existingPublisherData).flat().length
          : (query.publishers?.length ??
            Object.values(existingPublisherData).flat().length),
        loading: publishersFilterApi.loading,
      },
    };

    const otherFilters: Record<string, any> = {
      "Event Types": {
        filters:
          existingEventTypeData && existingEventTypeData.length > 0
            ? existingEventTypeData.map((eventType: string) => ({
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
          query.event_type?.length === existingEventTypeData?.length,
        selected_count:
          isResetting ||
          query.event_type?.includes("all") ||
          query.event_type?.length === 0
            ? (existingEventTypeData?.length ?? 0)
            : (query.event_type?.length ?? existingEventTypeData?.length ?? 0),
        loading: eventTypeFilterApi.loading,
      },
    };

    return { publishersFilter, otherFilters };
  }, [
    existingPublisherData,
    existingEventTypeData,
    query.publishers,
    query.event_type,
    isResetting,
    publishersFilterApi.loading,
    eventTypeFilterApi.loading,
  ]);

  // Handle filter changes - exactly like overall summary
  const handleFilterChange = useCallback(
    async (newState: Record<string, any>) => {
      const publisherPayload = {
        publishers: newState.Publishers?.is_select_all
          ? ["all"]
          : [
              ...(newState.Publishers?.filters?.Affiliate || []),
              ...(newState.Publishers?.filters?.["Whitelisted Publisher"] ||
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
        event_type: newState1["Event Types"]?.is_select_all
          ? ["all"]
          : newState1["Event Types"].filters
              .filter((f: any) => f.checked)
              .map((f: any) => f.label),
      };

      setQuery((prevQuery) => ({
        ...prevQuery,
        ...otherPayload,
      }));

      const filtersChanged = !deepEqual(
        newState1["Event Types"]?.filters || [],
        loadedFilter["Event Types"]?.filters || []
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

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle limit change
  const handleLimitChange = (limit: number) => {
    setRecordLimit(limit);
    setCurrentPage(1); // Reset to first page when limit changes
  };

  // Create table columns dynamically based on data
  const tableColumns = useMemo(() => {
    if (tableData.length === 0) return [];

    const firstRow = tableData[0];
    return Object.keys(firstRow).map((key) => ({
      title: key,
      key: key,
    }));
  }, [tableData]);

  return (
    <div className="space-y-6">
      {/* Filters - exactly like overall summary */}
      <div className="sticky top-0 z-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-md bg-background px-4 py-3 border border-gray-200">
        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
          <Filter
            key={`publishers-${resetTimestamp}-${JSON.stringify(existingPublisherData)}-${selectedPackage}`}
            filter={filter.publishersFilter}
            onChange={handleFilterChange}
            grouped={true}
            publisherGroups={existingPublisherData}
          />
          <Filter
            key={`other-${resetTimestamp}-${existingEventTypeData.length}`}
            filter={filter.otherFilters}
            onChange={handleFilterChangeOther}
            grouped={false}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Postback Events Summary</h3>
            </div>

            {isAnyApiLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {isPackageLoading ? "" : isFiltersLoading ? "" : ""}
                </span>
              </div>
            ) : (
              <ResizableTable
                columns={tableColumns}
                data={tableData}
                headerColor="#f3f4f6"
                isPaginated={true}
                isSearchable={true}
                SearchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isLoading={isPostbackLoading}
                onPageChangeP={handlePageChange}
                onLimitChange={handleLimitChange}
                pageNo={currentPage}
                totalPages={totalPages}
                limit={recordLimit}
                totalRecords={totalRecords}
                emptyStateMessage="No Data Found!"
                isTableDownload={false}
                isUserTable={false}
                isUserPackage={false}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostTracking;
