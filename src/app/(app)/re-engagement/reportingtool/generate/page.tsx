"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Settings, X, Plus, Minus, Loader2, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";

import { useRouter, useSearchParams } from "next/navigation";
import { useApiCall } from "@/app/(main)/(app)/app-analytics/queries/api_base";
import { usePackage } from "@/components/mf/PackageContext";
import FilterModal from "@/components/report/filterModal";
import DeliveryOptionsModal from "@/components/report/integritydeliveryoptionsmodal";
import ThresholdModal from "@/components/report/thresholdModal";
import ConfirmationDialog from "@/components/report/confirmationDialog";
import ToastContent, {
  ToastType,
} from "@/components/mf/ToastContent";
import { useToast } from "@/hooks/use-toast";
import { useDateRange } from "@/components/mf/DateRangeContext";

interface EmailListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedOption {
  label: string;
  items: { id: string; label: string }[];
}

const GenerateReportPage = () => {



  const [toastData, setToastData] = useState<{
    type: ToastType;
    title: string;
    description?: string;
    variant?: "default" | "destructive" | null;
  } | null>(null);
  const { selectedPackage } = usePackage();
  const [fileType, setFileType] = useState<string>("csv");
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [customEmails, setCustomEmails] = useState<string[]>([""]);
  const [columnOrder, setColumnOrder] = useState<
    Array<{ id: string; content: string; type: "dimension" | "metric" }>
  >([]);
  const [selectedColumns, setSelectedColumns] = useState<typeof columnOrder>(
    []
  );
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [selectedEventDimensions, setSelectedEventDimensions] = useState<string[]>([]);
  const [selectedConversionDimensions, setSelectedConversionDimensions] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedItemForThreshold, setSelectedItemForThreshold] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [templateValue, setTemplateValue] = useState<string[]>([]);
  const [templateValueEvent, setTemplateValueEvent] = useState<string[]>([]);
  const [templateValueConversion, setTemplateValueConversion] = useState<string[]>([]);
  const [selectedItemForFilter, setSelectedItemForFilter] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [dimensionSearch, setDimensionSearch] = useState("");
  const [metricSearch, setMetricSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedTemplateEvent, setSelectedTemplateEvent] = useState<string>("");
  const [selectedTemplateConversion, setSelectedTemplateConversion] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const mode = searchParams.get("mode");
  const frequencyValue = searchParams.get("frequency");
  const [frequency, setFrequency] = useState<any>(null);
  const [reportName, setReportName] = useState("");
  const [reportCategory, setReportCategory] = useState<string>("summary");
  const [category, setCategory] = useState<string>("");



  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryModalType, setDeliveryModalType] = useState<
    "schedule" | "download"
  >("schedule");
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [dimensions, setDimensions] = useState<GroupedOption[]>([]);
  const [eventDimensions, setEventDimensions] = useState<GroupedOption[]>([]);
  const [conversionDimensions, setConversionDimensions] = useState<GroupedOption[]>([]);
  const [openDimensionPopover, setOpenDimensionPopover] = useState(false);
  const [openEventDimensionPopover, setOpenEventDimensionPopover] = useState(false);
  const [openConversionDimensionPopover, setOpenConversionDimensionPopover] = useState(false);
  const [filterData, setFilterData] = useState<any>();
  const [deliveryData, setDeliveryData] = useState<any | null>(undefined);
  const [statusCheck, setStatusCheck] = useState("no");

  const [isDownloadReport, setIsDownloadReport] = useState<boolean | null>(null);

  const [dimensionsFilters, setDimensionsFilters] = useState<
    Array<{
      field: string;
      value: string[];
    }>
  >([]);
