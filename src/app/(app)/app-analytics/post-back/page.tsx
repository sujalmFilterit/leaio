"use client";
import React, {
  useEffect,
  useState,
  useMemo,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "@/components/mf/Filters/Filter";
import ResizableTable from "@/components/mf/ReportingToolTable";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import { useAppAnalyticsFilters } from "../hooks/useAppAnalyticsFilters";
import { createPostbackFilters } from "../hooks/filterConfigHelpers";
import { usePostBackTable } from "../hooks/usePostBack";


interface PostbackEventData {
  Date: string;
  "Publisher Name": string;
  "Event Type": string;
  "Total Counts": number;
  "Invalid Events": number;
  "Valid Events": number;
  "Postback Triggered Events": number;
  [key: string]: string | number; 
}

const PostTracking = () => {
  const { selectedPackage, isPackageLoading } = usePackage();
  const { startDate, endDate } = useDateRange();
  const [currentPage, setCurrentPage] = useState(1);
  const [recordLimit, setRecordLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [resetTimestamp, setResetTimestamp] = useState(Date.now());

  const baseFilterPayload = {
    package_name: selectedPackage,
    start_date: startDate,
    end_date: endDate,
  };

  const filterConfigs = useMemo(() => createPostbackFilters(), []);
  const {
    query,
    filterConfig,
    filterData,
    handlePublisherFilterChange,
    handleOtherFiltersChange,
    resetFilters,
    isLoading: isFiltersLoading,
  } = useAppAnalyticsFilters(filterConfigs, baseFilterPayload);

  const postbackPayload = useMemo(() => {
    if (
      selectedPackage &&
      startDate &&
      endDate &&
      filterData?.publishers &&
      filterData?.event_type &&
      (filterData?.publishers as any)?.Affiliate?.length > 0 &&
      (filterData?.event_type as string[])?.length > 0
    ) {
      const publisherPayload = query?.publishers?.includes("all")
        ? ["all"]
        : query?.publishers || ["all"];

      const eventTypePayload = query?.event_type?.includes("all")
        ? ["all"]
        : query?.event_type || ["all"];

      if (publisherPayload.length > 0 && eventTypePayload.length > 0) {
        return {
          package_name: selectedPackage,
          start_date: startDate,
          end_date: endDate,
          publisher: publisherPayload,
          event_type: eventTypePayload,
          record_limit: recordLimit,
          page_number: currentPage,
          search: debouncedSearchTerm,
        };
      }
    }
    return undefined;
  }, [
    selectedPackage,
    startDate,
    endDate,
    query.publishers,
    query.event_type,
    filterData.publishers,
    filterData.event_type,
    recordLimit,
    currentPage,
    debouncedSearchTerm,
  ]);

  const {
    data: postbackEventsData,
    isLoading: postbackEventsLoading,
  } = usePostBackTable(postbackPayload, !!postbackPayload);

  useEffect(() => {
    setResetTimestamp(Date.now());
    resetFilters();
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCurrentPage(1);
  }, [selectedPackage, startDate, endDate, resetFilters]);

  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm(""); 
    setDebouncedSearchTerm(""); 
  }, [query?.publishers, query?.event_type]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const publisherGroups = useMemo(() => {
    const publishers = filterData?.publishers as any;
    return publishers && typeof publishers === 'object' && !Array.isArray(publishers)
      ? { Publishers: publishers }
      : { Publishers: { Affiliate: [], "Whitelisted Publisher": [] } };
  }, [filterData?.publishers]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (limit: number) => {
    setRecordLimit(limit);
    setCurrentPage(1);
  };

  const tableColumns = useMemo(() => {
    const data = Array.isArray(postbackEventsData)
      ? postbackEventsData
      : postbackEventsData?.data || [];
    
    if (!data?.length) return [];

    const firstRow = data?.[0];
    if (!firstRow) return [];

    return Object.keys(firstRow).map((key) => ({
      title: key,
      key: key,
    }));
  }, [postbackEventsData]);

  return (
    <div className="space-y-2">
      <div className="sticky top-0 z-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-md bg-background px-4 py-3 border border-gray-200">
    
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
          <Filter
            key={`publishers-${resetTimestamp}-${selectedPackage}`}
            filter={filterConfig?.publishersFilter}
            onChange={handlePublisherFilterChange}
            grouped={true}
            publisherGroups={publisherGroups}
          />
          <Filter
            key={`other-${resetTimestamp}`}
            filter={filterConfig?.otherFilters}
            onChange={handleOtherFiltersChange}
            grouped={false}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
              <ResizableTable
                columns={tableColumns}
                data={Array.isArray(postbackEventsData) ? postbackEventsData : postbackEventsData?.data || []}
                headerColor="#f3f4f6"
                isPaginated={true}
                isSearchable={true}
                onSearch={(searchTerm) => {
                  setSearchTerm(searchTerm);
                }}
                isLoading={postbackEventsLoading || isPackageLoading || isFiltersLoading}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                pageNo={currentPage}
                totalPages={Array.isArray(postbackEventsData) ? 1 : (postbackEventsData?.Total_pages ?? 1)}
                limit={recordLimit}
                totalRecords={Array.isArray(postbackEventsData) ? 0 : (postbackEventsData?.Total_records ?? 0)}
                emptyStateMessage="No Data Found!"
                isTableDownload={false}
                isRefetch={false}
              />
        </CardContent>
      </Card>
    </div>
  );
};

export default PostTracking;
