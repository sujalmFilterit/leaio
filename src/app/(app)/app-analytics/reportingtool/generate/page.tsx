"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Loader2, ChevronDown, FileText, Settings, Download, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { useRouter, useSearchParams } from "next/navigation";
import { usePackage } from "@/components/mf/PackageContext";
import FilterModal from "@/components/report/filterModal";
import DeliveryOptionsModal from "@/components/report/deliveryoptionsModal";
import ConfirmationDialog from "@/components/report/confirmationDialog";
import ToastContent, { ToastType } from "@/components/mf/ToastContent";
import { useDateRange } from "@/components/mf/DateRangeContext";
import { ChartToggleButton } from "@/components/mf/charts/ChartToggleButton";
import {
  useGetCategories,
  useGetTemplates,
  useGetTemplateFields,
  useGetDimensionFilters,
  useCreateReport,
  useViewReport,
  useEditReport,
  type GroupedDimension,
  type DimensionFilter,
  type DeliveryOptions,
  type ReportPayload,
  type CreateReportPayload,
  type ViewReportResponse,
} from "../../hooks/useReport";

// Constants
const FILTER_EXCLUDED_TERMS = ["date", "time", "installed_app"];
const CUSTOM_TEMPLATE = "Custom";
const CUSTOM_RANGE = "Custom Range";
const DEBOUNCE_DELAY = 150;

// Helpers
const ensureArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (value !== null && value !== undefined) return [value];
  return [];
};

const shouldShowFilter = (id: string): boolean => {
  const lower = id?.toLowerCase() || "";
  return !FILTER_EXCLUDED_TERMS.some((term) => lower.includes(term));
};

// Types
interface CategoryState {
  template: string;
  dimensions: GroupedDimension[];
  selectedDimensions: string[];
  popoverOpen: boolean;
}

interface ToastData {
  type: ToastType;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | null;
}

const GenerateReportPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedPackage } = usePackage();
  const { startDate, endDate } = useDateRange();

  // URL params
  const editId = searchParams.get("id");
  const mode = searchParams.get("mode");
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isCloneMode = mode === "clone";
  const isReadOnly = isViewMode || isEditMode;

  // Form state
  const [formData, setFormData] = useState({
    reportName: "",
    reportCategory: "summary" as "summary" | "transactional",
    fileType: "csv",
    frequency: null as string | null,
    category: [] as string[],
    isDownloadReport: null as boolean | null,
  });

  const [categoryTemplates, setCategoryTemplates] = useState<Record<string, CategoryState>>({});
  const [dimensionsFilters, setDimensionsFilters] = useState<DimensionFilter[]>([]);
  const [errors, setErrors] = useState({ reportName: "", category: "", dimensions: "" });
  const [toastData, setToastData] = useState<ToastData | null>(null);

  // Modal states
  const [modals, setModals] = useState({
    filter: false,
    threshold: false,
    delivery: false,
    confirmation: false,
  });
  const [deliveryType, setDeliveryType] = useState<"schedule" | "download">("schedule");
  const [deliveryData, setDeliveryData] = useState<DeliveryOptions | null>(null);
  const [filterState, setFilterState] = useState<{ item: { id: string; label: string } | null; category: string; search: string }>({
    item: null,
    category: "",
    search: "",
  });
  const [dimensionSearch, setDimensionSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(dimensionSearch), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [dimensionSearch]);

  // API Hooks
  const { data: categoriesData, isLoading: isLoadingCategories, refetch: refetchCategories } = useGetCategories(
    selectedPackage || undefined,
    !!selectedPackage
  );
  const categoryOptions = useMemo(() => categoriesData?.map((item) => ({ label: item.label, value: item.value })) || [], [categoriesData]);

  // Templates per category
  const installTemplates = useGetTemplates(selectedPackage, "install", !!selectedPackage && formData.category.includes("install"));
  const eventTemplates = useGetTemplates(selectedPackage, "event", !!selectedPackage && formData.category.includes("event"));

  const templatesMap = useMemo(
    () => ({
      install: Array.isArray(installTemplates.data) ? installTemplates.data : [],
      event: Array.isArray(eventTemplates.data) ? eventTemplates.data : [],
    }),
    [installTemplates.data, eventTemplates.data]
  );

  const templatesLoadingMap = useMemo(
    () => ({
      install: installTemplates.isLoading || installTemplates.isFetching,
      event: eventTemplates.isLoading || eventTemplates.isFetching,
    }),
    [installTemplates.isLoading, installTemplates.isFetching, eventTemplates.isLoading, eventTemplates.isFetching]
  );

  // Template fields per category
  const installFields = useGetTemplateFields(
    categoryTemplates["install"]?.template,
    "install",
    selectedPackage || undefined,
    formData.reportCategory,
    !!categoryTemplates["install"]?.template && formData.category.includes("install") && !!selectedPackage && !!formData.reportCategory && !isViewMode
  );

  const eventFields = useGetTemplateFields(
    categoryTemplates["event"]?.template,
    "event",
    selectedPackage || undefined,
    formData.reportCategory,
    !!categoryTemplates["event"]?.template && formData.category.includes("event") && !!selectedPackage && !!formData.reportCategory && !isViewMode
  );

  const fieldsMap = useMemo(
    () => ({
      install: installFields.data,
      event: eventFields.data,
    }),
    [installFields.data, eventFields.data]
  );

  // Filters
  const { data: filterData, isLoading: isLoadingFilters, isFetching: isFetchingFilters } = useGetDimensionFilters(
    filterState.item?.id,
    selectedPackage || undefined,
    filterState.category || formData.category,
    formData.reportCategory,
    filterState.search,
    modals.filter && !!filterState.item?.id
  );

  // Create/View/Edit
  const [createPayload, setCreatePayload] = useState<CreateReportPayload | undefined>(undefined);
  const { data: createData, isLoading: isCreating, isFetching: isFetchingCreate, refetch: refetchCreate } = useCreateReport(createPayload, false);

  const [viewPayload, setViewPayload] = useState<{ doc_id?: string; package_name?: string } | undefined>(undefined);
  const processedPayloadRef = useRef<string | null>(null);
  const { data: viewData, isLoading: isLoadingView, isFetching: isFetchingView, refetch: refetchViewReport } = useViewReport(
    viewPayload,
    !!(viewPayload?.doc_id && viewPayload?.package_name)
  );

  const [editPayload, setEditPayload] = useState<{ doc_id?: string; package_name?: string; update_data?: any } | undefined>(undefined);
  const { data: editData, isLoading: isEditing, isFetching: isFetchingEdit, refetch: refetchEdit } = useEditReport(editPayload, false);

  const isLoading = isCreating || isFetchingCreate || isLoadingView || isFetchingView || isEditing || isFetchingEdit;

  // Initialize category templates
  useEffect(() => {
    const missing = formData.category.filter((cat) => !categoryTemplates[cat]);
    if (missing.length > 0) {
      setCategoryTemplates((prev) => {
        const updated = { ...prev };
        missing.forEach((cat) => {
          updated[cat] = { template: "", dimensions: [], selectedDimensions: [], popoverOpen: false };
        });
        return updated;
      });
    }
  }, [formData.category, categoryTemplates]);

  // Set default templates
  useEffect(() => {
    if (editId) return;
    const updates: Record<string, Partial<CategoryState>> = {};
    formData.category.forEach((cat) => {
      const templates = templatesMap[cat as keyof typeof templatesMap] || [];
      const state = categoryTemplates[cat];
      if (templates.length > 0 && !state?.template) {
        updates[cat] = { template: templates[0] || "" };
      }
    });
    if (Object.keys(updates).length > 0) {
      setCategoryTemplates((prev) => {
        const updated = { ...prev };
        Object.keys(updates).forEach((cat) => {
          updated[cat] = { ...updated[cat], ...updates[cat] };
        });
        return updated;
      });
    }
  }, [templatesMap, editId, formData.category, categoryTemplates]);

  // Update dimensions from fields
  useEffect(() => {
    const updates: Record<string, GroupedDimension[]> = {};
    formData.category.forEach((cat) => {
      const fields = fieldsMap[cat as keyof typeof fieldsMap];
      if (fields?.dimensions) {
        updates[cat] = fields.dimensions;
      }
    });
    if (Object.keys(updates).length > 0) {
      setCategoryTemplates((prev) => {
        const updated = { ...prev };
        Object.keys(updates).forEach((cat) => {
          // When updating dimensions from template fields, preserve selectedDimensions
          // This is important for edit/view mode where selectedDimensions were set from saved data
          updated[cat] = { 
            ...updated[cat], 
            dimensions: updates[cat],
            // Preserve selectedDimensions if they were already set (from view data)
            selectedDimensions: updated[cat]?.selectedDimensions || []
          };
        });
        return updated;
      });
    }
  }, [fieldsMap, formData.category]);

  // Load report for view/edit
  useEffect(() => {
    if (editId && (isEditMode || isCloneMode || isViewMode) && selectedPackage) {
      const payload = { doc_id: editId, package_name: selectedPackage };
      const payloadKey = `${editId}-${selectedPackage}`;
      // Reset processed flag when payload changes
      if (processedPayloadRef.current !== payloadKey) {
        processedPayloadRef.current = null;
        // Reset form to ensure clean state
        setFormData({
          reportName: "",
          reportCategory: "summary",
          fileType: "csv",
          frequency: null,
          category: [],
          isDownloadReport: null,
        });
        setCategoryTemplates({});
        setDimensionsFilters([]);
        setDeliveryData(null);
      }
      setViewPayload(payload);
    } else {
      setViewPayload(undefined);
      processedPayloadRef.current = null;
    }
  }, [editId, isEditMode, isCloneMode, isViewMode, selectedPackage]);

  // Refetch view report when payload changes to ensure fresh data
  useEffect(() => {
    if (viewPayload?.doc_id && viewPayload?.package_name) {
      // Small delay to ensure state is updated and query is enabled
      const timeoutId = setTimeout(() => {
        if (refetchViewReport) {
          refetchViewReport();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [viewPayload?.doc_id, viewPayload?.package_name, refetchViewReport]);

  // Process view data - only process when we have valid payload and fresh data
  useEffect(() => {
    // Don't process if we don't have data or payload
    if (!viewData || !viewPayload?.doc_id || !viewPayload?.package_name) return;
    
    const payloadKey = `${viewPayload.doc_id}-${viewPayload.package_name}`;
    
    // Check if we've already processed this payload
    if (processedPayloadRef.current === payloadKey) return;
    
    // Wait for initial load to complete, but allow processing if data is available
    if (isLoadingView) return; // Only block on initial load, not refetch
    
    const response = viewData as ViewReportResponse;
    const data = response?.data;
    if (!data || Object.keys(data).length === 0) {
      // Mark as processed even if empty to avoid infinite loops
      processedPayloadRef.current = payloadKey;
      return;
    }

    const categories: string[] = [];
    const categoryDataMap: Record<string, any> = {};
    const validCategoryKeys = ["install", "event"]; // Valid category keys

    // Extract categories from response
    Object.keys(data).forEach((key) => {
      const catData = (data as any)[key];
      if (!catData || typeof catData !== "object") return;

      // If key is a valid category (install, event), use it
      if (validCategoryKeys.includes(key)) {
        if (!categories.includes(key)) {
          categories.push(key);
        }
        categoryDataMap[key] = catData;
      }
      
      // Also check if category is specified in the data
      if (catData?.category) {
        const catArray = ensureArray(catData.category);
        catArray.forEach((cat: string) => {
          // Handle comma-separated strings
          const catString = String(cat).trim();
          const splitCats = catString.includes(",") 
            ? catString.split(",").map(c => c.trim().toLowerCase())
            : [catString.toLowerCase()];
          
          splitCats.forEach((normalizedCat) => {
            if (validCategoryKeys.includes(normalizedCat) && !categories.includes(normalizedCat)) {
              categories.push(normalizedCat);
            }
            if (!categoryDataMap[normalizedCat]) {
              categoryDataMap[normalizedCat] = catData;
            }
          });
        });
      }
    });

    // Fallback: if no categories found but we have install/event keys, use them
    if (categories.length === 0) {
      validCategoryKeys.forEach((key) => {
        const catData = (data as any)[key];
        if (catData) {
          categories.push(key);
          categoryDataMap[key] = catData;
        }
      });
    }

    const uniqueCategories = Array.from(new Set(categories));
    if (uniqueCategories.length === 0) return;

    const firstData = Object.values(categoryDataMap)[0];
    if (!firstData) return;

    setFormData((prev) => ({
      ...prev,
      reportName: firstData.report_name || "",
      reportCategory: firstData.report_type || "summary",
      frequency: firstData.occurence || null,
      fileType: firstData.reportFormats || "csv",
      category: uniqueCategories,
      isDownloadReport: firstData.download === "yes",
    }));

    const templateUpdates: Record<string, Partial<CategoryState>> = {};
    const filtersToSet: DimensionFilter[] = [];

    uniqueCategories.forEach((cat) => {
      const catData = categoryDataMap[cat] || data[cat as keyof typeof data];
      if (!catData) return;

      if (catData.template) {
        templateUpdates[cat] = { template: catData.template || "" };
      }

      if (catData.dimensions?.length > 0) {
        // Convert filters to use composite keys (category:field) to make them unique per category
        const categoryFilters = catData.dimensions.map((dim: DimensionFilter) => ({
          field: `${cat}:${dim.field}`, // Use composite key
          value: dim.value || [],
        }));
        filtersToSet.push(...categoryFilters);
        
        const dimensionFields = catData.dimensions.map((dim: DimensionFilter) => dim.field);
        templateUpdates[cat] = {
          ...templateUpdates[cat],
          selectedDimensions: dimensionFields,
          // Don't set dimensions here - let template fields API provide the proper structure
          // This prevents duplicate dimensions when template fields load
        };
      }
    });

    if (Object.keys(templateUpdates).length > 0) {
      setCategoryTemplates((prev) => {
        const updated = { ...prev };
        Object.keys(templateUpdates).forEach((cat) => {
          updated[cat] = { ...updated[cat], ...templateUpdates[cat] };
        });
        return updated;
      });
    }

    if (filtersToSet.length > 0) setDimensionsFilters(filtersToSet);
    if (firstData.deliveryOptions) setDeliveryData(firstData.deliveryOptions);
    
    // Mark this payload as processed
    processedPayloadRef.current = payloadKey;
  }, [viewData, viewPayload, isLoadingView]);

  // Refetch categories on package/date change
  useEffect(() => {
    if (selectedPackage) refetchCategories();
  }, [selectedPackage, startDate, endDate, refetchCategories]);

  // Handle API success
  useEffect(() => {
    if (createData && (createData as any)?.status === "success") {
      setToastData({ type: "success", title: "Success", description: "Report created successfully!", variant: "default" });
      router.push("/app-analytics/reportingtool/report");
    }
  }, [createData, router]);

  useEffect(() => {
    if (editData && (editData as any)?.status === "success") {
      setToastData({ type: "success", title: "Success", description: "Report updated successfully!", variant: "default" });
      router.push("/app-analytics/reportingtool/report");
    }
  }, [editData, router]);

  // Handlers
  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleCategoryChange = useCallback(
    (values: string[]) => {
      if (isReadOnly) return;
      updateFormData({ category: values });
      if (values.length > 0) setErrors((prev) => ({ ...prev, category: "" }));
    },
    [isReadOnly, updateFormData]
  );

  const handleTemplateChange = useCallback((cat: string, value: string) => {
    setCategoryTemplates((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], template: value, selectedDimensions: [] },
    }));
  }, []);

  const handleDimensionSelect = useCallback((cat: string, value: string) => {
    setCategoryTemplates((prev) => {
      const state = prev[cat] || { template: "", dimensions: [], selectedDimensions: [], popoverOpen: false };
      const selected = state.selectedDimensions || [];
      const newSelected = selected.includes(value) ? selected.filter((d) => d !== value) : [...selected, value];
      if (newSelected.length > 0) setErrors((prev) => ({ ...prev, dimensions: "" }));
      return { ...prev, [cat]: { ...state, selectedDimensions: newSelected } };
    });
  }, []);

  const handleFilterClick = useCallback((item: { id: string; label: string }, cat: string) => {
    setFilterState({ item, category: cat, search: "" });
    setModals((prev) => ({ ...prev, filter: true }));
  }, []);

  const handleFilterSave = useCallback((data: DimensionFilter & { category?: string }) => {
    const category = filterState.category || data.category || "";
    if (!category) return;
    
    // Create composite key: category:field to make filters unique per category
    const compositeField = `${category}:${data.field}`;
    
    setDimensionsFilters((prev) => {
      const index = prev.findIndex((f) => {
        // Check if filter has category prefix or match by composite key
        const existingField = f.field.includes(':') ? f.field : `${category}:${f.field}`;
        return existingField === compositeField;
      });
      
      if (index !== -1) {
        const existing = prev[index];
        const updatedFilter = { ...data, field: compositeField };
        if (JSON.stringify(existing) === JSON.stringify(updatedFilter)) return prev;
        const updated = [...prev];
        updated[index] = updatedFilter;
        return updated;
      }
      return [...prev, { ...data, field: compositeField }];
    });
  }, [filterState.category]);

  const validateForm = useCallback((): boolean => {
    const newErrors = { reportName: "", category: "", dimensions: "" };
    let isValid = true;

    if (!formData.reportName.trim()) {
      newErrors.reportName = "Report name is mandatory.";
      isValid = false;
    }

    if (formData.category.length === 0) {
      newErrors.category = "Please select at least one category";
      isValid = false;
    }

    formData.category.forEach((cat) => {
      const state = categoryTemplates[cat];
      if (state?.template === CUSTOM_TEMPLATE && (!state.selectedDimensions || state.selectedDimensions.length === 0)) {
        newErrors.dimensions = "Please select at least one dimension";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData.reportName, formData.category, categoryTemplates]);

  const buildDimensionsPayload = useCallback(
    (cat: string): DimensionFilter[] => {
      const state = categoryTemplates[cat];
      if (!state) return [];

      if (state.template === CUSTOM_TEMPLATE) {
        return (state.selectedDimensions || []).map((id) => {
          // Look for filter with composite key (category:field)
          const compositeField = `${cat}:${id}`;
          const existing = dimensionsFilters.find((f) => {
            // Support both old format (just field) and new format (category:field)
            return f.field === compositeField || f.field === id;
          });
          // Return with original field name (without category prefix) for API
          return { field: id, value: existing?.value || [] };
        });
      }

      const allDimensions: Array<{ id: string; label: string }> = [];
      (state.dimensions || []).forEach((group) => {
        group.items.forEach((item) => allDimensions.push(item));
      });

      return allDimensions.map((dim) => {
        // Look for filter with composite key (category:field)
        const compositeField = `${cat}:${dim.id}`;
        const existing = dimensionsFilters.find((f) => {
          // Support both old format (just field) and new format (category:field)
          return f.field === compositeField || f.field === dim.id;
        });
        // Return with original field name (without category prefix) for API
        return { field: dim.id, value: existing?.value || [] };
      });
    },
    [categoryTemplates, dimensionsFilters]
  );

  const buildPayload = useCallback(
    (delivery: DeliveryOptions): CreateReportPayload => {
      const payload: CreateReportPayload = {};
      formData.category.forEach((cat) => {
        const state = categoryTemplates[cat];
        if (!state?.template) return;

        const reportPayload: ReportPayload = {
          report_name: formData.reportName,
          occurance: formData.frequency || undefined,
          package_name: selectedPackage || "",
          dimensions: buildDimensionsPayload(cat),
          reportFormats: formData.fileType,
          report_type: formData.reportCategory,
          deliveryOptions: (delivery as any)?.[cat] || delivery,
          download: deliveryType === "download" ? "yes" : "no",
          template: state.template,
          category: [cat],
        };

        if (formData.frequency === CUSTOM_RANGE) {
          reportPayload.start_date = delivery?.dateRange?.startDate;
          reportPayload.end_date = delivery?.dateRange?.endDate;
        }

        (payload as any)[cat] = reportPayload;
      });
      return payload;
    },
    [formData, categoryTemplates, selectedPackage, deliveryType, buildDimensionsPayload]
  );

  const handleModalSubmit = useCallback(
    (data: DeliveryOptions) => {
      setDeliveryData(data);
      if (editId && isEditMode) {
        const updateData: Record<string, ReportPayload> = {};
        formData.category.forEach((cat) => {
          const state = categoryTemplates[cat];
          if (!state?.template) return;
          const payload: ReportPayload = {
            report_name: formData.reportName,
            occurence: formData.frequency || undefined,
            package_name: selectedPackage || "",
            dimensions: buildDimensionsPayload(cat),
            reportFormats: formData.fileType,
            report_type: formData.reportCategory,
            deliveryOptions: (data as any)?.[cat] || data,
            download: deliveryType === "download" ? "yes" : "no",
            template: state.template,
            category: cat,
          };
          if (formData.frequency === CUSTOM_RANGE) {
            payload.start_date = data?.dateRange?.startDate;
            payload.end_date = data?.dateRange?.endDate;
          }
          updateData[cat] = payload;
        });
        setEditPayload({ doc_id: editId, package_name: selectedPackage, update_data: updateData });
        requestAnimationFrame(() => refetchEdit());
      } else {
        setCreatePayload(buildPayload(data));
        requestAnimationFrame(() => refetchCreate());
      }
      setModals((prev) => ({ ...prev, delivery: false }));
    },
    [editId, isEditMode, formData, categoryTemplates, selectedPackage, deliveryType, buildDimensionsPayload, buildPayload, refetchEdit, refetchCreate]
  );

  const handleDownloadClick = useCallback(() => {
    if (!validateForm()) return;
    setDeliveryType("download");
    setModals((prev) => ({ ...prev, delivery: true }));
  }, [validateForm]);

  const handleScheduleClick = useCallback(() => {
    if (!validateForm()) return;
    setDeliveryType("schedule");
    setModals((prev) => ({ ...prev, delivery: true }));
  }, [validateForm]);

  const handleConfirmation = useCallback(
    (action: "cloud" | "email" | "download") => {
      setModals((prev) => ({ ...prev, confirmation: false }));
      if (action === "cloud" || action === "email") {
        setDeliveryType("download");
        setModals((prev) => ({ ...prev, delivery: true }));
      } else if (deliveryData) {
        handleModalSubmit(deliveryData);
      }
    },
    [deliveryData, handleModalSubmit]
  );

  // Filter dimensions
  const filterDimensions = useCallback(
    (dimensions: GroupedDimension[], search: string) => {
      if (!search) return dimensions;
      const lower = search.toLowerCase();
      return dimensions
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.label.toLowerCase().includes(lower)),
        }))
        .filter((group) => group.items.length > 0);
    },
    []
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-gray-700">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-gradient-to-br from-gray-50 to-gray-100 pt-2">
      {toastData && <ToastContent type={toastData.type} title={toastData.title} description={toastData.description} variant={toastData.variant} />}

      <div className="max-w-7xl mx-auto space-y-2">
        {/* Header */}
        

        {/* Basic Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Report Name */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Report Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Enter report name"
                value={formData.reportName}
                onChange={(e) => {
                  updateFormData({ reportName: e.target.value });
                  setErrors((prev) => ({ ...prev, reportName: "" }));
                }}
                disabled={isReadOnly}
                className={`h-9 text-sm ${errors.reportName ? 'border-red-500' : ''}`}
              />
              {errors.reportName && <p className="text-xs text-red-500">{errors.reportName}</p>}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Category <span className="text-red-500">*</span></Label>
              {isLoadingCategories ? (
                <div className="flex items-center justify-center h-9 border border-input rounded-md bg-gray-50">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : (
                <MultiSelect
                  options={categoryOptions}
                  onValueChange={handleCategoryChange}
                  defaultValue={formData.category}
                  placeholder="Select categories"
                  disabled={isReadOnly}
                  className="w-full"
                />
              )}
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            {/* File Type */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">File Type</Label>
              <ChartToggleButton
                options={[
                  { label: "CSV", value: "csv" },
                  { label: "XLSX", value: "xlsx" },
                  { label: "PARQUET", value: "parquet" },
                ]}
                selectedValue={formData.fileType}
                onChange={(value) => updateFormData({ fileType: value })}
                className={isReadOnly ? "opacity-50 pointer-events-none" : "w-full"}
              />
            </div>

            {/* Report Category */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Report Category</Label>
              <ChartToggleButton
                options={[
                  { label: "Summary", value: "summary" },
                  { label: "Transactional", value: "transactional" },
                ]}
                selectedValue={formData.reportCategory}
                onChange={(value) => updateFormData({ reportCategory: value as "summary" | "transactional" })}
                className={isReadOnly ? "opacity-50 pointer-events-none" : "w-full"}
              />
            </div>
          </div>
        </div>

        {/* Category Templates and Dimensions */}
        {formData.category.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {formData.category.map((cat) => {
              const state = categoryTemplates[cat] || { template: "", dimensions: [], selectedDimensions: [], popoverOpen: false };
              const templates = templatesMap[cat as keyof typeof templatesMap] || [];
              const isLoadingTemplates = templatesLoadingMap[cat as keyof typeof templatesLoadingMap] || false;
              const filteredDims = filterDimensions(state.dimensions, debouncedSearch);

              return (
                <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${cat === 'install' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                        <FileText className={`h-4 w-4 ${cat === 'install' ? 'text-blue-600' : 'text-purple-600'}`} />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 capitalize">{cat} Configuration</h3>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Template Selection */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700">{cat.charAt(0).toUpperCase() + cat.slice(1)} Template</Label>
                      <Select value={state.template} onValueChange={(value) => handleTemplateChange(cat, value)} disabled={isViewMode}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={`Choose ${cat} template`} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingTemplates ? (
                            <div className="flex justify-center items-center p-4">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : (
                            templates.map((template) => (
                              <SelectItem key={template} value={template}>
                                {template}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dimensions Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-gray-700">{cat.charAt(0).toUpperCase() + cat.slice(1)} Dimensions</Label>
                        {state.template === CUSTOM_TEMPLATE && (
                          <span className="text-xs text-gray-500">
                            {state.selectedDimensions?.length || 0} selected
                          </span>
                        )}
                      </div>

                      {state.template === CUSTOM_TEMPLATE && (
                        <Popover
                          open={state.popoverOpen}
                          onOpenChange={(open) =>
                            setCategoryTemplates((prev) => ({
                              ...prev,
                              [cat]: { ...prev[cat], popoverOpen: open },
                            }))
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between h-9 text-sm" disabled={isViewMode}>
                              <span className="text-xs">Select {cat.charAt(0).toUpperCase() + cat.slice(1)} Dimensions</span>
                              <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <div className="p-2">
                              <Input
                                type="text"
                                placeholder="Search dimensions..."
                                className="mb-2 h-8 text-sm"
                                value={dimensionSearch}
                                onChange={(e) => setDimensionSearch(e.target.value)}
                              />
                              <div className="max-h-[250px] overflow-y-auto">
                                {filteredDims.map((group) => (
                                  <div key={group.label} className="mb-2">
                                    <div className="mb-1 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.label}</div>
                                    {group.items.map((item) => (
                                      <div key={item.id} className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-2 flex-1">
                                          <Checkbox
                                            id={`dimension-${cat}-${item.id}`}
                                            checked={(state.selectedDimensions || []).includes(item.id)}
                                            onCheckedChange={() => handleDimensionSelect(cat, item.id)}
                                          />
                                          <Label htmlFor={`dimension-${cat}-${item.id}`} className="cursor-pointer text-xs text-gray-700 flex-1">
                                            {item.label}
                                          </Label>
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

                      {errors.dimensions && <p className="text-xs text-red-500">{errors.dimensions}</p>}

                      {state.template === CUSTOM_TEMPLATE && (!state.selectedDimensions || state.selectedDimensions.length === 0) ? (
                        <div className="mt-1 flex h-16 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
                          <p className="text-xs text-gray-500">Select dimensions to view them here</p>
                        </div>
                      ) : (
                        <div className="mt-1 max-h-[250px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50/50">
                          {state.dimensions.map((group) => {
                            const groupItems =
                              state.template === CUSTOM_TEMPLATE
                                ? group.items.filter((item) => (state.selectedDimensions || []).includes(item.id))
                                : group.items;
                            if (groupItems.length === 0) return null;
                            return (
                              <div key={group.label} className="p-2 border-b border-gray-200 last:border-b-0">
                                <div className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.label}</div>
                                <div className="space-y-1">
                                  {groupItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-white transition-colors">
                                      <div className="flex items-center gap-2 flex-1">
                                        {state.template === CUSTOM_TEMPLATE && (
                                          <Checkbox id={item.id} checked={true} onClick={() => handleDimensionSelect(cat, item.id)} />
                                        )}
                                        <Label htmlFor={item.id} className="text-xs text-gray-700 cursor-pointer flex-1">
                                          {item.label}
                                        </Label>
                                      </div>
                                      {shouldShowFilter(item.id) && (
                                        <button
                                          onClick={() => handleFilterClick(item, cat)}
                                          className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors"
                                          disabled={isViewMode}
                                          title="Apply filters"
                                        >
                                          <Filter className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

       <div className="mt-2 flex justify-end gap-2">
         <Button size="sm" variant="default" onClick={() => router.push("/app-analytics/reportingtool/report")}>
           Cancel
         </Button>
         <Button size="sm" variant="default" onClick={handleScheduleClick} disabled={(isViewMode || isEditMode || isCloneMode) && formData.isDownloadReport === true}>
           Schedule
         </Button>
         <Button size="sm" variant="default" onClick={handleDownloadClick} disabled={(isViewMode || isEditMode || isCloneMode) && formData.isDownloadReport === false}>
           Download
         </Button>
       </div>

      <ConfirmationDialog isOpen={modals.confirmation} onClose={() => setModals((prev) => ({ ...prev, confirmation: false }))} onConfirm={handleConfirmation} />

      <FilterModal
        isOpen={modals.filter}
        onClose={() => {
          setModals((prev) => ({ ...prev, filter: false }));
          setFilterState({ item: null, category: "", search: "" });
        }}
        selectedItem={filterState.item}
        onSave={handleFilterSave}
        filterData={filterData}
        filterloading={isLoadingFilters || isFetchingFilters}
        savedFilters={dimensionsFilters}
        mode={mode || ""}
        onSearchChange={(val) => setFilterState((prev) => ({ ...prev, search: val }))}
        category={filterState.category}
      />

      <DeliveryOptionsModal
        category={formData.category.join(",")}
        isOpen={modals.delivery}
        onClose={() => {
          setModals((prev) => ({ ...prev, delivery: false }));
          setDeliveryData(null);
        }}
        type={deliveryType}
        onSubmit={handleModalSubmit}
        defaultData={deliveryData}
        mode={mode || ""}
        frequency={formData.frequency || undefined}
        onFrequencyChange={(val) => updateFormData({ frequency: val || null })}
      />
    </div>
  );
};

export default GenerateReportPage;
