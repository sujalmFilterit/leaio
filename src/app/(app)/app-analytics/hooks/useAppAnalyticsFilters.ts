"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi } from "@/hooks/api/api_base";
import { deepEqual } from "../dashboard/overall-summary/utils";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PublisherApiResponse {
  Affiliate: string[];
  "Whitelisted Publisher": string[];
  [key: string]: string[];
}

export interface FilterConfig {
  type: string; // Unique identifier for this filter (e.g., "publishers", "event_type")
  displayName: string; // Display name in UI (e.g., "Publishers", "Event Types")
  apiHook: (payload: any, enabled: boolean) => { data: any; isLoading: boolean }; // API hook function
  enabled?: (basePayload: any) => boolean; // Conditional enablement
  grouped?: boolean; // For grouped filters like publishers
  isPublisherType?: boolean; // Whether this filter returns publisher structure
}

export interface FilterQuery {
  [key: string]: string[];
}

export interface FilterData {
  [key: string]: PublisherApiResponse | string[];
}

export interface FilterApiState {
  completed: boolean;
  loading: boolean;
  isResetting: boolean;
}

export interface FilterState {
  filters: Array<{
    label: string;
    checked: boolean;
    subItems?: Array<{ label: string; checked: boolean }>;
  }>;
  isSelectAll: boolean;
  selectedCount: number;
  loading: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Process filter API response and extract string array
 */
const processFilterResponse = (response: any): string[] => {
  if (!response) return [];
  
  const data = Array.isArray(response) ? response : response?.data || [];
  
  if (Array.isArray(data) && data.every((item) => typeof item === "string")) {
    return data;
  }
  
  return [];
};

/**
 * Process publisher response
 */
const processPublisherResponse = (response: any): PublisherApiResponse => {
  if (!response) {
    return {
      Affiliate: [],
      "Whitelisted Publisher": [],
    };
  }
  
  const data = response?.data || response;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.Affiliate || data["Whitelisted Publisher"]) {
      return data as PublisherApiResponse;
    }
  }
  
  return {
    Affiliate: [],
    "Whitelisted Publisher": [],
  };
};

/**
 * Extract filter values from filter state
 */
const extractFilterValues = (filterState: any): string[] => {
  if (!filterState) return ["all"];
  return filterState.isSelectAll
    ? ["all"]
    : filterState.filters?.filter((f: any) => f.checked)?.map((f: any) => f.label) || [];
};

/**
 * Build filter configuration for a simple filter (non-publisher)
 */
const buildSimpleFilterConfig = (
  data: string[],
  query: FilterQuery,
  queryKey: string,
  isLoading: boolean,
  isResetting: boolean
): FilterState => {
  const selectedValues = query[queryKey] || [];
  const isAllSelected = selectedValues.includes("all") || selectedValues.length === 0;
  const totalCount = data?.length ?? 0;

  return {
    filters:
      data && data.length > 0
        ? data.map((item: string) => ({
            label: item,
            checked:
              isResetting ||
              isAllSelected ||
              selectedValues.includes(item) ||
              selectedValues.length === 0,
          }))
        : [],
    isSelectAll: isResetting || isAllSelected || selectedValues.length === totalCount,
    selectedCount: isAllSelected ? totalCount : selectedValues.length || totalCount,
    loading: isLoading,
  };
};

/**
 * Build publisher filter configuration
 */
const buildPublisherFilterConfig = (
  data: PublisherApiResponse,
  query: FilterQuery,
  queryKey: string,
  isLoading: boolean,
  isResetting: boolean
): FilterState => {
  const totalPublishers = Object.values(data || {}).flat().length;
  const selectedPublishers = query[queryKey]?.includes("all")
    ? totalPublishers
    : query[queryKey]?.length ?? totalPublishers;

  return {
    filters: Object.entries(data || {})
      .filter(([_, publishers]) => Array.isArray(publishers) && publishers.length > 0)
      .map(
        ([group, publishers]) => ({
          label: group,
          checked: true,
          subItems: (publishers as string[])?.map((publisher: string) => ({
            label: publisher,
            checked:
              isResetting ||
              query[queryKey]?.includes("all") ||
              query[queryKey]?.includes(publisher) ||
              !query[queryKey],
          })) || [],
        })
      ),
    isSelectAll:
      isResetting ||
      !query[queryKey] ||
      query[queryKey]?.includes("all") ||
      query[queryKey]?.length === totalPublishers,
    selectedCount: selectedPublishers,
    loading: isLoading,
  };
};

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Generic, fully dynamic hook to manage filters across app-analytics pages
 * 
 * @param filterConfigs - Array of filter configurations (completely dynamic)
 * @param baseFilterPayload - Base payload for filter API calls
 * @returns Filter state, configuration, and handlers
 */
