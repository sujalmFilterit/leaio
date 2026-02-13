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

  // Helper function to ensure category is always an array
  const ensureArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'string') return [value];
    if (value) return [value];
    return [];
  };

  const shouldShowFilter = (dimensionId: string): boolean => {
    // Array of terms that should NOT show filter icons
    const filterExcludedTerms = ['date', 'time'];
    
    // Check if any excluded term exists in the dimension ID
    return !filterExcludedTerms.some(term => 
      dimensionId.toLowerCase().includes(term)
    );
  };

  const [toastData, setToastData] = useState<{
    type: ToastType;
    title: string;
    description?: string;
    variant?: "default" | "destructive" | null;
  } | null>(null);
  const { selectedPackage } = usePackage();
  const [frequency, setFrequency] = useState<any>(null);
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
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedItemForThreshold, setSelectedItemForThreshold] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [templateValue, setTemplateValue] = useState<string[]>([]);
  const [templateValueEvent, setTemplateValueEvent] = useState<string[]>([]);
  const [selectedItemForFilter, setSelectedItemForFilter] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [dimensionSearch, setDimensionSearch] = useState("");
  const [metricSearch, setMetricSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedTemplateEvent, setSelectedTemplateEvent] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const mode = searchParams.get("mode");
  const frequencyValue = searchParams.get("frequency");
  const [reportName, setReportName] = useState("");
  const [reportCategory, setReportCategory] = useState<string>("summary");
  const [category, setCategory] = useState<string[]>([]);

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryModalType, setDeliveryModalType] = useState<
    "schedule" | "download"
  >("schedule");
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [dimensions, setDimensions] = useState<GroupedOption[]>([]);
  const [eventDimensions, setEventDimensions] = useState<GroupedOption[]>([]);
  const [openDimensionPopover, setOpenDimensionPopover] = useState(false);
  const [openEventDimensionPopover, setOpenEventDimensionPopover] = useState(false);
  const [filterData, setFilterData] = useState<any>();
  const [deliveryData, setDeliveryData] = useState<any | null>(undefined);
  const [statusCheck, setStatusCheck] = useState("no");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isDownloadReport, setIsDownloadReport] = useState<boolean | null>(null);
  const apiCallInProgressRef = useRef<boolean>(false); // Prevent duplicate API calls
  const [dimensionsFilters, setDimensionsFilters] = useState<
    Array<{
      field: string;
      value: string[];
    }>
  >([]);

  const [reportNameError, setReportNameError] = useState<string | null>(null);
  const [dimensionsError, setDimensionsError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [metricsThresholds, setMetricsThresholds] = useState<
    Array<{ field: string; operator: string; value: string }>
  >([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const { toast } = useToast();
  const { startDate, endDate } = useDateRange();
  const [filterSearch, setFilterSearch] = useState("");
  const [debouncedFilterSearch, setDebouncedFilterSearch] = useState("");
  // api call  category 
  const { result: categoryApi, loading: categoryLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/get_category`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/get_category`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      // package_name: "com.myairtelapp"
    },
    onSuccess: (data) => {
      console.log("Category API Response:", data);
      setCategoryData(data);
    },
    onError: (error) => {
      console.error("Error fetching category:", error);
    },
  });

  useEffect(() => {
    if (selectedPackage) {
      categoryApi.mutate();
    }
  }, [selectedPackage,startDate,endDate]);

  // api  call template

  const { result: templateApi, loading: templateLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/get_template`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/get_template`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      // package_name: "com.myairtelapp",
      category: 'click'
    },
    onSuccess: (data) => {
      setTemplateValue(data);
    },
    onError: (error) => {
      console.error("Error fetching template:", error);
    },
  });
const { result: templateApiEvent, loading: templateLoadingEvent } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/get_template`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/get_template`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      // package_name: "com.myairtelapp",
      category: 'impression'
    },
    onSuccess: (data) => {
      console.log("Template data:", data);
      setTemplateValueEvent(data);

    },
    onError: (error) => {
      console.error("Error fetching template:", error);
    },
  });

  useEffect(() => {
    console.log(category,"cat")
    if (category.length > 0 && category.includes('click')) {
      templateApi.mutate();
    }
  }, [category,selectedPackage]);
  
