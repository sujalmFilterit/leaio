"use client";
import type React from "react";
import { useState, useEffect } from "react";
import ResizableTable from "@/components/mf/ReportingToolTable";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DoubleLineChart from "@/components/mf/charts/DoubleLineChart";
import { Card } from "@/components/ui/card";
import { useApiCall } from "@/services/api_base";
import { MFDateRangePicker } from "@/components/mf/MFDateRangePicker";
import { usePackage } from "@/components/mf/PackageContext";
import { Filter } from "@/components/mf/Filters/Filter";
import type { FilterState } from "@/components/mf/Filters/Filter";

import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, CalendarIcon } from "lucide-react";
import { useDateRange } from "@/components/mf/DateRangeContext";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { MdFileDownload } from "react-icons/md";

interface Column {
  key: string;
  title: string;
  render?: (item: any) => React.ReactNode;
}

interface PopDataItem {
  device_type: string;
  screen_resolution: string;
  pop_under_percentage: number | string;
}

interface ChartDataItem {
  label: string;
  standard: number;
  demandgen: number;
  [key: string]: string | number;
}

// Add new interface for event type data

// Chart configurations for different views - now dynamic based on selectedPublisher
const getInstallChartConfig = (publisherName: string) => ({
  standard: {
    label: publisherName || "Publisher",
    color: "#2563eb", // blue-600
  },
});

const getEventChartConfig = (publisherName: string) => ({
  standard: {
    label: publisherName || "Publisher",
    color: "#22c55e", // green-500
  },
});

// Helper function to get API endpoint based on type
const getApiEndpoint = (type: "click" | "conversion" | "event", endpoint: string): string => {
  return process.env.NEXT_PUBLIC_APP_PERF + `reengagement/${type}/${endpoint}`;
};

// Helper function to get type labels
const getTypeLabels = (type: "click" | "conversion" | "event") => {
  const typeMap = {
    click: {
      singular: "Click",
      plural: "Clicks",
      api: "click" as const
    },
    conversion: {
      singular: "Conversion", 
      plural: "Conversions",
      api: "conversion" as const
    },
    event: {
      singular: "Event",
      plural: "Events", 
      api: "event" as const
    }
  };
  return typeMap[type];
};

