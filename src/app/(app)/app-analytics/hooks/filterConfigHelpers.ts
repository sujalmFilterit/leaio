"use client";

import { useApi } from "@/hooks/api/api_base";
import type { FilterConfig } from "./useAppAnalyticsFilters.ts";
import type { PublisherApiResponse, FilterPayload } from "./useDashboard";

const API_BASE = process.env.NEXT_PUBLIC_APP_PERF || "";

export const createDashboardFilterHook = (
  endpoint: string,
  selectedType: "install" | "event" = "install"
) => {
  return (payload: FilterPayload | any, enabled: boolean) => {
    return useApi<any>(
      `${API_BASE}${selectedType}/${endpoint}`,
      "POST",
      payload,
      {
        queryKey: [`${endpoint}-filter`, payload, selectedType],
        enabled,
      }
    );
  };
};


export const createPostbackFilterHook = (endpoint: string) => {
  return (payload: any, enabled: boolean) => {
    return useApi<any>(
      `${API_BASE}event/${endpoint}`,
      "POST",
      payload,
      {
        queryKey: [`${endpoint}-filter`, payload],
        enabled,
        staleTime: 0,
        cacheTime: 0,
      }
    );
  };
};

/**
 * Helper to create API hook with custom URL
 */
export const createCustomFilterHook = (
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "POST"
) => {
  return (payload: any, enabled: boolean) => {
    return useApi<any>(
      url,
      method,
      payload,
      {
        queryKey: [url, payload],
        enabled,
      }
    );
  };
};



// Dashboard Publishers Filter
export const createDashboardPublishersFilter = (
  selectedType: "install" | "event" = "install"
): FilterConfig => ({
  type: "publishers",
  displayName: "Publishers",
  apiHook: createDashboardFilterHook("publisher", selectedType),
  grouped: true,
  isPublisherType: true,
});

// Dashboard Campaigns Filter
export const createDashboardCampaignsFilter = (
  selectedType: "install" | "event" = "install"
): FilterConfig => ({
  type: "campaigns",
  displayName: "Campaigns",
  apiHook: createDashboardFilterHook("campaign", selectedType),
});

// Dashboard Agency Filter
export const createDashboardAgencyFilter = (
  selectedType: "install" | "event" = "install"
): FilterConfig => ({
  type: "agency",
  displayName: "Agency",
  apiHook: createDashboardFilterHook("agency", selectedType),
});

// Dashboard Country Filter
export const createDashboardCountryFilter = (
  selectedType: "install" | "event" = "install"
): FilterConfig => ({
  type: "country",
  displayName: "Country",
  apiHook: createDashboardFilterHook("country", selectedType),
});

// Dashboard Event Type Filter
export const createDashboardEventTypeFilter = (
  selectedType: "install" | "event" = "install"
): FilterConfig => ({
  type: "event_type",
  displayName: "Event Types",
  apiHook: createDashboardFilterHook("event_list", selectedType),
  enabled: () => selectedType === "event",
});

// Postback Publishers Filter
export const createPostbackPublishersFilter = (): FilterConfig => ({
  type: "publishers",
  displayName: "Publishers",
  apiHook: createPostbackFilterHook("publisher"),
  grouped: true,
  isPublisherType: true,
});

// Postback Event Type Filter
export const createPostbackEventTypeFilter = (): FilterConfig => ({
  type: "event_type",
  displayName: "Event Types",
  apiHook: createPostbackFilterHook("event_list"),
});

/**
 * Create complete filter configs for common pages
 */
export const createDashboardFilters = (
  selectedType: "install" | "event" = "install"
): FilterConfig[] => {
  return [
    createDashboardPublishersFilter(selectedType),
    createDashboardCampaignsFilter(selectedType),
    createDashboardAgencyFilter(selectedType),
    createDashboardCountryFilter(selectedType),
    createDashboardEventTypeFilter(selectedType),
  ];
};

export const createPostbackFilters = (): FilterConfig[] => {
  return [
    createPostbackPublishersFilter(),
    createPostbackEventTypeFilter(),
  ];
};