useEffect(() => {
    if (category.length > 0 && category.includes('impression')) {
      templateApiEvent.mutate();
    }
  }, [category,selectedPackage]);

  // Set default click template when templateValue changes
  useEffect(() => {
    if (templateValue && templateValue.length > 0 && !editId && !selectedTemplate && category.includes('click')) {
      setSelectedTemplate(templateValue[0]);
    }
  }, [templateValue, editId, selectedTemplate, category,selectedPackage]);

  // Set default impression template when templateValueEvent changes
  useEffect(() => {
    if (templateValueEvent && templateValueEvent.length > 0 && !editId && !selectedTemplateEvent && category.includes('impression')) {
      setSelectedTemplateEvent(templateValueEvent[0]);
    }
  }, [templateValueEvent, editId, selectedTemplateEvent, category,selectedPackage]);
  

  // api call for click template fields
  const { result: clickTemplateFieldsMutation, loading: clickTemplateFieldsLoading } =
    useApiCall({
    //   url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/get_template_fields`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/get_template_fields`,
      method: "POST",
      params: {
        template: selectedTemplate,
        category: "click",
        package_name: selectedPackage,
        // package_name: "com.myairtelapp",
        report_type: reportCategory
      },
      onSuccess: (data: { dimensions?: any[] }) => {
        setDimensions(data?.dimensions || []);
      },
      onError: (error) => {
        console.error("Error fetching click template fields:", error);
      },
    });

  // api call for impression template fields
  const { result: impressionTemplateFieldsMutation, loading: impressionTemplateFieldsLoading } =
    useApiCall({
    //   url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/get_template_fields`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/get_template_fields`,
      method: "POST",
      params: {
        template: selectedTemplateEvent,
        category: "impression",
        package_name: selectedPackage,
        // package_name: "com.myairtelapp",
        report_type: reportCategory
      },
      onSuccess: (data: { dimensions?: any[] }) => {
        setEventDimensions(data?.dimensions || []);
      },
      onError: (error) => {
        console.error("Error fetching impression template fields:", error);
      },
    });

  // Add useEffect to handle click template fields API call
  useEffect(() => {
    if (mode === "view") return;
    
    if (selectedTemplate && category.includes('click') && selectedPackage && reportCategory) {
      if (
        clickTemplateFieldsMutation &&
        typeof (clickTemplateFieldsMutation as any).mutate === "function"
      ) {
        (clickTemplateFieldsMutation as any).mutate();
      }
    }
  }, [selectedTemplate, category, selectedPackage, reportCategory, mode]);

  // Add useEffect to handle impression template fields API call
  useEffect(() => {
    if (mode === "view") return;
    
    if (selectedTemplateEvent && category.includes('impression') && selectedPackage && reportCategory) {
      if (
        impressionTemplateFieldsMutation &&
        typeof (impressionTemplateFieldsMutation as any).mutate === "function"
      ) {
        (impressionTemplateFieldsMutation as any).mutate();
      }
    }
  }, [selectedTemplateEvent, category, selectedPackage, reportCategory, mode]);

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
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/fields/filters/${selectedItemForFilter?.id}/`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/fields/filters/${selectedItemForFilter?.id}/`,
    method: "POST",
    params: {
      package_name: selectedPackage,
      // package_name: "com.myairtelapp",
      category: filterCategory || ensureArray(category).join(","),
      report_type:reportCategory,
      // search: debouncedSearchTerm
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
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/create_report`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/create_report`,
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
        router.push("/integrity/reportingtool/report");
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
    url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/view_report`,
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
  }, [editId,mode]);

  // Replace the useEffect that sets the form data with this:
  useEffect(() => {
    if ((viewReportApi as any)?.data?.data) {
      const responseData = (viewReportApi as any).data.data;
      
      // Extract categories and data from the response
      const categories: string[] = [];
      let clickData = null;
      let impressionData = null;
      
      if (responseData.click) {
        // Use the actual category value from the response
        const clickCategory = ensureArray(responseData.click.category);
        categories.push(...clickCategory);
        clickData = responseData.click;
      }
      
      if (responseData.impression) {
        // Use the actual category value from the response
        const impressionCategory = ensureArray(responseData.impression.category);
        categories.push(...impressionCategory);
        impressionData = responseData.impression;
      }
      
      // Remove duplicates from categories
      const uniqueCategories = categories.filter((item, index) => categories.indexOf(item) === index);
      
      // Use click data as primary, fall back to impression data for common fields
      const primaryData = clickData || impressionData;
      
      if (primaryData) {
        setReportName(primaryData.report_name);
        setReportCategory(primaryData.report_type);
        setFrequency(primaryData.occurence);
        setFileType(primaryData.reportFormats);
        
        // Set download status based on the response
        const downloadStatus = primaryData.download === "yes";
        setIsDownloadReport(downloadStatus);
        
        // Only set category if categoryData is loaded
        if (categoryData && categoryData.length > 0) {
          console.log("Setting category with available categoryData:", uniqueCategories);
          setCategory(uniqueCategories);
        } else {
          console.log("CategoryData not yet loaded, deferring category setting");
          // We'll set it in a separate effect when categoryData loads
        }
        
        // Set click-specific data
        if (clickData) {
          setSelectedTemplate(clickData.template);
          
          // Set click dimensions filters
          if (clickData.dimensions && clickData.dimensions.length > 0) {
            setDimensionsFilters(clickData.dimensions);

            // Extract dimension fields for selection
            const dimensionFields = clickData.dimensions.map((dim: { field: string }) => dim.field);
            setSelectedDimensions(dimensionFields);

            const transformed = clickData.dimensions.map((dimension: { field: string }) => ({
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
        
        // Set impression-specific data
        if (impressionData) {
          setSelectedTemplateEvent(impressionData.template);
          
          // Set impression dimensions if click doesn't exist or if we need separate impression dimensions
          if (impressionData.dimensions && impressionData.dimensions.length > 0) {
            // If we only have impression data, use it for main dimensions
            if (!clickData) {
              setDimensionsFilters(impressionData.dimensions);
              const dimensionFields = impressionData.dimensions.map((dim: { field: string }) => dim.field);
              setSelectedDimensions(dimensionFields);
            } else {
              // If we have both, set impression dimensions separately
              const impressionDimensionFields = impressionData.dimensions.map((dim: { field: string }) => dim.field);
              setSelectedEventDimensions(impressionDimensionFields);
            }

            const impressionTransformed = impressionData.dimensions.map((dimension: { field: string }) => ({
              label: "",
              items: [
                {
                  id: dimension.field,
                  label: dimension.field,
                },
              ],
            }));

            setEventDimensions(impressionTransformed);
          }
        }
        
        // Transform delivery options to match DeliveryOptionsModal expectations
        let transformedDeliveryData = null;
        
        if (clickData?.deliveryOptions) {
          transformedDeliveryData = { ...clickData.deliveryOptions };
          
          // Transform email data structure for click
          if (clickData.deliveryOptions.email) {
            const emailData = clickData.deliveryOptions.email;
            transformedDeliveryData.email = {
              ...emailData,
              status: emailData.status, // Ensure status is set for the modal
              click_to: emailData.to || [],
              click_mail_id_list: emailData.mail_id_list || [],
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
        
        if (impressionData?.deliveryOptions) {
          if (!transformedDeliveryData) {
            transformedDeliveryData = { ...impressionData.deliveryOptions };
          }
          
          // Transform email data structure for impression
          if (impressionData.deliveryOptions.email) {
            const emailData = impressionData.deliveryOptions.email;
            if (!transformedDeliveryData.email) {
              transformedDeliveryData.email = {};
            }
            
            transformedDeliveryData.email = {
              ...transformedDeliveryData.email,
              ...emailData,
              status: emailData.status, // Ensure status is set for the modal
              impression_to: emailData.to || [],
              impression_mail_id_list: emailData.mail_id_list || [],
              // Also keep original structure
              to: emailData.to || [],
              mail_id_list: emailData.mail_id_list || []
            };
            
            // Set customEmails if no click emails
            if (!clickData?.deliveryOptions?.email?.to && emailData.to && emailData.to.length > 0) {
              setCustomEmails(emailData.to);
            }
          }
        }
        
        // If we have both click and impression, create a nested structure
        if (clickData && impressionData) {
          const nestedDeliveryOptions = {
            click: transformedDeliveryData,
            impression: impressionData.deliveryOptions
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

  // Handle click outside to close category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isCategoryDropdownOpen && !target.closest(".relative")) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryDropdownOpen]);

  // Handle category setting when both viewReportApi data and categoryData are available
  useEffect(() => {
    if ((viewReportApi as any)?.data?.data && categoryData && categoryData.length > 0) {
      const responseData = (viewReportApi as any).data.data;
      const categories: string[] = [];
      
      if (responseData.click) {
        const clickCategory = ensureArray(responseData.click.category);
        categories.push(...clickCategory);
      }
      
      if (responseData.impression) {
        const impressionCategory = ensureArray(responseData.impression.category);
        categories.push(...impressionCategory);
      }
      
      const uniqueCategories = categories.filter((item, index) => categories.indexOf(item) === index);
      
      console.log("=== CATEGORY SETTING DEBUG ===");
      console.log("Extracted categories from response:", uniqueCategories);
      console.log("Available categoryData options:", categoryData);
      console.log("CategoryData values:", categoryData.map(item => item.value));
      
      // Check if the extracted categories match any available options
      const validCategories = uniqueCategories.filter(cat => 
        categoryData.some(option => option.value === cat)
      );
      
      console.log("Valid matching categories:", validCategories);
      console.log("Setting category to:", validCategories.length > 0 ? validCategories : uniqueCategories);
      
      setCategory(validCategories.length > 0 ? validCategories : uniqueCategories);
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
  const handleDownloadClick = () => {
    if (!reportName.trim()) {
      setReportNameError("Report name is mandatory.");
      return;
    }

    if (category.length === 0) {
      setCategoryError("Please select at least one category");
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
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/edit_report`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/edit_report`,
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

      router.push("/integrity/reportingtool/report");
    },
    onError: (error) => {
      console.error("Error editing report:", error);
    },
  });
  const [StartDate, setStartDate] = useState<string>("");
  const [EndDate, setEndDate] = useState<string>("");

  // Fixed handleModalSubmit function
  const handleModalSubmit = (data: any, startdate: string, enddate: string) => {
    setDeliveryData(data);
    setStartDate(startdate);
    setEndDate(enddate);
 
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

      if (category.includes('click')) {
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

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          clickPayload.start_date = startdate;
          clickPayload.end_date = enddate;
        }

        updateData = {
          "click": clickPayload
        };
      } else if (category.includes('impression')) {
        const impressionPayload: any = {
          report_name: reportName,
          occurence: frequency,
          package_name: selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplateEvent, "impression"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.impression || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplateEvent,
          category: "impression",
        };

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          impressionPayload.start_date = startdate;
          impressionPayload.end_date = enddate;
        }

        updateData = {
          "impression": impressionPayload
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
        editReportApi.mutate(updatePayload);
      } else {
        console.error("Edit API mutate function not available");
      }
    } else {
      // For create mode, create separate payloads for click and impression categories
      const finalPayload: any = {};

      if (category.includes('click')) {
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

      if (category.includes('impression')) {
        const impressionPayload: any = {
          report_name: reportName,
          occurance: frequency,
          package_name: selectedPackage,
          dimensions: createDimensionsPayload(selectedTemplateEvent, "impression"),
          reportFormats: fileType,
          report_type: reportCategory,
          deliveryOptions: data?.impression || data,
          download: deliveryModalType === "download" ? "yes" : "no",
          template: selectedTemplateEvent,
          category: ["impression"],
        };

        // Add start_date and end_date only if frequency is "Custom Range"
        if (frequency === "Custom Range") {
          impressionPayload.start_date = startdate;
          impressionPayload.end_date = enddate;
        }

        finalPayload.impression = impressionPayload;
      }

      // If both categories are not selected, fall back to original structure
      if (!category.includes('click') && !category.includes('impression')) {
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
        createReportApi.mutate(finalPayload);
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

          if (category.includes('click')) {
            const clickPayload: any = {
              report_name: reportName,
              occurence: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.click || deliveryData,
              download: "yes",
              template: selectedTemplate,
              category: "click",
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              clickPayload.start_date = StartDate;
              clickPayload.end_date = EndDate;
            }

            updateData = {
              "click": clickPayload
            };
          } else if (category.includes('impression')) {
            const impressionPayload: any = {
              report_name: reportName,
              occurence: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.impression || deliveryData,
              download: "yes",
              template: selectedTemplateEvent,
              category: "impression",
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              impressionPayload.start_date = StartDate;
              impressionPayload.end_date = EndDate;
            }

            updateData = {
              "impression": impressionPayload
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
            editReportApi.mutate(updatePayload);
          } else {
            console.error("Edit API mutate function not available");
          }
        } else {
          // For create mode, create separate payloads for click and impression categories
          const finalPayload: any = {};

          if (category.includes('click')) {
            const clickPayload: any = {
              report_name: reportName,
              occurance: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.click || deliveryData,
              download: "yes",
              template: selectedTemplate,
              category: ["click"],
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              clickPayload.start_date = StartDate;
              clickPayload.end_date = EndDate;
            }

            finalPayload.click = clickPayload;
          }

          if (category.includes('impression')) {
            const impressionPayload: any = {
              report_name: reportName,
              occurance: frequency,
              package_name: selectedPackage,
              dimensions: dimensionsFilters,
              reportFormats: fileType,
              report_type: reportCategory,
              deliveryOptions: deliveryData?.impression || deliveryData,
              download: "yes",
              template: selectedTemplateEvent,
              category: ["impression"],
            };

            // Add start_date and end_date only if frequency is "Custom Range"
            if (frequency === "Custom Range") {
              impressionPayload.start_date = StartDate;
              impressionPayload.end_date = EndDate;
            }

            finalPayload.impression = impressionPayload;
          }

          console.log("check the confirmation payload", finalPayload);

          // If creating new, call create API
          if (
            createReportApi &&
            typeof (createReportApi as any).mutate === "function"
          ) {
            createReportApi.mutate(finalPayload);
          } else {
            console.error("Create API mutate function not available");
          }
        }
      }
    }
  };

  const handleScheduleClick = () => {
    if (!reportName.trim()) {
      setReportNameError("Report name is mandatory.");
      return;
    }

    if (category.length === 0) {
      setCategoryError("Please select at least one category");
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
    
    setCategory((prev) => {
      const currentSelected = prev || [];
      const isCurrentlySelected = currentSelected.includes(categoryValue);
      
      let newSelection;
      if (isCurrentlySelected) {
        newSelection = currentSelected.filter((cat) => cat !== categoryValue);
      } else {
        newSelection = [...currentSelected, categoryValue];
      }
      
      // Clear error if at least one category is selected
      if (newSelection.length > 0) {
        setCategoryError(null);
      }
      
      return newSelection;
    });
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
                  placeholder="Enter Report Name"
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
                
                {/* Custom dropdown for selecting categories */}
                <div className="relative">
                  <div 
                    className={`flex h-10 w-full dark:text-white rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${mode === "view" ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => mode !== "view" && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  >
                    <span className="flex-1 truncate ">
                      {category.length === 0 
                        ? "Select Category" 
                        : category.map(cat => {
                            const categoryItem = categoryData.find(item => item.value === cat);
                            return categoryItem ? categoryItem.label : cat;
                          }).join(", ")
                      }
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isCategoryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
                      {categoryLoading ? (
                        <div className="flex justify-center items-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : categoryData.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No categories available
                        </div>
                      ) : (
                        categoryData.map((item) => {
                          const isSelected = category.includes(item.value);
                          
                          return (
                            <div 
                              key={item.value}
                              className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                              onClick={() => handleCategoryToggle(item.value)}
                            >
                              <Checkbox 
                                id={`category-checkbox-${item.value} dark:text-white`}
                                checked={isSelected}
                                disabled={mode === "view" || mode === "edit"}
                              />
                              <Label 
                                htmlFor={`category-checkbox-${item.value}`}
                                className="cursor-pointer flex-1 dark:text-white"
                              >
                                {item.label}
                              </Label>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                
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
                      id="Csv"
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
              {/* <div className="space-y-2">
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
              </div> */}
            </div>

            <div className="flex gap-x-4 w-full">
              
              {/* Click Section - Show only when click category is selected */}
              {category.includes('click') && (
                <div className="w-1/2 border border-gray-300 rounded-md p-4">
                  <div className="space-y-4 col-span-3">
                    {/* Click Template */}
                    <div className="space-y-2">
                      <Label>Click Template</Label>
                      <Select
                        value={selectedTemplate}
                        onValueChange={handleTemplateChange}
                        disabled={mode === "view"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Click Template" />
                        </SelectTrigger>

                        <SelectContent>
                          {templateLoading ? (
                            <div className="flex justify-center items-center p-2">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : (
                            <>
                              {templateValue?.map((template) => (
                                <SelectItem key={template} value={template} className="text-sm leading-5">
                                  {template}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Click Dimensions */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Click Dimensions</h3>
                    </div>
                    {selectedTemplate === "Custom" && (
                      <Popover
                        open={openDimensionPopover}
                        onOpenChange={setOpenDimensionPopover}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            disabled={mode === "view"}
                          >
                            Select Click Dimensions
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
                              {dimensions
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
                                          {selectedTemplate === "Custom" ? (
                                            <>
                                              <Checkbox
                                                id={`dimension-${item.id}`}
                                                checked={(
                                                  selectedDimensions || []
                                                ).includes(item.id)}
                                                onCheckedChange={() =>
                                                  handleDimensionSelect(item.id)
                                                }
                                              />
                                              <Label
                                                htmlFor={`dimension-${item.id}`}
                                                className="cursor-pointer"
                                                onClick={() =>
                                                  handleDimensionSelect(item.id)
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
                    {selectedTemplate === "Custom" &&
                      (selectedDimensions || []).length === 0 ? (
                      <div className="mt-2 flex h-20 items-center justify-center rounded-md border border-dashed border-gray-300">
                        <p className="text-sm text-gray-500">
                          Select dimensions to view them here
                        </p>
                      </div>
                    ) : (
                      <>
                        {clickTemplateFieldsLoading ? (
                          <p className="text-xs text-gray-500">
                            Loading Click Dimensions...
                          </p>
                        ) : (
                          <div className="mt-2 max-h-[200px] overflow-y-auto rounded-md border border-gray-300 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {dimensions.map((group) => {
                              const groupItems =
                                selectedTemplate === "Custom"
                                  ? group.items.filter((item) =>
                                    (selectedDimensions || []).includes(item.id)
                                  )
                                  : group.items;

                              if (groupItems.length === 0) return null;

                              return (
                                <div key={group.label} className="space-y-1 p-2">
                                  <div className="">
                                    {group.label}
                                  </div>

                                  {groupItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between"
                                    >
                                      <div
                                        className={`flex items-center gap-2 ${selectedTemplate !== "Custom"
                                            ? "justify-between w-full"
                                            : ""
                                          }`}
                                      >
                                        {selectedTemplate === "Custom" ? (
                                          <>
                                            <Checkbox
                                              id={item.id}
                                              checked={true}
                                              onClick={() =>
                                                handleDimensionSelect(item.id)
                                              }
                                            />
                                            <Label htmlFor={item.id}>
                                              {item.label}
                                            </Label>
                                          </>
                                        ) : (
                                          <>
                                            <Label htmlFor={item.id}>
                                              {item.label}
                                            </Label>
                                            {shouldShowFilter(item.id) && (
                                            <Filter
                                              className="h-4 w-4 cursor-pointer text-primary"
                                              onClick={() =>
                                                handleFilterClick(item, "click")
                                              }
                                            />
                                            )}
                                          </>
                                        )}
                                      </div>

                                      {selectedTemplate === "Custom" && shouldShowFilter(item.id) && (
                                        <Filter
                                          className="h-4 w-4 cursor-pointer text-primary"
                                          onClick={() => handleFilterClick(item, "click")}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Impression Section - Show only when impression category is selected */}
              {category.includes('impression') && (
                <div className="w-1/2 border border-gray-300 rounded-md p-4">
                  <div className="space-y-4 col-span-3">
                    {/* Impression Template */}
                    <div className="space-y-2">
                      <Label>Impression Template</Label>
                      <Select
                        value={selectedTemplateEvent}
                        onValueChange={handleTemplateChangeEvent}
                        disabled={mode === "view"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Impression Template" />
                        </SelectTrigger>

                        <SelectContent>
                          {templateLoadingEvent ? (
                            <div className="flex justify-center items-center p-2">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : (
                            <>
                              {templateValueEvent?.map((template) => (
                                <SelectItem key={template} value={template} className="text-sm leading-5">
                                  {template}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Impression Dimensions */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Impression Dimensions</h3>
                    </div>
                    {selectedTemplateEvent === "Custom" && (
                      <Popover
                        open={openEventDimensionPopover}
                        onOpenChange={setOpenEventDimensionPopover}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            disabled={mode === "view"}
                          >
                            Select Impression Dimensions
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
                              {eventDimensions
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
                                          {selectedTemplateEvent === "Custom" ? (
                                            <>
                                              <Checkbox
                                                id={`event-dimension-${item.id}`}
                                                checked={(
                                                  selectedEventDimensions || []
                                                ).includes(item.id)}
                                                onCheckedChange={() =>
                                                  handleEventDimensionSelect(item.id)
                                                }
                                              />
                                              <Label
                                                htmlFor={`event-dimension-${item.id}`}
                                                className="cursor-pointer"
                                                onClick={() =>
                                                  handleEventDimensionSelect(item.id)
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
                    {selectedTemplateEvent === "Custom" &&
                      (selectedEventDimensions || []).length === 0 ? (
                      <div className="mt-2 flex h-20 items-center justify-center rounded-md border border-dashed border-gray-300">
                        <p className="text-sm text-gray-500">
                          Select dimensions to view them here
                        </p>
                      </div>
                    ) : (
                      <>
                        {impressionTemplateFieldsLoading ? (
                          <p className="text-xs text-gray-500">
                            Loading Impression Dimensions...
                          </p>
                        ) : (
                          <div className="mt-2 max-h-[200px] overflow-y-auto rounded-md border border-gray-300 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {eventDimensions.map((group) => {
                              const groupItems =
                                selectedTemplateEvent === "Custom"
                                  ? group.items.filter((item) =>
                                    (selectedEventDimensions || []).includes(item.id)
                                  )
                                  : group.items;

                              if (groupItems.length === 0) return null;

                              return (
                                <div key={group.label} className="space-y-2 p-2">
                                  <div className="sticky top-0 bg-white text-sm font-medium text-gray-700 border-b border-gray-300 pb-1">
                                    {group.label}
                                  </div>

                                  {groupItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between"
                                    >
                                      <div
                                        className={`flex items-center gap-2 ${selectedTemplateEvent !== "Custom"
                                            ? "justify-between w-full"
                                            : ""
                                          }`}
                                      >
                                        {selectedTemplateEvent === "Custom" ? (
                                          <>
                                            <Checkbox
                                              id={item.id}
                                              checked={true}
                                              onClick={() =>
                                                handleEventDimensionSelect(item.id)
                                              }
                                            />
                                            <Label htmlFor={item.id}>
                                              {item.label}
                                            </Label>
                                          </>
                                        ) : (
                                          <>
                                            <Label htmlFor={item.id}>
                                              {item.label}
                                            </Label>
                                            {shouldShowFilter(item.id) && (
                                            <Filter
                                              className="h-4 w-4 cursor-pointer text-primary"
                                              onClick={() =>
                                                handleFilterClick(item, "impression")
                                              }
                                            />
                                            )}
                                          </>
                                        )}
                                      </div>

                                      {selectedTemplateEvent === "Custom" && shouldShowFilter(item.id) && (
                                        <Filter
                                          className="h-4 w-4 cursor-pointer text-primary"
                                          onClick={() => handleFilterClick(item, "impression")}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              onClick={() => {
                router.push("/integrity/reportingtool/report");
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
            category={Array.isArray(category) ? category.join(",") : category}
            isOpen={deliveryModalOpen}
            onClose={handleCloseDeliveryModal}
            type={deliveryModalType}
            onSubmit={handleModalSubmit}
            defaultData={deliveryData}
            mode={mode}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            urlKey="integrity"
           
          />
        </div>
      )}
    </>
  );
};

export default GenerateReportPage;