const apiCallInProgressRef = useRef<boolean>(false); // Prevent duplicate API calls
  const [reportNameError, setReportNameError] = useState<string | null>(null);
  const [dimensionsError, setDimensionsError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [metricsThresholds, setMetricsThresholds] = useState<
    Array<{ field: string; operator: string; value: string }>
  >([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  // Track which template API calls have been made to prevent duplicates
  const [templateApiCalled, setTemplateApiCalled] = useState<string[]>([]);
  const { toast } = useToast();
  const { startDate, endDate } = useDateRange();
  const [filterSearch, setFilterSearch] = useState("");
  const [debouncedFilterSearch, setDebouncedFilterSearch] = useState("");
  const shouldShowFilter = (dimensionId: string): boolean => {
    // Array of terms that should NOT show filter icons
    const filterExcludedTerms = ['date', 'time'];
    
    // Check if any excluded term exists in the dimension ID
    return !filterExcludedTerms.some(term => 
      dimensionId.toLowerCase().includes(term)
    );
  };
  // api call  category 
  const { result: categoryApi, loading: categoryLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/get_category`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/get_category`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      // package_name: "com.myairtelapp"
    },
    onSuccess: (data) => {
      console.log("Category API Response:", data);
      setCategoryData(data as any[]);
    },
    onError: (error) => {
      console.error("Error fetching category:", error);
    },
  });

  useEffect(() => {
    if (selectedPackage) {
      (categoryApi as any).mutate();
    }
  }, [selectedPackage,startDate,endDate]);





  // Generic template API call - no hardcoded category names
  const { result: templateApi, loading: templateLoading } = useApiCall({
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/get_template`,
    method: "POST",
    manual: true, // Enable manual triggering
    onSuccess: (data) => {
      console.log("Template API response:", data);
      const responseData = data as string[]; // Direct array response like ["Custom"]
      
      if (responseData && responseData.length > 0) {
        const firstTemplate = responseData[0];
        console.log("Setting first template as default:", firstTemplate);
        
        // Completely dynamic approach - no hardcoded category names
        // Use a generic function to update template state for any category
        const updateTemplateState = (categoryName: string, templates: string[], selectedTemplate: string) => {
          // Generic template state update - works for any category
          switch(categoryName) {
            case 'click':
              setTemplateValue(templates);
              setSelectedTemplate(selectedTemplate);
              break;
            case 'conversion':
              setTemplateValueConversion(templates);
              setSelectedTemplateConversion(selectedTemplate);
              break;
            case 'event':
              setTemplateValueEvent(templates);
              setSelectedTemplateEvent(selectedTemplate);
              break;
            default:
              // Handle any new category here without hardcoding in the main logic
              console.log(`No template state handling defined for category: ${categoryName}`);
              break;
          }
        };
        
        // Determine which category this response is for
        // This is a simplified approach - in a real scenario, you might want to track which API call this response belongs to
        const currentCategory = category; // Use the current selected category
        console.log("Current category for template response:", currentCategory);
        console.log("Template response data:", responseData);
        console.log("First template to be selected:", firstTemplate);
        if (currentCategory) {
          updateTemplateState(currentCategory, responseData, firstTemplate);
          console.log(`Template state updated for category: ${currentCategory}`);
        }
      }
    },
    onError: (error) => {
      console.error("Error fetching template:", error);
    },
  });

  useEffect(() => {
    if (category && selectedPackage) {
      // Make API call for the selected category
      const callKey = `template-${category}-${selectedPackage}`;
      
      if (!templateApiCalled.includes(callKey)) {
        console.log(`Calling template API for category: ${category}`);
        setTemplateApiCalled(prev => [...prev, callKey]);
        (templateApi as any).mutate({
          package_name: selectedPackage,
          category: category
        });
      }
    }
  }, [category, selectedPackage, templateApiCalled]);

  // Note: Default template selection is now handled directly in the API response

  // Generic template fields API call - no hardcoded category names
  const { result: templateFieldsMutation, loading: templateFieldsLoading } =
    useApiCall({
      url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/get_template_fields`,
      method: "POST",
      manual: true, // Enable manual triggering
      onSuccess: (data: { dimensions?: any[] }) => {
        console.log("Template fields API response:", data);
        console.log("Setting dimensions for all categories:", data?.dimensions);
        // Handle dimensions for any category
        setDimensions(data?.dimensions || []);
        // Also set eventDimensions for event category
        setEventDimensions(data?.dimensions || []);
        // Set conversionDimensions for conversion category
        setConversionDimensions(data?.dimensions || []);
      },
      onError: (error) => {
        console.error("Error fetching template fields:", error);
      },
    });

  // Track which template fields API calls have been made to prevent duplicates
  const [templateFieldsCalled, setTemplateFieldsCalled] = useState<string[]>([]);

  // Generic useEffect to handle template fields API call for any category
  useEffect(() => {
    if (mode === "view") return;
    
    // Call template fields API for the selected category that has a template selected
    if (category && selectedPackage && reportCategory) {
      const callsToMake = [];
      
      // Check click category
      if (selectedTemplate && selectedTemplate.trim() !== '' && category === 'click') {
        const callKey = `click-${selectedTemplate}`;
        if (!templateFieldsCalled.includes(callKey)) {
          callsToMake.push({ template: selectedTemplate, category: 'click', callKey });
        }
      }
      
      // Check conversion category
      if (selectedTemplateConversion && selectedTemplateConversion.trim() !== '' && category === 'conversion') {
        const callKey = `conversion-${selectedTemplateConversion}`;
        if (!templateFieldsCalled.includes(callKey)) {
          callsToMake.push({ template: selectedTemplateConversion, category: 'conversion', callKey });
        }
      }
      
      // Check event category
      if (selectedTemplateEvent && selectedTemplateEvent.trim() !== '' && category === 'event') {
        const callKey = `event-${selectedTemplateEvent}`;
        if (!templateFieldsCalled.includes(callKey)) {
          callsToMake.push({ template: selectedTemplateEvent, category: 'event', callKey });
        }
      }
      
      console.log("Template fields API calls to make:", callsToMake);
      
      // Make API calls for each category that has a template selected
      callsToMake.forEach(({ template, category: cat, callKey }) => {
        console.log(`Calling template fields API for ${cat} with template: ${template}`);
        setTemplateFieldsCalled(prev => [...prev, callKey]);
        (templateFieldsMutation as any).mutate({
          template: template,
          category: cat,
          package_name: selectedPackage,
          report_type: reportCategory
        });
      });
    }
  }, [selectedTemplate, selectedTemplateEvent, selectedTemplateConversion, category, selectedPackage, reportCategory, mode, templateFieldsCalled]);

  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
  
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
  
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
  
    return debouncedValue;
  };

  const debouncedSearchTerm = useDebounce(filterSearch, 500);


  // api call for filter
  const { result: filterApi, loading: filterLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/fields/filters/${selectedItemForFilter?.id}/`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/fields/filters/${selectedItemForFilter?.id}/`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      // package_name: "com.myairtelapp",
      category: filterCategory || category,
      report_type:reportCategory,
      search: filterSearch
    },
    onSuccess: (data) => {
      setFilterData(data);
    },
    onError: (error) => {
      console.error("Error fetching report:", error);
    },
  });

  // api call for creating report
  const { result: createReportApi, loading: createReportLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/create_report`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/create_report`,
    method: "POST",
    manual: true,
    onSuccess: (data: { status?: string }) => {
      setToastData({
        type: "success",
        title: "Success",
        description: "Report created successfully!",
        variant: "default",
      });
      if (data?.status === "success") {
        router.push("/re-engagement/reportingtool/report");
      }
    },
    onError: (error) => {
      console.error("Error creating report:", error);
    },
  });

  // Update columnOrder when dimensions change
  useEffect(() => {
    const dimensionColumns = selectedDimensions.map((dim) => ({
      id: `dim-${dim}`,
      content: dim,
      type: "dimension" as const,
    }));

    setColumnOrder([...dimensionColumns]);
  }, [selectedDimensions]);

  // api call for view report
  const { result: viewReportApi, loading: viewReportLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/view_report`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/view_report`,
    method: "POST",
    manual: true,
    onSuccess: (data) => { },
    onError: (error) => {
      console.error("Error fetching report:", error);
    },
  });

  useEffect(() => {
    if (editId && (mode === "edit" || mode === "clone" || mode === "view")) {
      if (
        viewReportApi &&
        typeof (viewReportApi as any).mutate === "function"
      ) {
        (viewReportApi as any).mutate({
          doc_id: editId,
          package_name: selectedPackage,
          // package_name: "com.myairtelapp"
        });
      }
    }
  }, [editId]);

  // Replace the useEffect that sets the form data with this:
  useEffect(() => {
    if ((viewReportApi as any)?.data?.data) {
      const responseData = (viewReportApi as any).data.data;
      
      // Extract categories and data from the response
      let installData = null;
      let eventData = null;
      
      if (responseData.install) {
        installData = responseData.install;
      }
      
      if (responseData.event) {
        eventData = responseData.event;
      }
      
      // Use install data as primary, fall back to event data for common fields
      const primaryData = installData || eventData;
      
      if (primaryData) {
        setReportName(primaryData.report_name);
        setReportCategory(primaryData.report_type);
        setFrequency(primaryData.occurence);
        setFileType(primaryData.reportFormats);
        
        // Set download status based on the response
        const downloadStatus = primaryData.download === "yes";
        setIsDownloadReport(downloadStatus);
        
        // Set category based on the primary data
        if (primaryData.category) {
          const categoryValue = Array.isArray(primaryData.category) ? primaryData.category[0] : primaryData.category;
          setCategory(categoryValue);
        }
        
        // Set install-specific data
        if (installData) {
          setSelectedTemplate(installData.template);
          
          // Set install dimensions filters
          if (installData.dimensions && installData.dimensions.length > 0) {
            setDimensionsFilters(installData.dimensions);

            // Extract dimension fields for selection
            const dimensionFields = installData.dimensions.map((dim: { field: string }) => dim.field);
            setSelectedDimensions(dimensionFields);

            const transformed = installData.dimensions.map((dimension: { field: string }) => ({
              label: "",
              items: [
                {
                  id: dimension.field,
                  label: dimension.field,
                },
              ],
            }));

            setDimensions(transformed);
          }
        }
        
        // Set event-specific data
        if (eventData) {
          setSelectedTemplateEvent(eventData.template);
          
          // Set event dimensions if install doesn't exist or if we need separate event dimensions
          if (eventData.dimensions && eventData.dimensions.length > 0) {
            // If we only have event data, use it for main dimensions
            if (!installData) {
              setDimensionsFilters(eventData.dimensions);
              const dimensionFields = eventData.dimensions.map((dim: { field: string }) => dim.field);
              setSelectedDimensions(dimensionFields);
            } else {
              // If we have both, set event dimensions separately
              const eventDimensionFields = eventData.dimensions.map((dim: { field: string }) => dim.field);
              setSelectedEventDimensions(eventDimensionFields);
            }

            const eventTransformed = eventData.dimensions.map((dimension: { field: string }) => ({
              label: "",
              items: [
                {
                  id: dimension.field,
                  label: dimension.field,
                },
              ],
            }));

            setEventDimensions(eventTransformed);
          }
        }
        
        // Transform delivery options to match DeliveryOptionsModal expectations
        let transformedDeliveryData = null;
        
        if (installData?.deliveryOptions) {
          transformedDeliveryData = { ...installData.deliveryOptions };
          
          // Transform email data structure for install
          if (installData.deliveryOptions.email) {
            const emailData = installData.deliveryOptions.email;
            transformedDeliveryData.email = {
              ...emailData,
              status: emailData.status, // Ensure status is set for the modal
              install_to: emailData.to || [],
              install_mail_id_list: emailData.mail_id_list || [],
              // Also keep original structure for backward compatibility
              to: emailData.to || [],
              mail_id_list: emailData.mail_id_list || []
            };
            
            // Set customEmails for backward compatibility
            if (emailData.to && emailData.to.length > 0) {
              setCustomEmails(emailData.to);
            }
          }
        }
        
        if (eventData?.deliveryOptions) {
          if (!transformedDeliveryData) {
            transformedDeliveryData = { ...eventData.deliveryOptions };
          }
          
          // Transform email data structure for event
          if (eventData.deliveryOptions.email) {
            const emailData = eventData.deliveryOptions.email;
            if (!transformedDeliveryData.email) {
              transformedDeliveryData.email = {};
            }
            
            transformedDeliveryData.email = {
              ...transformedDeliveryData.email,
              ...emailData,
              status: emailData.status, // Ensure status is set for the modal
              event_to: emailData.to || [],
              event_mail_id_list: emailData.mail_id_list || [],
              // Also keep original structure
              to: emailData.to || [],
              mail_id_list: emailData.mail_id_list || []
            };
            
            // Set customEmails if no install emails
            if (!installData?.deliveryOptions?.email?.to && emailData.to && emailData.to.length > 0) {
              setCustomEmails(emailData.to);
            }
          }
        }
        
        // If we have both install and event, create a nested structure
        if (installData && eventData) {
          const nestedDeliveryOptions = {
            install: transformedDeliveryData,
            event: eventData.deliveryOptions
          };
          setDeliveryData(nestedDeliveryOptions);
        } else {
          // Single category - use transformed data directly
          setDeliveryData(transformedDeliveryData);
        }
        
       
      }
    }
  }, [viewReportApi?.data]);



  useEffect(() => {
    console.log("Debug - Current state:", {
      selectedTemplate,
      dimensionsLength: dimensions,
      selectedDimensionsLength: selectedDimensions.length,
      dimensionsFiltersLength: dimensionsFilters.length,
      editId,
      hasViewData: !!viewReportApi?.data,
      currentCategory: category,
      deliveryData: deliveryData
    });
  }, [
    selectedTemplate,
    dimensions,
    selectedDimensions,
    dimensionsFilters,
    editId,
    viewReportApi?.data,
    category,
    deliveryData
  ]);

  // Debug category changes
  useEffect(() => {
    console.log("Category state changed:", category);
  }, [category]);



  // Handle category setting when both viewReportApi data and categoryData are available
  useEffect(() => {
    if ((viewReportApi as any)?.data?.data && categoryData && categoryData.length > 0) {
      const responseData = (viewReportApi as any).data.data;
      let categoryValue = "";
      
      if (responseData.install) {
        const installCategory = responseData.install.category;
        categoryValue = Array.isArray(installCategory) ? installCategory[0] || "" : installCategory || "";
      } else if (responseData.event) {
        const eventCategory = responseData.event.category;
        categoryValue = Array.isArray(eventCategory) ? eventCategory[0] || "" : eventCategory || "";
      }
      
      console.log("=== CATEGORY SETTING DEBUG ===");
      console.log("Extracted category from response:", categoryValue);
      console.log("Available categoryData options:", categoryData);
      console.log("CategoryData values:", categoryData.map(item => item.value));
      
      // Check if the extracted category matches any available options
      const isValidCategory = categoryData.some(option => option.value === categoryValue);
      
      console.log("Valid matching category:", isValidCategory);
      console.log("Setting category to:", isValidCategory ? categoryValue : "");
      
      setCategory(isValidCategory ? categoryValue : "");
    }
  }, [viewReportApi?.data, categoryData]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(columnOrder || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setColumnOrder(items);
  };

  const handleColumnSelect = (value: string) => {
    const selectedColumn = columnOrder?.find((col) => col.id === value);
    if (selectedColumn && !selectedColumns?.find((col) => col.id === value)) {
      setSelectedColumns([...selectedColumns, selectedColumn]);
    }
  };

  const handleRemoveColumn = (id: string) => {
    setSelectedColumns(selectedColumns?.filter((col) => col.id !== id) || []);
  };

  const handleDimensionSelect = (value: string) => {
    setSelectedDimensions((prev) => {
      const currentSelected = prev || [];
      if (currentSelected.includes(value)) {
        return currentSelected.filter((dim) => dim !== value);
      }
      const newSelected = [...currentSelected, value];
      // Clear error if at least one dimension is selected
      if (newSelected.length > 0) {
        setDimensionsError(null);
      }
      return newSelected;
    });
  };

  const handleEventDimensionSelect = (value: string) => {
    setSelectedEventDimensions((prev) => {
      const currentSelected = prev || [];
      if (currentSelected.includes(value)) {
        return currentSelected.filter((dim) => dim !== value);
      }
      const newSelected = [...currentSelected, value];
      // Clear error if at least one dimension is selected
      if (newSelected.length > 0) {
        setDimensionsError(null);
      }
      return newSelected;
    });
  };

  const handleConversionDimensionSelect = (value: string) => {
    setSelectedConversionDimensions((prev) => {
      const currentSelected = prev || [];
      if (currentSelected.includes(value)) {
        return currentSelected.filter((dim) => dim !== value);
      }
      const newSelected = [...currentSelected, value];
      // Clear error if at least one dimension is selected
      if (newSelected.length > 0) {
        setDimensionsError(null);
      }
      return newSelected;
    });
  };

  const handleMetricSelect = (value: string) => {
    setSelectedMetrics((prev) => {
      const currentSelected = prev || [];
      if (currentSelected.includes(value)) {
        return currentSelected.filter((metric) => metric !== value);
      }
      const newSelected = [...currentSelected, value];
      // Clear error if at least one metric is selected
      if (newSelected.length > 0) {
        setMetricsError(null);
      }
      return newSelected;
    });
  };

  // const handleFilterClick = (item: { id: string; label: string }, categoryType: string) => {
  //   setSelectedItemForFilter(item);
  //   setFilterCategory(categoryType);
  //   if (typeof (filterApi as any).mutate === "function") {
  //     (filterApi as any).mutate();
  //   }
  //   setFilterModalOpen(true);
  // };

   // Add useEffect to trigger API call when debounced search changes
   useEffect(() => {
    // Only trigger API if modal is open and we have a valid filter setup
    if (selectedItemForFilter && (filterCategory || category.length > 0) && selectedPackage && reportCategory && filterModalOpen) {
      // Prevent duplicate API calls using ref
      if (apiCallInProgressRef.current) {
        console.log("⏸️ API call already in progress, skipping...");
        return;
      }
      
      console.log("🚀 Parent: Making API call with search:", { 
        filterSearch, 
        selectedItemForFilter: selectedItemForFilter?.id,
        filterCategory,
        trigger: "filterSearch or modal state change"
      });
      
      apiCallInProgressRef.current = true;
      
      if (typeof (filterApi as any).mutate === "function") {
        (filterApi as any).mutate();
      }
      
      // Reset the flag after a short delay
      setTimeout(() => {
        apiCallInProgressRef.current = false;
      }, 100);
    }
  }, [
    filterSearch, // Trigger on filterSearch changes (search functionality)
    selectedItemForFilter?.id, // Trigger when filter item changes (initial load)
    filterCategory, // Trigger when category changes (initial load) 
    filterModalOpen, // Trigger when modal opens (initial load)
  ]);

// Update the handleFilterClick function
const handleFilterClick = (item: { id: string; label: string }, categoryType: string) => {
  setSelectedItemForFilter(item);
  setFilterCategory(categoryType);
  setFilterSearch(""); // Reset search when opening new filter
  
  if (typeof (filterApi as any).mutate === "function") {
    (filterApi as any).mutate();
  }
  setFilterModalOpen(true);
};

  const handleSaveThreshold = (thresholdData: {
    field: string;
    operator: string;
    value: string;
  }) => {
    // Check if this metric already has a threshold
    const existingIndex = metricsThresholds.findIndex(
      (metric: { field: string; operator: string; value: string }) => metric.field === thresholdData.field
    );

    if (existingIndex !== -1) {
      // Update existing threshold
      const updatedThresholds = [...metricsThresholds];
      updatedThresholds[existingIndex] = thresholdData;
      setMetricsThresholds(updatedThresholds);
    } else {
      // Add new threshold
      setMetricsThresholds([...metricsThresholds, thresholdData]);
    }
  };

  const handleSettingsClick = (item: { id: string; label: string }) => {
    setSelectedItemForThreshold(item);
    setThresholdModalOpen(true);
  };

  const handleCustomEmailChange = (index: number, value: string) => {
    const newEmails = [...(customEmails || [""])];
    newEmails[index] = value;
    setCustomEmails(newEmails);
  };

  const handleAddCustomEmail = () => {
    setCustomEmails([...(customEmails || [""]), ""]);
  };

  const handleRemoveCustomEmail = (index: number) => {
    if ((customEmails || []).length > 1) {
      const newEmails = (customEmails || []).filter((_, i) => i !== index);
      setCustomEmails(newEmails);
    }
  };

  // Handle template selection with validation
  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    setSelectedDimensions([]);
  };