export const useAppAnalyticsFilters = (
  filterConfigs: FilterConfig[],
  baseFilterPayload: any | undefined
) => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [query, setQuery] = useState<FilterQuery>(() => {
    const initial: FilterQuery = {};
    filterConfigs.forEach((config) => {
      initial[config.type] = ["all"];
    });
    return initial;
  });
  
  const [loadedFilter, setLoadedFilter] = useState<Record<string, any>>({});
  const [filterApiState, setFilterApiState] = useState<FilterApiState>({
    completed: false,
    loading: false,
    isResetting: false,
  });
  
  const [filterData, setFilterData] = useState<FilterData>(() => {
    const initial: FilterData = {};
    filterConfigs.forEach((config) => {
      if (config.isPublisherType) {
        initial[config.type] = {
          Affiliate: [],
          "Whitelisted Publisher": [],
        };
      } else {
        initial[config.type] = [];
      }
    });
    return initial;
  });

  // ============================================================================
  // API HOOKS - Call each configured API hook
  // ============================================================================
  
  // Call all API hooks (React hooks must be called unconditionally)
  const filterHooksResults = filterConfigs.map((config) => {
    const enabled = config.enabled 
      ? config.enabled(baseFilterPayload)
      : !!baseFilterPayload;
    
    return {
      config,
      result: config.apiHook(baseFilterPayload, enabled),
    };
  });

  const filterHooks = useMemo(() => {
    const hooks: Record<string, { data: any; isLoading: boolean }> = {};
    
    filterHooksResults.forEach(({ config, result }) => {
      hooks[config.type] = result;
    });
    
    return hooks;
  }, [filterHooksResults]);

  const loadingStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    filterConfigs.forEach((config) => {
      states[config.type] = filterHooks[config.type]?.isLoading || false;
    });
    return states;
  }, [filterHooks, filterConfigs]);

  // ============================================================================
  // UPDATE FILTER DATA FROM API RESPONSES
  // ============================================================================
  
  useEffect(() => {
    filterConfigs.forEach((config) => {
      const hookData = filterHooks[config.type]?.data;
      if (hookData) {
        if (config.isPublisherType) {
          setFilterData((prev) => ({
            ...prev,
            [config.type]: processPublisherResponse(hookData),
          }));
        } else {
          const processedData = processFilterResponse(hookData);
          if (processedData.length > 0 || hookData) {
            setFilterData((prev) => ({
              ...prev,
              [config.type]: processedData,
            }));
          }
        }
      }
    });
  }, [
    filterConfigs,
    ...filterConfigs.map((config) => filterHooks[config.type]?.data),
  ]);

  // ============================================================================
  // MONITOR FILTER API COMPLETION
  // ============================================================================
  
  useEffect(() => {
    if (!baseFilterPayload) return;

    const allLoaded = filterConfigs.every((config) => {
      const enabled = config.enabled 
        ? config.enabled(baseFilterPayload)
        : true;
      return !enabled || !loadingStates[config.type];
    });

    if (allLoaded && !filterApiState.completed) {
      setFilterApiState({
        completed: true,
        loading: false,
        isResetting: false,
      });
    } else if (!allLoaded && !filterApiState.loading) {
      setFilterApiState((prev) => ({ ...prev, loading: true }));
    }
  }, [
    baseFilterPayload,
    loadingStates,
    filterConfigs,
    filterApiState.completed,
    filterApiState.loading,
  ]);

  // ============================================================================
  // RESET FUNCTION
  // ============================================================================
  
  const resetFilters = useCallback(() => {
    setFilterApiState({
      completed: false,
      loading: true,
      isResetting: true,
    });
    
    const resetData: FilterData = {};
    filterConfigs.forEach((config) => {
      if (config.isPublisherType) {
        resetData[config.type] = {
          Affiliate: [],
          "Whitelisted Publisher": [],
        };
      } else {
        resetData[config.type] = [];
      }
    });
    setFilterData(resetData);
    
    const resetQuery: FilterQuery = {};
    filterConfigs.forEach((config) => {
      resetQuery[config.type] = ["all"];
    });
    setQuery(resetQuery);
    setLoadedFilter({});
    
    setTimeout(() => {
      setFilterApiState((prev) => ({ ...prev, isResetting: false }));
    }, 100);
  }, [filterConfigs]);

  // ============================================================================
  // BUILD FILTER CONFIGURATIONS
  // ============================================================================
  
  const buildPublishersFilter = useCallback((
    config: FilterConfig,
    data: PublisherApiResponse,
    queryKey: string
  ): Record<string, FilterState> => {
    const publisherConfig = buildPublisherFilterConfig(
      data,
      query,
      queryKey,
      loadingStates[config.type],
      filterApiState.isResetting
    );

    return {
      [config.displayName]: publisherConfig,
    };
  }, [query, loadingStates, filterApiState.isResetting]);

  const buildOtherFilters = useCallback((): Record<string, FilterState> => {
    const filters: Record<string, FilterState> = {};

    filterConfigs.forEach((config) => {
      if (config.isPublisherType || config.grouped) return; // Skip, handled separately

      // Check if filter is enabled
      const isEnabled = config.enabled 
        ? config.enabled(baseFilterPayload)
        : true;
      
      // Skip if filter is not enabled
      if (!isEnabled) return;

      const data = filterData[config.type] as string[];
      const isLoading = loadingStates[config.type];

      filters[config.displayName] = buildSimpleFilterConfig(
        data,
        query,
        config.type,
        isLoading,
        filterApiState.isResetting
      );
    });

    return filters;
  }, [filterData, query, filterApiState.isResetting, loadingStates, filterConfigs, baseFilterPayload]);

  const filterConfig = useMemo(() => {
    const publishersConfig = filterConfigs.find((c) => c.isPublisherType || c.grouped);
    const publishersData = publishersConfig 
      ? (filterData[publishersConfig.type] as PublisherApiResponse)
      : null;
    
    const publishersFilter = publishersConfig && publishersData
      ? buildPublishersFilter(publishersConfig, publishersData, publishersConfig.type)
      : {};
    
    const otherFilters = buildOtherFilters();

    return {
      publishersFilter,
      otherFilters,
    };
  }, [filterConfigs, filterData, buildPublishersFilter, buildOtherFilters]);

  // ============================================================================
  // FILTER CHANGE HANDLERS
  // ============================================================================
  
  const handlePublisherFilterChange = useCallback(
    (newState: Record<string, any>) => {
      const publishersConfig = filterConfigs.find((c) => c.isPublisherType || c.grouped);
      if (!publishersConfig) return;

      const filterState = newState[publishersConfig.displayName];
      if (!filterState) return;

      const publisherPayload = {
        [publishersConfig.type]: filterState.isSelectAll
          ? ["all"]
          : [
              ...(filterState.filters?.Affiliate || []),
              ...(filterState.filters?.["Whitelisted Publisher"] || []),
            ],
      };

      setQuery((prevQuery: FilterQuery) => ({
        ...prevQuery,
        ...publisherPayload,
      } as FilterQuery));

      const filtersChanged = !deepEqual(
        filterState.filters || [],
        loadedFilter[publishersConfig.displayName]?.filters || []
      );

      if (filtersChanged) {
        setLoadedFilter((prev: Record<string, any>) => ({
          ...prev,
          [publishersConfig.displayName]: filterState,
        }));
      }
    },
    [filterConfigs, loadedFilter, baseFilterPayload]
  );

  const handleOtherFiltersChange = useCallback(
    (newState: Record<string, any>) => {
      const otherPayload: Partial<FilterQuery> = {};

      filterConfigs.forEach((config) => {
        if (config.isPublisherType || config.grouped) return;

        // Check if filter is enabled
        const isEnabled = config.enabled 
          ? config.enabled(baseFilterPayload)
          : true;
        
        // Skip if filter is not enabled
        if (!isEnabled) return;

        const filterState = newState[config.displayName];
        if (filterState) {
          otherPayload[config.type] = extractFilterValues(filterState);
        }
      });

      setQuery((prevQuery: FilterQuery) => ({
        ...prevQuery,
        ...otherPayload,
      } as FilterQuery));

      // Check if any filter changed
      const filtersChanged = filterConfigs.some((config) => {
        if (config.isPublisherType || config.grouped) return false;
        
        // Check if filter is enabled
        const isEnabled = config.enabled 
          ? config.enabled(baseFilterPayload)
          : true;
        
        // Skip if filter is not enabled
        if (!isEnabled) return false;
        
        return !deepEqual(
          newState[config.displayName]?.filters || [],
          loadedFilter[config.displayName]?.filters || []
        );
      });

      if (filtersChanged) {
        setLoadedFilter((prevFilter: Record<string, any>) => ({
          ...prevFilter,
          ...newState,
        }));
      }
    },
    [filterConfigs, loadedFilter]
  );

  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // State
    query,
    filterData,
    filterApiState,
    filterConfig,
    loadedFilter,

    // Actions
    setQuery,
    resetFilters,
    handlePublisherFilterChange,
    handleOtherFiltersChange,

    // Loading states
    loadingStates,
    isLoading: Object.values(loadingStates).some((loading) => loading),
  };
};