export default function Publisher({
  publisherfilter,
  campaignfilter,
  countryfilter,
  eventTypeFilter,
  agencyfilter,
  selectedType = "click"
}: {
  publisherfilter: string[];
  campaignfilter: string[];
  agencyfilter: string[];
  countryfilter: string[];
  eventTypeFilter: string[];
  selectedType?: "click" | "conversion" | "event";
}) {
  const { selectedPackage } = usePackage();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<string | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deviceType, setDeviceType] = useState("desktop");

  // Get current type labels and API type
  const currentTypeLabels = getTypeLabels(selectedType);
  const currentApiType = currentTypeLabels.api;

  // Use dynamic view based on selectedType
  const [selectedView, setSelectedView] = useState<"click" | "conversion" | "event">(
    currentApiType
  );
  const [eventFilter, setEventFilter] = useState<{
    [key: string]: FilterState;
  }>({
    eventType: {
      filters: [
        { label: "Click", checked: false },
        { label: "Impression", checked: false },
        { label: "Conversion", checked: false },
        { label: "Install", checked: false },
      ],
      is_select_all: false,
      selected_count: 0,
    },
  });
  const [selectedExport, setSelectedExport] = useState("");
  const [tableColumns, setTableColumns] = useState<Column[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableData1, setTableData1] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [installChartData, setInstallChartData] = useState<ChartDataItem[]>([]);
  const [eventChartData, setEventChartData] = useState<ChartDataItem[]>([]);
  const [installChartLoading, setInstallChartLoading] = useState(false);
  const [eventChartLoading, setEventChartLoading] = useState(false);

  const [selectedEventType, setSelectedEventType] = useState(
    "COMPLETE_REGISTRATION"
  );
  const [eventTypeOptions, setEventTypeOptions] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string>("");
  const [selectedEventTypesChart, setSelectedEventTypesChart] = useState<
    string[]
  >([]);
  const [isEventTypeDropdownOpen, setIsEventTypeDropdownOpen] = useState(false);
  const [isEventTypeChartDropdownOpen, setIsEventTypeChartDropdownOpen] =
    useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Global date range for table data
  const { startDate, endDate } = useDateRange();

  // Local date range for dialog charts (separate from global context)
  const [dialogStartDate, setDialogStartDate] = useState(startDate);
  const [dialogEndDate, setDialogEndDate] = useState(endDate);
  const [dialogDateRange, setDialogDateRange] = useState<DateRange | undefined>(
    {
      from: new Date(startDate),
      to: new Date(endDate),
    }
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  // API call for publisher summary
  const { result: publisherSummaryApi, loading: isLoadingPublisherSummary } =
    useApiCall<any>({
      url: getApiEndpoint(selectedType, "publisher_summary"),
      method: "POST",
      manual: true,
      onSuccess: (response) => {
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
          setTableData(response.data);
          const firstRow = response.data[0];

          const dynamicColumns = Object.keys(firstRow)
            .filter((key) => key !== "Publisher")
            .map((key) => {
              // Check if this column should have a custom render function
              if (
                key === "action" ||
                key === "buttons" ||
                key.toLowerCase().includes("button")
              ) {
                return {
                  title: key,
                  key: key,
                  render: (item: any) => (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Dispatch custom event for showing details
                          const event = new CustomEvent(
                            "showPublisherDetails",
                            {
                              detail: { publisherId: item.Publisher },
                            }
                          );
                          window.dispatchEvent(event);
                        }}
                        className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  ),
                };
              }

              // For regular columns, check if the value is an object that needs special handling
              return {
                title: key,
                key: key,
                render: (item: any) => {
                  const value = item[key];
                  // Handle objects, arrays, or complex data
                  if (typeof value === "object" && value !== null) {
                    if (Array.isArray(value)) {
                      return value.join(", ");
                    }
                    // For objects, you might want to display a specific property or stringify
                    return JSON.stringify(value);
                  }
                  // For primitive values, display as is
                  return typeof value === "number"
                    ? value.toLocaleString()
                    : String(value || "");
                },
              };
            });
          const final = [
            {
              title: "Publisher",
              key: "Publisher",
              render: (item: any) => (
                <button
                  onClick={() => {
                    const event = new CustomEvent("showPublisherDetails", {
                      detail: { publisherId: item.Publisher },
                    });
                    window.dispatchEvent(event);
                  }}
                  className="text-primary hover:underline cursor-pointer"
                >
                  {item.Publisher}
                </button>
              ),
            },
            ...dynamicColumns,
          ];

          setTableColumns(final);
          setTotalPages(response.Total_pages || 1);
          setTotalRecords(response.Total_records || 0);
        } else {
          // No data or empty response - reset everything
          setTableData([]);
          setTableColumns([]);
          setTotalPages(1);
          setTotalRecords(0);
        }
      },
      onError: (error) => {
        setTableData([]);
        setTableColumns([]);
        setTotalPages(1);
        setTotalRecords(0);
      },
    });

  // API call for install conversion chart
  const { result: installChartApi } = useApiCall<any>({
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/click/click_conversion`,
    method: "POST",
    manual: true,
    onSuccess: (response) => {
      if (Array.isArray(response)) {
        // Map API response to chart format
        const mapped = response.map((item: any) => ({
          label: item.bucket,
          standard: item.percentage,
          demandgen: item.percentage,
        }));
        setInstallChartData(mapped);
      } else {
        setInstallChartData([]);
      }
      setInstallChartLoading(false);
    },
    onError: () => {
      setInstallChartData([]);
      setInstallChartLoading(false);
    },
  });

  // API call for event conversion chart  
  const { result: eventChartApi } = useApiCall<any>({
    url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/event/conversion_event`,
    method: "POST",
    manual: true,
    onSuccess: (response) => {
      if (Array.isArray(response)) {
        const mapped = response.map((item: any) => ({
          label: item.bucket,
          standard: item.percentage, // You can split series if needed
          demandgen: item.percentage,
        }));
        setEventChartData(mapped);
      } else {
        setEventChartData([]);
      }
      setEventChartLoading(false);
    },
    onError: () => {
      setEventChartData([]);
      setEventChartLoading(false);
    },
  });

  // Fetch chart data when dialog opens and publisher is selected
  useEffect(() => {
    if (isDialogOpen && selectedPublisher && selectedPackage) {
      // Always call install chart API
      setInstallChartLoading(true);
      if (
        installChartApi &&
        typeof (installChartApi as any).mutate === "function"
      ) {
        (installChartApi as any).mutate({
          start_date: dialogStartDate,
          end_date: dialogEndDate,
          package_name: selectedPackage,
          publisher: selectedPublisher,
        });
      }

      // Always call event chart API
      setEventChartLoading(true);
      if (
        eventChartApi &&
        typeof (eventChartApi as any).mutate === "function"
      ) {
        (eventChartApi as any).mutate({
          start_date: dialogStartDate,
          end_date: dialogEndDate,
          package_name: selectedPackage,
          publisher: selectedPublisher,
          event_type:
            selectedEventTypesChart.length === eventTypeOptions.length &&
            eventTypeOptions.length > 0
              ? ["all"]
              : selectedEventTypesChart,
        });
      }
    }
  }, [isDialogOpen, selectedPublisher, selectedPackage, dialogStartDate, dialogEndDate, selectedEventTypesChart, eventTypeOptions.length]);

  // Helper to check if apiCallResult is a mutation
  function isMutation(obj: any): obj is { mutate: Function } {
    return obj && typeof obj.mutate === "function";
  }

  const [selectedRadioButton, setSelectedRadioButton] = useState<string>("all");

  const handleSelectedRadioButton = (data: any) => {
    setSelectedRadioButton(data);
    // Don't trigger API call automatically - wait for Apply button
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Fetch data on mount and when page/limit/search changes
  useEffect(() => {
    if (isMutation(publisherSummaryApi) && selectedPackage) {
      // Determine event_type value based on selection and selectedType
      const eventTypeValue =
        selectedType !== "event" 
          ? ["all"] // For click/conversion, always use "all"
          : (!selectedEventTypes || selectedEventTypes === "all"
            ? ["all"]
            : [selectedEventTypes]);

      publisherSummaryApi.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        summary_type: "publisher",
        publisher_type: "all",
        order: "ascending",
        column_name: "publisher_name",
        page_number: currentPage,
        record_limit: limit,
        search_term: debouncedSearchTerm,
        publisher: publisherfilter,
        campaign_id: campaignfilter,
         vendor_id:agencyfilter,
        country: countryfilter,
        event_type: eventTypeValue,
        column_type: selectedRadioButton,
      });
    }
  }, [
    currentPage,
    limit,
    debouncedSearchTerm,
    publisherfilter,
    campaignfilter,
    agencyfilter,
    countryfilter,
    selectedRadioButton,
    startDate,
    endDate,
    selectedPackage,
    selectedEventTypes,
    selectedType, // Add selectedType as dependency
  ]);

  // Listen for the custom event
  useEffect(() => {
    const handleShowDetails = (event: CustomEvent) => {
      setSelectedPublisher(event.detail.publisherId);
      // Initialize dialog dates with current global dates when opening
      setDialogStartDate(startDate);
      setDialogEndDate(endDate);
      setDialogDateRange({
        from: new Date(startDate),
        to: new Date(endDate),
      });
      setIsDialogOpen(true);
    };
    window.addEventListener(
      "showPublisherDetails",
      handleShowDetails as EventListener
    );
    return () => {
      window.removeEventListener(
        "showPublisherDetails",
        handleShowDetails as EventListener
      );
    };
  }, [startDate, endDate]);

  // Fetch Pop Under data

  const handleDeviceChange = (value: string) => {
    const deviceMap: { [key: string]: string } = {
      Desktop: "desktop",
      Mobile: "mobile",
    };
    setDeviceType(deviceMap[value]);
  };

  // Update selectedView when selectedType changes
  useEffect(() => {
    setSelectedView(currentApiType);
  }, [currentApiType]);

  // Get chart title based on selected view and type
  const getChartTitle = () => {
    if (selectedView === "click" || selectedView === "conversion") {
      return `${currentTypeLabels.singular} to Install Time: ${selectedPublisher}`;
    }
    return `Event Conversion Rate: ${selectedPublisher}`;
  };

  // Handler for column toggle (if you want to allow hiding columns in the future)
  const handleColumnToggle = (key: string) => {
    // Implementation needed
  };

  // Dynamically set columns when data is loaded
  useEffect(() => {
    setTableData1(tableData);
  }, [tableData, tableColumns]);

  // Handle event type filter change
  const handleEventFilterChange = (newFilter: {
    [key: string]: FilterState;
  }) => {
    setEventFilter(newFilter);
    // Find selected event type
    const selectedEvents = Object.entries(newFilter).flatMap(([_, state]) =>
      state.filters
        .filter((f) => f.checked)
        .map((f) => f.label.toUpperCase().replace(" ", "_"))
    );
    if (selectedEvents.length > 0) {
      setSelectedEventType(selectedEvents[0]);
    }
  };

  const { result: eventTypeFilterApi, loading: isLoadingEventTypeFilter } =
    useApiCall<any>({
      // url: `https://uat-api-dev.mfilterit.net/v1/app/event/event_list`,
      url: process.env.NEXT_PUBLIC_APP_PERF + `reengagement/event/event_list`,
      method: "POST",
      manual: true,
      onSuccess: (data) => {
        if (Array.isArray(data)) {
          console.log("eventTypeFilterApi", data);
          const eventTypes = data.map(
            (item: any) => item.event_type || item.name || item
          );
          setEventTypeOptions(eventTypes);
          // Keep selectedEventTypes empty for "All" behavior
          // Initialize selectedEventTypesChart with all event types for multiple selection
          setSelectedEventTypesChart(eventTypes);
        }
      },
      onError: (error) => {},
    });

  // Call eventTypeFilterApi only once on mount
  useEffect(() => {
    if (isMutation(eventTypeFilterApi) && selectedPackage) {
      eventTypeFilterApi.mutate({
        package_name: selectedPackage,
        start_date: startDate,
        end_date: endDate,
      });
    }
  }, [startDate, endDate, selectedPackage]); // Empty dependency array to run only once on mount

  // Handle event type selection
  const handleEventTypeToggle = (eventType: string) => {
    setSelectedEventTypes(eventType);
    setIsEventTypeDropdownOpen(false); // Close dropdown immediately
    // The main useEffect will handle the API call
  };

  // Handle select all event types
  const handleSelectAllEventTypes = () => {
    setSelectedEventTypes("");
    setIsEventTypeDropdownOpen(false); // Close dropdown immediately
    // The main useEffect will handle the API call
  };

  // Handle deselect all event types
  const handleDeselectAllEventTypes = () => {
    setSelectedEventTypes("");
  };

  // Handle event type selection for chart
  const handleEventTypeToggleChart = (eventType: string) => {
    setSelectedEventTypesChart((prev) => {
      if (prev.includes(eventType)) {
        return prev.filter((type) => type !== eventType);
      } else {
        return [...prev, eventType];
      }
    });
  };

  // Handle select all event types for chart
  const handleSelectAllEventTypesChart = () => {
    setSelectedEventTypesChart([...eventTypeOptions]);
  };

  // Handle deselect all event types for chart
  const handleDeselectAllEventTypesChart = () => {
    setSelectedEventTypesChart([]);
  };

  // Handle apply button click for chart dropdown
  const handleApplyEventTypesChart = () => {
    // Close dropdown
    setIsEventTypeChartDropdownOpen(false);

    // Trigger event chart API call with selected event types
    if (
      isDialogOpen &&
      selectedPublisher &&
      eventChartApi &&
      typeof (eventChartApi as any).mutate === "function" &&
      selectedPackage
    ) {
      setEventChartLoading(true);

      (eventChartApi as any).mutate({
        start_date: dialogStartDate,
        end_date: dialogEndDate,
        package_name: selectedPackage,
        publisher: selectedPublisher,
        event_type:
          selectedEventTypesChart.length === eventTypeOptions.length &&
          eventTypeOptions.length > 0
            ? ["all"]
            : selectedEventTypesChart,
      });
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Handler for dialog date change (local state only)
  const handleDialogDateChange = (range: DateRange | undefined) => {
    setDialogDateRange(range);
    if (range?.from && range?.to) {
      const newStartDate = format(range.from, "yyyy-MM-dd");
      const newEndDate = format(range.to, "yyyy-MM-dd");
      setDialogStartDate(newStartDate);
      setDialogEndDate(newEndDate);

      // Close the date picker popover
      setIsDatePickerOpen(false);

      // Trigger chart API calls when date changes
      if (isDialogOpen && selectedPublisher && selectedPackage) {
        // Call install chart API
        setInstallChartLoading(true);
        if (
          installChartApi &&
          typeof (installChartApi as any).mutate === "function"
        ) {
          (installChartApi as any).mutate({
            start_date: newStartDate,
            end_date: newEndDate,
            package_name: selectedPackage,
            publisher: selectedPublisher,
            event_type:
              !selectedEventTypes || selectedEventTypes === "all"
                ? ["all"]
                : [selectedEventTypes],
          });
        }

        // Call event chart API
        setEventChartLoading(true);
        if (
          eventChartApi &&
          typeof (eventChartApi as any).mutate === "function"
        ) {
          (eventChartApi as any).mutate({
            start_date: newStartDate,
            end_date: newEndDate,
            package_name: selectedPackage,
            publisher: selectedPublisher,
            event_type:
              selectedEventTypesChart.length === eventTypeOptions.length &&
              eventTypeOptions.length > 0
                ? ["all"]
                : selectedEventTypesChart,
          });
        }
      }
    }
  };

  // Handler for dialog preset selection
  const handleDialogPresetSelect = (value: string) => {
    let newDateRange: DateRange | undefined;

    switch (value) {
      case "l_month":
        newDateRange = {
          from: startOfMonth(subMonths(new Date(), 1)),
          to: endOfMonth(subMonths(new Date(), 1)),
        };
        break;
      case "l_week":
        newDateRange = {
          from: startOfWeek(subWeeks(new Date(), 1)),
          to: endOfWeek(subWeeks(new Date(), 1)),
        };
        break;
      default:
        newDateRange = {
          from: subDays(new Date(), parseInt(value)),
          to: new Date(),
        };
        break;
    }

    if (newDateRange?.from && newDateRange?.to) {
      setDialogDateRange(newDateRange);
      const newStartDate = format(newDateRange.from, "yyyy-MM-dd");
      const newEndDate = format(newDateRange.to, "yyyy-MM-dd");
      setDialogStartDate(newStartDate);
      setDialogEndDate(newEndDate);

      // Close the date picker popover
      setIsDatePickerOpen(false);

      // Trigger chart API calls when preset is selected
      if (isDialogOpen && selectedPublisher && selectedPackage) {
        // Call install chart API
        setInstallChartLoading(true);
        if (
          installChartApi &&
          typeof (installChartApi as any).mutate === "function"
        ) {
          (installChartApi as any).mutate({
            start_date: newStartDate,
            end_date: newEndDate,
            package_name: selectedPackage,
            publisher: [selectedPublisher],
          });
        }

        // Call event chart API
        setEventChartLoading(true);
        if (
          eventChartApi &&
          typeof (eventChartApi as any).mutate === "function"
        ) {
          (eventChartApi as any).mutate({
            start_date: newStartDate,
            end_date: newEndDate,
            package_name: selectedPackage,
            publisher: [selectedPublisher],
            event_type:
              selectedEventTypesChart.length === eventTypeOptions.length &&
              eventTypeOptions.length > 0
                ? ["all"]
                : selectedEventTypesChart,
          });
        }
      }
    }
  };

//export
 const { result: publisherdownloadSummaryApi, loading: isLoadingdownloadPublisherSummary } =
    useApiCall<any>({
      // url: "https://uat-api-dev.mfilterit.net/v1/app/install/publisher_summery",
      url: getApiEndpoint(selectedType, "publisher_summary"),
      method: "POST",
      manual: true,
      onSuccess: (response) => {
        if (response) {
        console.log(response,"summarytableexport")
         if (response && response.url) {
        const link = document.createElement("a");
        link.href = response.url;
        link.setAttribute("download", "fraud_sub_categories.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
      }
        }
      },
      onError: (error) => {
               console.log(error)
      },
    });




  //export
  const handleExport = async () => {
    if (isMutation(publisherdownloadSummaryApi)) {
      publisherdownloadSummaryApi.mutate({
        start_date: startDate,
        end_date: endDate,
        package_name: selectedPackage,
        summary_type: "publisher",
        publisher_type: "all",
        order: "ascending",
        column_name: "publisher_name",
        page_number: currentPage,
        record_limit: limit,
        search_term: debouncedSearchTerm,
        publisher: publisherfilter,
        campaign_id: campaignfilter,
        vendor_id:agencyfilter,
        country: countryfilter,
        event_type: ["all"],
        column_type: selectedRadioButton,
        export_type: "csv",
      });
    }
  };


  return (
    <div className=" flex flex-col gap-2">
      <div className="w-full bg-gray-200 text-sub-header font-semibold py-2 px-4 flex flex-col sm:flex-row items-center justify-center relative min-h-[40px]">
        {/* Title (always centered) */}
        <span className="text-center text-sm sm:text-base">
          Publisher Validation Summary ({currentTypeLabels.plural})
        </span>

        {/* Dropdown - aligned right on large screens, centered on small, with width control */}
        {selectedType === "event" && (
        <div className="mt-2 sm:mt-0 sm:absolute sm:right-4 w-full sm:w-auto max-w-[220px]">
          <DropdownMenu
            open={isEventTypeDropdownOpen}
            onOpenChange={setIsEventTypeDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-1.5 h-8 text-sm w-full sm:w-auto"
              >
                
                <span className="text-sm">Event Types</span>
                {hasMounted && (
                  <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px]">
                    {!selectedEventTypes || selectedEventTypes === "all"
                      ? "All"
                      : "1"}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
              <div className="p-2 border-b">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Event Types</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllEventTypes}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {isLoadingEventTypeFilter ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  <span className="text-sm text-muted-foreground">
                    Loading...
                  </span>
                </div>
              ) : (
                eventTypeOptions.map((eventType) => (
                  <div
                    key={eventType}
                    className="flex items-center px-2 py-1.5 hover:bg-accent cursor-pointer"
                    onClick={() => handleEventTypeToggle(eventType)}
                  >
                    {hasMounted && (
                      <Checkbox
                        checked={selectedEventTypes === eventType}
                        className="mr-2 pointer-events-none"
                      />
                    )}
                    <span className="text-sm">{eventType}</span>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        )}
      </div>

      <div className={`rounded-lg shadow ${(isLoadingPublisherSummary || tableData1.length === 0) ? "min-h-[450px]" : "min-h-[200px]"}`}>
        {isLoadingPublisherSummary ? (
          <div className="flex items-center justify-center h-full min-h-[450px]">
            <div className="text-gray-500 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        ) : (
          <>
          {tableColumns.length > 0 ? (
            <ResizableTable
              columns={tableColumns}
              data={tableData1 ? tableData1 : []}
              isSearchable={true}
              isPaginated={true}
              headerColor="#DCDCDC"
              SearchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isUserTable={false}
              isTableDownload={false}
               actionButton={
            <>
             
              <Button variant="outline" size="sm" onClick={handleExport} >
                {isLoadingdownloadPublisherSummary ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Export
                  </>
                ) : (
                  <>
                    <MdFileDownload className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </Button>
            </>
          }
              isLoading={isLoadingPublisherSummary}
              totalPages={totalPages}
              totalRecords={totalRecords}
              pageNo={currentPage}
              limit={limit}
              onPageChangeP={(newPage: number) => {
                setCurrentPage(newPage);
              }}
              onLimitChange={(newLimit: number) => {
                setLimit(newLimit);
                setCurrentPage(1);
              }}
              isRadioButton={true}
              tableBody="text-left"
              tableHeader="text-left"
              onSelectedRadioButton={handleSelectedRadioButton}
              selectedRadioValue={selectedRadioButton}
              isRefetch={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[450px]">
              <div className="text-center">
                <span className="text-small-font">No data available</span>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex flex-col gap-4 w-full h-full overflow-y-auto">
            {/* Header with Local Date Picker */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sticky top-0 bg-background z-10 pb-2 mt-2">
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-fit justify-start text-left font-normal text-sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dialogDateRange?.from ? (
                      dialogDateRange.to ? (
                        <>
                          {format(dialogDateRange.from, "LLL dd, y")} -{" "}
                          {format(dialogDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dialogDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Select onValueChange={handleDialogPresetSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Preset" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="l_week">Last week</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="l_month">Last month</SelectItem>
                      <SelectItem value="90">Last 3 months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dialogDateRange?.from}
                    selected={dialogDateRange}
                    onSelect={handleDialogDateChange}
                    numberOfMonths={2}
                    disabled={{ after: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Charts Container */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
              {/* Primary Chart - Click/Conversion to Install or Event Chart */}
              <Card className="px-3 sm:px-4 py-3 shadow-lg w-full min-w-0">
                <div className="text-left font-semibold text-sm sm:text-base mb-2">
                  Click to Install Time: {selectedPublisher}
                </div>
                <div className="w-full">
                  <DoubleLineChart
                    chartData={installChartData}
                    chartConfig={getInstallChartConfig(selectedPublisher || "")}
                    isRadioButton={false}
                    isLoading={installChartLoading}
                    AxisLabel="Percentage"
                    selectoptions={["Desktop", "Mobile"]}
                    handleFrequencyChange={handleDeviceChange}
                    selectedFrequency={deviceType}
                    isPercentage={true}
                    onExpand={() => {}}
                    LinechartTitle=""
                    showMenu={false}
                    xAxisLabel="Minutes"
                    yAxisLabel="Percentage"
                  />
                </div>
              </Card>

              {/* Event Chart with Filter - Always show for consistency */}
              <Card className="px-3 sm:px-4 py-3 shadow-lg w-full min-w-0">
                <div className="flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <div className="text-left font-semibold text-sm sm:text-base">
                    Install to Event Time: {selectedPublisher}
                    </div>
                    <DropdownMenu
                      open={isEventTypeChartDropdownOpen}
                      onOpenChange={setIsEventTypeChartDropdownOpen}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 text-sm w-full sm:w-auto"
                        > 
                          <span className="truncate">Event Types</span>
                          {hasMounted && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex-shrink-0">
                              {selectedEventTypesChart.length ===
                              eventTypeOptions.length
                                ? "All"
                                : selectedEventTypesChart.length === 1
                                ? "1"
                                : `${selectedEventTypesChart.length}`}
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                        <div className="p-2 border-b">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              Event Types
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllEventTypesChart}
                                className="text-xs"
                              >
                                Select All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeselectAllEventTypesChart}
                                className="text-xs"
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        </div>
                        {isLoadingEventTypeFilter ? (
                          <div className="p-4 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            <span className="text-sm text-muted-foreground">
                              Loading...
                            </span>
                          </div>
                        ) : (
                          <>
                            {eventTypeOptions.map((eventType) => (
                              <div
                                key={eventType}
                                className="flex items-center px-2 py-1.5 hover:bg-accent cursor-pointer"
                                onClick={() =>
                                  handleEventTypeToggleChart(eventType)
                                }
                              >
                                {hasMounted && (
                                  <Checkbox
                                    checked={selectedEventTypesChart.includes(
                                      eventType
                                    )}
                                    className="mr-2 pointer-events-none"
                                  />
                                )}
                                <span className="text-sm">{eventType}</span>
                              </div>
                            ))}
                            <DropdownMenuSeparator />
                            <div className="p-2">
                              <Button
                                onClick={handleApplyEventTypesChart}
                                className="w-full"
                                disabled={selectedEventTypesChart.length === 0}
                              >
                                Apply (
                                {hasMounted
                                  ? selectedEventTypesChart.length
                                  : 0}
                                )
                              </Button>
                            </div>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="w-full">
                    <DoubleLineChart
                      chartData={eventChartData}
                      chartConfig={getEventChartConfig(selectedPublisher || "")}
                      isRadioButton={true}
                      isLoading={eventChartLoading}
                      AxisLabel="Percentage"
                      selectoptions={["Desktop", "Mobile"]}
                      handleFrequencyChange={handleDeviceChange}
                      selectedFrequency={deviceType}
                      isPercentage={true}
                      onExpand={() => {}}
                      LinechartTitle=""
                      showMenu={false}
                      xAxisLabel="Minutes"
                      yAxisLabel="Percentage"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