const handleTemplateChangeEvent = (value: string) => {
    setSelectedTemplateEvent(value);
    setSelectedEventDimensions([]);
  };

const handleTemplateChangeConversion = (value: string) => {
    setSelectedTemplateConversion(value);
    setSelectedConversionDimensions([]);
  };
  const handleDownloadClick = () => {
    if (!reportName.trim()) {
      setReportNameError("Report name is mandatory.");
      return;
    }

    if (!category) {
      setCategoryError("Please select a category");
      return;
    }

    if (selectedTemplate === "Custom") {
      let hasError = false;
      if (selectedDimensions.length === 0) {
        setDimensionsError("Please select at least one dimension");
        hasError = true;
      }
      if (hasError) return;
    }

    console.log("=== DOWNLOAD CLICK DEBUG ===");
    console.log("Current deliveryData:", deliveryData);
    console.log("Current customEmails:", customEmails);
    console.log("Category:", category);
    console.log("=== END DOWNLOAD DEBUG ===");

    setDeliveryModalType("download");
    setDeliveryModalOpen(true);
    setStatusCheck("yes");
  };

  const handleFilterSave = (dimensionData: {
    field: string;
    value: string[];
  }) => {
    setDimensionsFilters((prev) => {
      const existingIndex = prev.findIndex(
        (dim) => dim.field === dimensionData.field
      );

      if (existingIndex !== -1) {
        const updatedFilters = [...prev];
        updatedFilters[existingIndex] = dimensionData;
        return updatedFilters;
      } else {
        return [...prev, dimensionData];
      }
    });
  };

  const { result: editReportApi, loading: editReportLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/edit_report`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/edit_report`,
    method: "POST",
    manual: true,
    onSuccess: (data) => {
      // toast({
      //   title: "Success",
      //   description: "Report updated successfully!",
      //   duration: 3000,
      // });
      setToastData({
        type: "success",
        title: "Success",
        description: "Report updated successfully!",
        variant: "default",
      });

      router.push("/re-engagement/reportingtool/report");
    },
    onError: (error) => {
      console.error("Error editing report:", error);
    },
  });

  // Fixed handleModalSubmit function
  const handleModalSubmit = (data: any, startdate: string, enddate: string) => {
    setDeliveryData(data);


    // Helper function to create dimensions payload for a specific category
    const createDimensionsPayload = (templateName: string, categoryType: string) => {
      let dimensionsForPayload: Array<{ field: string; value: string[] }> = [];

      if (templateName === "Custom") {
        const relevantDimensions = categoryType === "click" ? selectedDimensions : selectedEventDimensions;
        dimensionsForPayload = relevantDimensions.map((dimensionId) => {
          const existingFilter = dimensionsFilters.find(
            (filter) => filter.field === dimensionId
          );

          if (existingFilter) {
            return existingFilter;
          } else {
            return {
              field: dimensionId,
              value: [],
            };
          }
        });
      } else {
        // For non-custom templates, include all dimensions from the template
        const relevantDimensions = categoryType === "click" ? dimensions : eventDimensions;
        const allDimensions: Array<{ id: string; label: string }> = [];

        relevantDimensions.forEach((group) => {
          group.items.forEach((item) => {
            allDimensions.push(item);
          });
        });

        // Use existing filter value if available, otherwise default to empty array
        dimensionsForPayload = allDimensions.map((dimension) => {
          const existingFilter = dimensionsFilters.find(
            (filter) => filter.field === dimension.id
          );

          return {
            field: dimension.id,
            value: existingFilter ? existingFilter.value : [],
          };
        });
      }

      return dimensionsForPayload;
    };

    // FIXED: Conditional API calling with proper mutate functions
    if (editId && mode === "edit") {
      // For edit mode, send only the specific category data wrapped in category key
      let updateData: any = {};

      if (category === 'click') {
        const clickPayload: any = {
          report_name: reportName,
          occurence: frequency,
          package_name: selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplate, "click"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.click || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplate,
          category: "click",
        };
        console.log("frequency is", frequency)
        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          clickPayload.start_date = startdate;
          clickPayload.end_date = enddate;
        }

        updateData = {
          "click": clickPayload
        };
      } else if (category === 'conversion') {
        const conversionPayload: any = {
          report_name: reportName,
          occurence: frequency,
          package_name: selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplateEvent, "conversion"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.conversion || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplateEvent,
          category: "conversion",
        };

      
        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          conversionPayload.start_date = startdate;
          conversionPayload.end_date = enddate;
        }

        updateData = {
          "conversion": conversionPayload
        };
      } else if (category === 'event') {
        const eventPayload: any = {
          report_name: reportName,
          occurence: frequency,
          package_name: selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplateEvent, "event"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.event || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplateEvent,
          category: "event",
        };

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          eventPayload.start_date = startdate;
          eventPayload.end_date = enddate;
        }

        updateData = {
          "event": eventPayload
        };
      }

      const updatePayload = {
        doc_id: editId,
        package_name: selectedPackage,
        update_data: updateData
      };

      console.log("Edit payload:", updatePayload);

      if (
        editReportApi &&
        typeof (editReportApi as any).mutate === "function"
      ) {
        (editReportApi as any).mutate(updatePayload);
      } else {
        console.error("Edit API mutate function not available");
      }
    } else {
      // For create mode, create separate payloads for click, conversion, and event categories
      const finalPayload: any = {};

      if (category === 'click') {
        const clickPayload: any = {
          report_name: reportName,
          occurance: frequency,
          package_name:selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplate, "click"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.click || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplate,
          category: ["click"],
        };

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          clickPayload.start_date = startdate;
          clickPayload.end_date = enddate;
        }

        finalPayload.click = clickPayload;
      }

      if (category === 'conversion') {
        const conversionPayload: any = {
          report_name: reportName,
          occurance: frequency,
          package_name: selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplateEvent, "conversion"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.conversion || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplateEvent,
          category: ["conversion"],
        };

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          conversionPayload.start_date = startdate;
          conversionPayload.end_date = enddate;
        }

        finalPayload.conversion = conversionPayload;
      }

      if (category === 'event') {
        const eventPayload: any = {
          report_name: reportName,
          occurance: frequency,
          package_name: selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplateEvent, "event"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.event || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplateEvent,
          category: ["event"],
        };

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          eventPayload.start_date = startdate;
          eventPayload.end_date = enddate;
        }

        finalPayload.event = eventPayload;
      }

      // If none of the new categories are selected, fall back to original structure
      if (category !== 'click' && category !== 'conversion' && category !== 'event') {
        const dimensionsForPayload = selectedDimensions.map((dimensionId) => {
          const existingFilter = dimensionsFilters.find(
            (filter) => filter.field === dimensionId
          );

          if (existingFilter) {
            return existingFilter;
          } else {
            return {
              field: dimensionId,
              value: [],
            };
          }
        });

        const basePayload: any = {
          report_name: reportName,
          occurance: frequency,
          package_name: selectedPackage,
          dimensions: dimensionsForPayload,
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplate,
          category: category,
        };

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          basePayload.start_date = startdate;
          basePayload.end_date = enddate;
        }
        
        console.log("check the payload (fallback)", basePayload);
      } else {
        console.log("check the final payload", finalPayload);
      }

      // If creating a new report, call create API only
      if (
        createReportApi &&
        typeof (createReportApi as any).mutate === "function"
      ) {
        (createReportApi as any).mutate(finalPayload);
      } else {
        console.error("Create API mutate function not available");
      }
    }

    setDeliveryModalOpen(false);
  };


  // Fixed handleConfirmation function
  const handleConfirmation = (action: "cloud" | "email" | "download") => {
    setConfirmationDialogOpen(false);
    if (action === "cloud" || action === "email") {
      setDeliveryModalType("download");
      setDeliveryModalOpen(true);
    } else {
      if (deliveryData) {
        // FIXED: Conditional API calling for download
        if (editId && mode === "edit") {
          // For edit mode, send only the specific category data wrapped in category key
          let updateData: any = {};

          if (category === 'install') {
            const installPayload: any = {
              report_name: reportName,
              occurence: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.install || deliveryData,
              download: "yes",
              template: selectedTemplate,
              category: "install",
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              installPayload.start_date = deliveryData?.dateRange?.startDate;
              installPayload.end_date = deliveryData?.dateRange?.endDate;
            }

            updateData = {
              "install": installPayload
            };
          } else if (category === 'event') {
            const eventPayload: any = {
              report_name: reportName,
              occurence: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.event || deliveryData,
              download: "yes",
              template: selectedTemplateEvent,
              category: "event",
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              eventPayload.start_date = deliveryData?.dateRange?.startDate;
              eventPayload.end_date = deliveryData?.dateRange?.endDate;
            }

            updateData = {
              "event": eventPayload
            };
          }

          const updatePayload = {
            doc_id: editId,
            package_name: selectedPackage,
            update_data: updateData
          };

          console.log("Edit confirmation payload:", updatePayload);

          if (
            editReportApi &&
            typeof (editReportApi as any).mutate === "function"
          ) {
            (editReportApi as any).mutate(updatePayload);
          } else {
            console.error("Edit API mutate function not available");
          }
        } else {
          // For create mode, create separate payloads for install and event categories
          const finalPayload: any = {};

          if (category === 'install') {
            const installPayload: any = {
              report_name: reportName,
              occurance: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.install || deliveryData,
              download: "yes",
              template: selectedTemplate,
              category: ["install"],
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              installPayload.start_date = deliveryData?.dateRange?.startDate;
              installPayload.end_date = deliveryData?.dateRange?.endDate;
            }

            finalPayload.install = installPayload;
          }

          if (category === 'event') {
            const eventPayload: any = {
              report_name: reportName,
              occurance: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.event || deliveryData,
              download: "yes",
              template: selectedTemplateEvent,
              category: ["event"],
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              eventPayload.start_date = deliveryData?.dateRange?.startDate;
              eventPayload.end_date = deliveryData?.dateRange?.endDate;
            }

            finalPayload.event = eventPayload;
          }

          console.log("check the confirmation payload", finalPayload);

          // If creating new, call create API
          if (
            createReportApi &&
            typeof (createReportApi as any).mutate === "function"
          ) {
            (createReportApi as any).mutate(finalPayload);
          } else {
            console.error("Create API mutate function not available");
          }
        }
      }
    }
  };

  console.log("frequency value in generate page", frequency)

  const handleScheduleClick = () => {
    if (!reportName.trim()) {
      setReportNameError("Report name is mandatory.");
      return;
    }

    if (!category) {
      setCategoryError("Please select a category");
      return;
    }

    if (selectedTemplate === "Custom") {
      let hasError = false;
      if (selectedDimensions.length === 0) {
        setDimensionsError("Please select at least one dimension");
        hasError = true;
      }
      if (hasError) return;
    }

    setDeliveryModalType("schedule");
    setDeliveryModalOpen(true);
  };


  const handleCloseDeliveryModal = () => {
    setDeliveryModalOpen(false);
    setDeliveryData(null);
  };

  const handleCategoryToggle = (categoryValue: string) => {
    if (mode === "view") return;
    
    setCategory(categoryValue);
    // Clear error if a category is selected
    if (categoryValue) {
      setCategoryError(null);
    }
  };

  return (
    <>
      {(createReportLoading || viewReportLoading || editReportLoading) ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      ) : (
        <div className="bg-white p-6">
          {toastData && (
            <ToastContent
              type={toastData.type}
              title={toastData.title}
              description={toastData.description}
              variant={toastData.variant}
            />
          )}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold">
              {mode === "view"
                ? "View Report"
                : mode === "edit"
                  ? "Edit Report"
                  : "Generate New Report"}
            </h1>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4 items-center">
              {/* Report Name */}
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input
                  placeholder="Enter Report Name "
                  className="dark:text-white"
                  value={reportName}
                  onChange={(e) => {
                    setReportName(e.target.value);
                    setReportNameError(null); // Clear error on change
                  }}
                  disabled={mode === "view" || mode === "edit"}
                />
                {reportNameError && ( // Display error message
                  <p className="text-sm text-red-500">{reportNameError}</p>
                )}
              </div>

              {/* Category Dropdown */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value);
                    setCategoryError(null); // Clear error on change
                  }}
                  disabled={mode === "view" || mode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryLoading ? (
                      <div className="flex justify-center items-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : categoryData.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No categories available
                      </div>
                    ) : (
                      categoryData.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {categoryError && (
                  <p className="text-sm text-red-500">{categoryError}</p>
                )}
              </div>
              

              {/* File Type */}
              <div className="space-y-2">
                <Label>File Type</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="csv"
                      name="fileType"
                      value="csv"
                      checked={fileType === "csv"}
                      onChange={(e) => setFileType(e.target.value)}
                      className="h-4 w-4 border-gray-300 accent-primary focus:ring-primary"
                      disabled={mode === "view" || mode === "edit"}
                    />
                    <Label htmlFor="Csv">Csv</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="xlsx"
                      name="fileType"
                      value="xlsx"
                      checked={fileType === "xlsx"}
                      onChange={(e) => setFileType(e.target.value)}
                      className="h-4 w-4 border-gray-300 accent-primary focus:ring-primary"
                      disabled={mode === "view" || mode === "edit"}
                    />
                    <Label htmlFor="Xlsx">Xlsx</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="parquet"
                      name="fileType"
                      value="parquet"
                      checked={fileType === "parquet"}
                      onChange={(e) => setFileType(e.target.value)}
                      className="h-4 w-4 border-gray-300 accent-primary focus:ring-primary"
                      disabled={mode === "view" || mode === "edit"}
                    />
                    <Label htmlFor="Parquet">Parquet</Label>
                  </div>
                </div>
              </div>

              {/* Report Category */}
              <div className="space-y-2">
                <Label>Report Category</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="summary"
                      name="reportCategory"
                      value="summary"
                      checked={reportCategory === "summary"}
                      onChange={(e) =>
                        setReportCategory(e.target.value as "summary")
                      }
                      className="h-4 w-4 border-gray-300 accent-primary focus:ring-primary"
                      disabled={mode === "view" || mode === "edit"}
                    />
                    <Label htmlFor="summary">Summary</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="transactional"
                      name="reportCategory"
                      checked={reportCategory === "transactional"}
                      value="transactional"
                      onChange={(e) =>
                        setReportCategory(e.target.value as "transactional")
                      }
                      className="h-4 w-4 border-gray-300 accent-primary focus:ring-primary"
                      disabled={mode === "view" || mode === "edit"}
                    />
                    <Label htmlFor="transactional">Transactional</Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-x-4 w-full">
              
              {/* Dynamic Category Section - Render based on selected category */}
              {category ? (() => {
                // Get category display name
                const categoryItem = categoryData.find(item => item.value === category);
                const categoryDisplayName = categoryItem ? categoryItem.label : category;
                
                // Get template value for this category
                const getTemplateValue = (cat: string) => {
                  if (cat === 'click') return templateValue;
                  if (cat === 'conversion') return templateValueConversion;
                  if (cat === 'event') return templateValueEvent;
                  return []; // Default for other categories
                };
                
                // Get template loading state for this category
                const getTemplateLoading = (cat: string) => {
                  return templateLoading; // Single loading state for all categories
                };
                
                // Get selected template for this category
                const getSelectedTemplate = (cat: string) => {
                  if (cat === 'click') return selectedTemplate;
                  if (cat === 'conversion') return selectedTemplateConversion;
                  if (cat === 'event') return selectedTemplateEvent;
                  return "";
                };
                
                // Get template change handler for this category
                const getTemplateChangeHandler = (cat: string) => {
                  if (cat === 'click') return handleTemplateChange;
                  if (cat === 'conversion') return handleTemplateChangeConversion;
                  if (cat === 'event') return handleTemplateChangeEvent;
                  return () => {};
                };
                
                // Get dimensions for this category
                const getDimensions = (cat: string) => {
                  if (cat === 'click') return dimensions;
                  if (cat === 'conversion') return conversionDimensions;
                  if (cat === 'event') return eventDimensions;
                  return [];
                };
                
                // Get selected dimensions for this category
                const getSelectedDimensions = (cat: string) => {
                  if (cat === 'click') return selectedDimensions;
                  if (cat === 'conversion') return selectedConversionDimensions;
                  if (cat === 'event') return selectedEventDimensions;
                  return [];
                };
                
                // Get dimension select handler for this category
                const getDimensionSelectHandler = (cat: string) => {
                  if (cat === 'click') return handleDimensionSelect;
                  if (cat === 'conversion') return handleConversionDimensionSelect;
                  if (cat === 'event') return handleEventDimensionSelect;
                  return () => {};
                };
                
                // Get template fields loading for this category
                const getTemplateFieldsLoading = (cat: string) => {
                  return templateFieldsLoading; // Single loading state for all categories
                };
                
                // Get popover state for this category
                const getPopoverOpen = (cat: string) => {
                  if (cat === 'click') return openDimensionPopover;
                  if (cat === 'conversion') return openConversionDimensionPopover;
                  if (cat === 'event') return openEventDimensionPopover;
                  return false;
                };
                
                const setPopoverOpen = (cat: string, value: boolean) => {
                  if (cat === 'click') setOpenDimensionPopover(value);
                  if (cat === 'conversion') setOpenConversionDimensionPopover(value);
                  if (cat === 'event') setOpenEventDimensionPopover(value);
                };
                
                return (
                  <div key={category} className="border border-gray-300 rounded-md p-4 w-1/2">
                    <div className="space-y-4 col-span-3">
                      {/* Category Template */}
                      <div className="space-y-2">
                        <Label>{categoryDisplayName} Template</Label>
                        <Select
                          value={getSelectedTemplate(category)}
                          onValueChange={getTemplateChangeHandler(category)}
                          disabled={mode === "view"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Choose ${categoryDisplayName} Template`} />
                          </SelectTrigger>

                          <SelectContent>
                            {getTemplateLoading(category) ? (
                              <div className="flex justify-center items-center p-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                            ) : (
                              <>
                                {getTemplateValue(category)?.map((template) => (
                                  <SelectItem key={template} value={template} className="text-sm leading-5">
                                    {template}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category Dimensions */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{categoryDisplayName} Dimensions</h3>
                      </div>
                      {getSelectedTemplate(category) === "Custom" && (
                        <Popover
                          open={getPopoverOpen(category)}
                          onOpenChange={(open) => setPopoverOpen(category, open)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                              disabled={mode === "view"}
                            >
                              Select {categoryDisplayName} Dimensions
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="ml-2 h-4 w-4 shrink-0 opacity-50"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <div className="p-2">
                              <Input
                                type="text"
                                placeholder="Search dimensions..."
                                className="mb-2"
                                value={dimensionSearch}
                                onChange={(e) => setDimensionSearch(e.target.value)}
                              />
                              <div className="max-h-[300px] overflow-y-auto">
                                {getDimensions(category)
                                  .map((group) => ({
                                    ...group,
                                    items: group.items.filter((item) =>
                                      item.label
                                        .toLowerCase()
                                        .includes(dimensionSearch.toLowerCase())
                                    ),
                                  }))
                                  .filter((group) => group.items.length > 0)
                                  .map((group) => (
                                    <div key={group.label} className="mb-4">
                                      <div className="mb-2 px-2 text-sm font-medium text-gray-700">
                                        {group.label}
                                      </div>
                                      {group.items.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5"
                                        >
                                          <div className="flex items-center gap-2">
                                            {getSelectedTemplate(category) === "Custom" ? (
                                              <>
                                                <Checkbox
                                                  id={`${category}-dimension-${item.id}`}
                                                  checked={getSelectedDimensions(category).includes(item.id)}
                                                  onCheckedChange={() =>
                                                    getDimensionSelectHandler(category)(item.id)
                                                  }
                                                />
                                                <Label
                                                  htmlFor={`${category}-dimension-${item.id}`}
                                                  className="cursor-pointer"
                                                  onClick={() =>
                                                    getDimensionSelectHandler(category)(item.id)
                                                  }
                                                >
                                                  {item.label}
                                                </Label>
                                              </>
                                            ) : (
                                              <Label>{item.label}</Label>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      {dimensionsError && (
                        <p className="text-sm text-red-500">{dimensionsError}</p>
                      )}

                      {/* Display selected dimensions */}
                      {getSelectedTemplate(category) === "Custom" &&
                        getSelectedDimensions(category).length === 0 ? (
                        <div className="mt-2 flex h-20 items-center justify-center rounded-md border border-dashed border-gray-300">
                          <p className="text-sm text-gray-500">
                            Select dimensions to view them here
                          </p>
                        </div>
                      ) : (
                        <>
                          {getTemplateFieldsLoading(category) ? (
                            <p className="text-xs text-gray-500">
                              Loading {categoryDisplayName} Dimensions...
                            </p>
                          ) : (
                            <div className="mt-2 max-h-[200px] overflow-y-auto rounded-md border border-gray-300 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                              {getDimensions(category).map((group) => {
                                const groupItems =
                                  getSelectedTemplate(category) === "Custom"
                                    ? group.items.filter((item) =>
                                      getSelectedDimensions(category).includes(item.id)
                                    )
                                    : group.items;

                                if (groupItems.length === 0) return null;

                                return (
                                  <div key={group.label} className="space-y-1 p-2">
                                    <div className="">
                                      {group.label}
                                    </div>

                                    {/* Display dimensions in a grid layout - side by side */}
                                    <div className="grid grid-cols-2 gap-2">
                                      {groupItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            {getSelectedTemplate(category) === "Custom" ? (
                                              <>
                                                <Checkbox
                                                  id={item.id}
                                                  checked={true}
                                                  onClick={() =>
                                                    getDimensionSelectHandler(category)(item.id)
                                                  }
                                                />
                                                <Label htmlFor={item.id} className="text-sm">
                                                  {item.label}
                                                </Label>
                                              </>
                                            ) : (
                                              <>
                                                <Label htmlFor={item.id} className="text-sm">
                                                  {item.label}
                                                </Label>
                                                {shouldShowFilter(item.id) && (
                                                <Filter
                                                  className="h-4 w-4 cursor-pointer text-primary ml-auto"
                                                  onClick={() =>
                                                    handleFilterClick(item, category)
                                                  }
                                                />
                                                )}
                                              </>
                                            )}
                                          </div>

                                          {getSelectedTemplate(category) === "Custom" && shouldShowFilter(item.id) && (
                                            <Filter
                                              className="h-4 w-4 cursor-pointer text-primary ml-2"
                                              onClick={() => handleFilterClick(item, category)}
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })() : null}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              onClick={() => {
                router.push("/re-engagement/reportingtool/report");
              }}
              className="text-white bg-primary hover:bg-primary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleClick}
              className="text-white bg-primary hover:bg-primary"
              disabled={(mode === "view" || mode === "edit" || mode === "clone") && isDownloadReport === true}
            >
              Schedule
            </Button>
            <Button
              onClick={handleDownloadClick}
              className="text-white bg-primary hover:bg-primary"
              disabled={(mode === "view" || mode === "edit" || mode === "clone") &&  isDownloadReport === false}
            >
              Download
            </Button>
          </div>

          <ConfirmationDialog
            isOpen={confirmationDialogOpen}
            onClose={() => setConfirmationDialogOpen(false)}
            onConfirm={handleConfirmation}
          />

          <FilterModal
            isOpen={filterModalOpen}
            onClose={() => {
              setFilterModalOpen(false);
              setSelectedItemForFilter(null);
              setFilterSearch("");
              apiCallInProgressRef.current = false; // Reset API call flag
            }}
            selectedItem={selectedItemForFilter}
            onSave={handleFilterSave}
            filterData={filterData}
            filterloading={filterLoading}
            savedFilters={dimensionsFilters}
            mode={mode}
            onSearchChange={setFilterSearch}
            searchValue={filterSearch}
          />

          <DeliveryOptionsModal
            category={category}
            isOpen={deliveryModalOpen}
            onClose={handleCloseDeliveryModal}
            type={deliveryModalType}
            onSubmit={handleModalSubmit}
            defaultData={deliveryData}
            mode={mode}
            frequency={frequency}
            onFrequencyChange={(value) => {
              console.log("Frequency changed in modal:", value);
              setFrequency(value);
            }}
            urlKey="reengagement"
          />
        </div>
      )}
    </>
  );
};

export default GenerateReportPage;