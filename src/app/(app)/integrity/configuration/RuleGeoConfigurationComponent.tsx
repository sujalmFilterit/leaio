"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, ChevronDown, Trash2 } from "lucide-react";
import ResizableTable from "@/components/mf/ReportingToolTable";
import { useApiCall } from "@/services/api_base";
import { Checkbox } from "@/components/ui/checkbox";
import MultipleSelect from "@/components/ui/multiple-select";

import { usePackage } from "@/components/mf/PackageContext";
import Endpoint from "../common/endpoint";
// Types
type ThresholdToleranceResponse = {
  frequency: number;
  tolerance: string;
  blocked: boolean;
};

type CountryOption = {
  value: string;
  label: string;
};

type UpdateThresholdTolerancePayload = {
  package_name: string;
  frequency: number;
  tolerance: string;
  blocked: boolean;
};

type RuleConfigItem = {
  id: number;
  rule_configuration: string;
  whitelist_count: number;
  whitelist_threshold: number;
};

type RuleConfigResponse = {
  data: RuleConfigItem[];
  total: number;
  page_number: number;
  record_limit: number;
  total_pages: number;
};

type RuleConfigPayload = {
  package_name: string;
  
  page_number: number;
  record_limit: number;
};

type ConfigParametersPayload = {
  package_name: string;
};

type GeoConfigItem = {
  id: number;
  campaign_parameter: string;
  parameter_value: string | number;
  allowed_geo: string;
};

type GeoConfigResponse = {
  data: Omit<GeoConfigItem, 'id'>[];
  total: number;
  page_number: number;
  record_limit: number;
  total_pages: number;
};

type GeoConfigPayload = {
  package_name: string;
 
  page_number: number;
  record_limit: number;
};

const RuleGeoConfigurationComponent = () => {
  
  const { selectedPackage } = usePackage();
  console.log("selectedPackage", selectedPackage);
  // Configuration section state - initially empty, will be populated from API
  const [frequencyCapping, setFrequencyCapping] = useState("");
  const [fraudTolerance, setFraudTolerance] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Configuration parameters state
  const [configParameters, setConfigParameters] = useState<string[]>([]);
  
  // Countries state
  const [countries, setCountries] = useState<CountryOption[]>([]);

  // API call to fetch threshold tolerance configuration
  const thresholdToleranceApi = useApiCall<ThresholdToleranceResponse>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.THRESHOLD_TOLERANCE,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Threshold Tolerance API Response:", responseData);
      setApiError(null); // Clear any previous errors
      
      if (responseData) {
        setFrequencyCapping(responseData.frequency?.toString() || "");
        setFraudTolerance(responseData.tolerance || "");
        setIsBlocked(responseData.blocked || false);
      }
    },
    onError: (error) => {
      console.error("Threshold Tolerance API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to load threshold tolerance configuration";
      setApiError(errorMessage);
    }
  });

  // API call to update threshold tolerance configuration
  const updateThresholdToleranceApi = useApiCall<string>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.UPDATE_THRESHOLD_TOLERANCE,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Update Threshold Tolerance API Response:", responseData);
      
      // Refresh the data after successful update
      if (thresholdToleranceApi.type === "mutation") {
        thresholdToleranceApi.result.mutateAsync({
          package_name: selectedPackage,
        });
      }
    },
    onError: (error) => {
      console.error("Update Threshold Tolerance API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to save threshold tolerance configuration";
    }
  });

  // API call to fetch rule configuration data
  const ruleConfigApi = useApiCall<RuleConfigResponse>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.RULE_CONFIG_SUMMARY,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Rule Config API Response:", responseData);
      if (responseData) {
        const dataWithIds = responseData.data.map((item, index) => ({
          ...item,
          id: index + 1 + (responseData.page_number - 1) * responseData.record_limit
        }));
        setRuleConfigData(dataWithIds);
        setRuleTotalPages(responseData.total_pages);
      }
    },
    onError: (error) => {
      console.error("Rule Config API Error:", error);
    }
  });

  // API call to fetch configuration parameters
  const configParametersApi = useApiCall<string[]>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.CONFIG_PARAMETERS,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Config Parameters API Response:", responseData);
      if (responseData) {
        setConfigParameters(responseData);
      }
    },
    onError: (error) => {
      console.error("Config Parameters API Error:", error);
    }
  });

  // API call to fetch countries
  const countriesApi = useApiCall<CountryOption[]>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.GEO_COUNTRY_CODE,
    method: "POST",
   
    manual: true,
    onSuccess: (responseData) => {
      console.log("Countries API Response:", responseData);
      if (responseData) {
        setCountries(responseData);
      }
    },
    onError: (error) => {
      console.error("Countries API Error:", error);
    }
  });

  // API call to fetch geo configuration data
  const geoConfigApi = useApiCall<GeoConfigResponse>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.GEO_CONFIG_SUMMARY,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Geo Config API Response:", responseData);
      if (responseData) {
        const dataWithIds = responseData.data.map((item, index) => ({
          ...item,
          id: index + 1 + (responseData.page_number - 1) * responseData.record_limit
        }));
        setGeoConfigData(dataWithIds);
        setGeoTotalPages(responseData.total_pages);
      }
    },
    onError: (error) => {
      console.error("Geo Config API Error:", error);
    }
  });

  // API call to add rule configuration
  const addRuleConfigApi = useApiCall<string>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.ADD_RULE_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Add Rule Config API Response:", responseData);
      
      // Close modal and reset form
      setIsRuleModalOpen(false);
      setRuleForm({
        rows: [
          {
            configurationParameter: "",
            value: "",
            whitelistThreshold: "",
          }
        ]
      });
      setRuleEditMode(false);
      setEditingRuleId(null);
      
      // Refresh the rule configuration data
      fetchRuleConfigData();
    },
    onError: (error) => {
      console.error("Add Rule Config API Error:", error);
    }
  });

  // API call to add geo configuration
  const addGeoConfigApi = useApiCall<string>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.ADD_GEO_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Add Geo Config API Response:", responseData);
      
      // Close modal and reset form
      setIsGeoModalOpen(false);
      setGeoForm({
        rows: [
          {
            parameter: "",
            value: "",
            selectGeo: [],
          }
        ]
      });
      setGeoEditMode(false);
      setEditingGeoId(null);
      
      // Refresh the geo configuration data
      fetchGeoConfigData();
    },
    onError: (error) => {
      console.error("Add Geo Config API Error:", error);
    }
  });

  // API call to edit rule configuration
  const editRuleConfigApi = useApiCall<string>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.EDIT_RULE_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Edit Rule Config API Response:", responseData);
      
      // Close modal and reset form
      setIsRuleModalOpen(false);
      setRuleForm({
        rows: [
          {
            configurationParameter: "",
            value: "",
            whitelistThreshold: "",
          }
        ]
      });
      setRuleEditMode(false);
      setEditingRuleId(null);
      setOriginalRuleValues(null);
      
      // Refresh the rule configuration data
      fetchRuleConfigData();
    },
    onError: (error) => {
      console.error("Edit Rule Config API Error:", error);
    }
  });

  // API call to edit geo configuration
  const editGeoConfigApi = useApiCall<string>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.EDIT_GEO_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Edit Geo Config API Response:", responseData);
      
      // Close modal and reset form
      setIsGeoModalOpen(false);
      setGeoForm({
        rows: [
          {
            parameter: "",
            value: "",
            selectGeo: [],
          }
        ]
      });
      setGeoEditMode(false);
      setEditingGeoId(null);
      setOriginalGeoValues(null);
      
      // Refresh the geo configuration data
      fetchGeoConfigData();
    },
    onError: (error) => {
      console.error("Edit Geo Config API Error:", error);
    }
  });

  // API call to delete rule configuration
  const deleteRuleConfigApi = useApiCall<string>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.DELETE_RULE_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Delete Rule Config API Response:", responseData);
      
      // Refresh the rule configuration data
      fetchRuleConfigData();
    },
    onError: (error) => {
      console.error("Delete Rule Config API Error:", error);
    }
  });

  // API call to delete geo configuration
  const deleteGeoConfigApi = useApiCall<string>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.DELETE_GEO_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Delete Geo Config API Response:", responseData);
      
      // Refresh the geo configuration data
      fetchGeoConfigData();
    },
    onError: (error) => {
      console.error("Delete Geo Config API Error:", error);
    }
  });

  // Trigger API call on component mount
  useEffect(() => {
    console.log("useEffect selectedPackage:", selectedPackage);
    if (selectedPackage) {
      if (thresholdToleranceApi.type === "mutation") {
        thresholdToleranceApi.result.mutateAsync({
          package_name: selectedPackage,
        });
      }
      fetchRuleConfigData();
      fetchGeoConfigData();
      fetchConfigParameters();
      fetchCountries();
    }
  }, [selectedPackage]);

  // Function to fetch rule configuration data
  const fetchRuleConfigData = () => {
    console.log("fetchRuleConfigData selectedPackage:", selectedPackage);
    if (ruleConfigApi.type === "mutation" && selectedPackage) {
      const payload: RuleConfigPayload = {
        package_name: selectedPackage,
        page_number: ruleCurrentPage,
        record_limit: itemsPerPage
      };
      console.log("Rule Config Payload:", payload);
      ruleConfigApi.result.mutateAsync(payload);
    }
  };

  // Function to fetch configuration parameters
  const fetchConfigParameters = () => {
    console.log("fetchConfigParameters selectedPackage:", selectedPackage);
    if (configParametersApi.type === "mutation" && selectedPackage) {
      const payload = {
        package_name: selectedPackage
      };
      console.log("Config Parameters Payload:", payload);
      configParametersApi.result.mutateAsync(payload);
    }
  };

  // Function to fetch countries
  const fetchCountries = () => {
    console.log("fetchCountries selectedPackage:", selectedPackage);
    if (countriesApi.type === "mutation" && selectedPackage) {
      const payload = {
        package_name: selectedPackage
      };
      console.log("Countries Payload:", payload);
      countriesApi.result.mutateAsync(payload);
    }
  };

  // Function to fetch geo configuration data
  const fetchGeoConfigData = () => {
    console.log("fetchGeoConfigData selectedPackage:", selectedPackage);
    if (geoConfigApi.type === "mutation" && selectedPackage) {
      const payload: GeoConfigPayload = {
        package_name: selectedPackage,
       
        page_number: geoCurrentPage,
        record_limit: itemsPerPage
      };
      console.log("Geo Config Payload:", payload);
      geoConfigApi.result.mutateAsync(payload);
    }
  };

  // Table data
  const [ruleConfigData, setRuleConfigData] = useState<RuleConfigItem[]>([]);
  const [ruleTotalPages, setRuleTotalPages] = useState(1);

  const [geoConfigData, setGeoConfigData] = useState<GeoConfigItem[]>([]);
  const [geoTotalPages, setGeoTotalPages] = useState(1);

  // Modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isGeoModalOpen, setIsGeoModalOpen] = useState(false);

  // Edit mode state
  const [ruleEditMode, setRuleEditMode] = useState(false);
  const [geoEditMode, setGeoEditMode] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingGeoId, setEditingGeoId] = useState<number | null>(null);

  // State to track original values for edit API
  const [originalRuleValues, setOriginalRuleValues] = useState<{
    parameter: string;
    value: string;
    threshold: string;
  } | null>(null);

  // State to track original values for edit API
  const [originalGeoValues, setOriginalGeoValues] = useState<{
    parameter: string;
    value: string;
    allowed_geo: string;
  } | null>(null);

  // Form state for Rule Configuration
  const [ruleForm, setRuleForm] = useState({
    rows: [
      {
        configurationParameter: "",
        value: "",
        whitelistThreshold: "",
      }
    ]
  });

  // Form state for Geo Configuration
  const [geoForm, setGeoForm] = useState({
    rows: [
      {
        parameter: "",
        value: "",
        selectGeo: [] as string[],
      }
    ]
  });

  // Filter countries based on search term
  const filteredCountries = countries;

  // Search terms for tables
  const [ruleSearchTerm, setRuleSearchTerm] = useState("");
  const [geoSearchTerm, setGeoSearchTerm] = useState("");

  // Pagination state
  const [ruleCurrentPage, setRuleCurrentPage] = useState(1);
  const [geoCurrentPage, setGeoCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Delete confirmation dialog state
  const [ruleDeleteDialogOpen, setRuleDeleteDialogOpen] = useState(false);
  const [geoDeleteDialogOpen, setGeoDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<Record<string, string | number> | null>(null);
  const [geoToDelete, setGeoToDelete] = useState<Record<string, string | number> | null>(null);

  // Note: Server-side pagination is used, so no client-side filtering needed

  // Reset pagination when search terms change and refetch data when page changes
  React.useEffect(() => {
    setRuleCurrentPage(1);
  }, [ruleSearchTerm]);

  React.useEffect(() => {
    setGeoCurrentPage(1);
  }, [geoSearchTerm]);

  // Refetch data when page changes
  React.useEffect(() => {
    if (selectedPackage) {
      fetchRuleConfigData();
    }
  }, [ruleCurrentPage, selectedPackage]);

  React.useEffect(() => {
    if (selectedPackage) {
      fetchGeoConfigData();
    }
  }, [geoCurrentPage, selectedPackage]);

  const handleSaveConfiguration = () => {
    console.log("handleSaveConfiguration selectedPackage:", selectedPackage);

    const frequency = parseInt(frequencyCapping);
   
    if (!selectedPackage) {
      console.error("selectedPackage is not available");
      return;
    }

    // Prepare payload for API
    const payload: UpdateThresholdTolerancePayload = {
      package_name: selectedPackage,
      frequency: frequency,
      tolerance: fraudTolerance,
      blocked: isBlocked,
    };

    console.log("Save Configuration Payload:", payload);
    
    // Make API call to save the configuration
    if (updateThresholdToleranceApi.type === "mutation") {
      updateThresholdToleranceApi.result.mutateAsync(payload);
    }
  };

  // Table column definitions
  const ruleConfigColumns = [
    { title: "Rule Configuration", key: "rule_configuration" },
    { title: "Whitelist Count", key: "whitelist_count" },
    { title: "Whitelist Threshold", key: "whitelist_threshold" },
  ];

  const geoConfigColumns = [
    { title: "Campaign Parameter", key: "campaign_parameter" },
    { title: "Value of Parameter", key: "parameter_value" },
    { title: "Allowed Geo", key: "allowed_geo" },
  ];

  // Handler functions
  const handleEditRule = (item: Record<string, string | number>) => {
    const ruleConfig = item.rule_configuration as string;
    const [parameter, value] = ruleConfig.split(":");

    // Store original values for edit API
    setOriginalRuleValues({
      parameter: parameter,
      value: value,
      threshold: item.whitelist_threshold.toString(),
    });

    setRuleForm({
      rows: [
        {
          configurationParameter: parameter,
          value: value,
          whitelistThreshold: item.whitelist_threshold.toString(),
        }
      ]
    });

    setEditingRuleId(Number(item.id));
    setRuleEditMode(true);
    setIsRuleModalOpen(true);
  };

  const handleDeleteRule = (item: Record<string, string | number>) => {
    console.log("handleDeleteRule selectedPackage:", selectedPackage);
    
    if (!selectedPackage) {
      console.error("selectedPackage is not available");
      return;
    }
    
    // Set the item to delete and open confirmation dialog
    setRuleToDelete(item);
    setRuleDeleteDialogOpen(true);
  };

  const confirmDeleteRule = () => {
    if (!ruleToDelete || !selectedPackage) {
      return;
    }
    
    const ruleConfig = ruleToDelete.rule_configuration as string;
    const [parameter, value] = ruleConfig.split(":");
    
    // Prepare payload for delete API
    const deletePayload = {
      package_name: selectedPackage,
      delete_value: {
        parameter: parameter,
        value: value,
        threshold: ruleToDelete.whitelist_threshold.toString()
      }
    };

    console.log("Delete Rule Payload:", deletePayload);

    if (deleteRuleConfigApi.type === "mutation") {
      deleteRuleConfigApi.result.mutateAsync(deletePayload);
    }
    
    // Close dialog and reset state
    setRuleDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const handleEditGeo = (item: Record<string, string | number>) => {
    // Store original values for edit API
    setOriginalGeoValues({
      parameter: item.campaign_parameter as string,
      value: item.parameter_value.toString(),
      allowed_geo: item.allowed_geo as string,
    });

    // Handle the allowed_geo value - check if it's "all" or individual countries
    let geoArray: string[] = [];
    if (item.allowed_geo === "all") {
      // If it's "all", select all available countries
      geoArray = countries.map(country => country.value);
    } else {
      // Split the allowed_geo string into an array for individual countries
      geoArray = (item.allowed_geo as string).split(',').map(geo => geo.trim()).filter(geo => geo);
    }

    setGeoForm({
      rows: [
        {
          parameter: item.campaign_parameter as string,
          value: item.parameter_value.toString(),
          selectGeo: geoArray,
        }
      ]
    });

    setEditingGeoId(Number(item.id));
    setGeoEditMode(true);
    setIsGeoModalOpen(true);
  };

  const handleDeleteGeo = (item: Record<string, string | number>) => {
    console.log("handleDeleteGeo selectedPackage:", selectedPackage);
    
    if (!selectedPackage) {
      console.error("selectedPackage is not available");
      return;
    }
    
    // Set the item to delete and open confirmation dialog
    setGeoToDelete(item);
    setGeoDeleteDialogOpen(true);
  };

  const confirmDeleteGeo = () => {
    if (!geoToDelete || !selectedPackage) {
      return;
    }
    
    // Prepare payload for delete API
    const deletePayload = {
      package_name: selectedPackage,
      delete_value: {
        parameter: geoToDelete.campaign_parameter as string,
        value: geoToDelete.parameter_value.toString(),
        allowed_geo: geoToDelete.allowed_geo as string
      }
    };

    console.log("Delete Geo Payload:", deletePayload);

    if (deleteGeoConfigApi.type === "mutation") {
      deleteGeoConfigApi.result.mutateAsync(deletePayload);
    }
    
    // Close dialog and reset state
    setGeoDeleteDialogOpen(false);
    setGeoToDelete(null);
  };

  // Functions to manage rule rows
  const addRuleRow = () => {
    setRuleForm(prev => ({
      rows: [...prev.rows, {
        configurationParameter: "",
        value: "",
        whitelistThreshold: "",
      }]
    }));
  };

  const removeRuleRow = (index: number) => {
    setRuleForm(prev => ({
      rows: prev.rows.filter((_, i) => i !== index)
    }));
  };

  const updateRuleRow = (index: number, field: string, value: string) => {
    setRuleForm(prev => ({
      rows: prev.rows.map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const handleAddRule = () => {
    setRuleForm({
      rows: [
        {
          configurationParameter: "",
          value: "",
          whitelistThreshold: "",
        }
      ]
    });
    setRuleEditMode(false);
    setEditingRuleId(null);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = () => {
    console.log("handleSaveRule selectedPackage:", selectedPackage);
    
    // Validate all rows
    const isValid = ruleForm.rows.every(row => 
      row.configurationParameter && row.value && row.whitelistThreshold
    );

    if (!isValid) {
      // You can add toast notification here for validation
      return;
    }

    if (!selectedPackage) {
      console.error("selectedPackage is not available");
      return;
    }

    if (ruleEditMode && editingRuleId && originalRuleValues) {
      // Update existing rule - using first row for now
      const firstRow = ruleForm.rows[0];
      
      // Prepare payload for edit API
      const editPayload = {
        package_name: selectedPackage,
        old_value: {
          parameter: originalRuleValues.parameter,
          value: originalRuleValues.value,
          threshold: originalRuleValues.threshold
        },
        new_value: {
          parameter: firstRow.configurationParameter,
          value: firstRow.value,
          threshold: firstRow.whitelistThreshold
        }
      };

      console.log("Edit Rule Payload:", editPayload);

      if (editRuleConfigApi.type === "mutation") {
        editRuleConfigApi.result.mutateAsync(editPayload);
      }
    } else {
      // Create new rules - call API
      const payload = {
        package_name: selectedPackage,
       
        update_data: ruleForm.rows.map(row => ({
          parameter: row.configurationParameter,
          value: row.value,
          threshold: row.whitelistThreshold
        }))
      };

      console.log("Add Rule Payload:", payload);

      if (addRuleConfigApi.type === "mutation") {
        addRuleConfigApi.result.mutateAsync(payload);
      }
    }
  };

  const handleCancelRule = () => {
    setIsRuleModalOpen(false);
    setRuleForm({
      rows: [
        {
          configurationParameter: "",
          value: "",
          whitelistThreshold: "",
        }
      ]
    });
    setRuleEditMode(false);
    setEditingRuleId(null);
    setOriginalRuleValues(null);
  };

  // Functions to manage geo rows
  const addGeoRow = () => {
    setGeoForm(prev => ({
      rows: [...prev.rows, {
        parameter: "",
        value: "",
        selectGeo: [],
      }]
    }));
  };

  const removeGeoRow = (index: number) => {
    setGeoForm(prev => ({
      rows: prev.rows.filter((_, i) => i !== index)
    }));
  };

  const updateGeoRow = (index: number, field: string, value: string | string[]) => {
    console.log(`updateGeoRow - index: ${index}, field: ${field}, value:`, value);
    setGeoForm(prev => ({
      rows: prev.rows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const handleAddGeo = () => {
    setGeoForm({ 
      rows: [
        {
          parameter: "", 
          value: "", 
          selectGeo: [] 
        }
      ]
    });
    setGeoEditMode(false);
    setEditingGeoId(null);
    setIsGeoModalOpen(true);
  };

  const handleSaveGeo = () => {
    console.log("handleSaveGeo selectedPackage:", selectedPackage);
    console.log("geoForm.rows:", geoForm.rows);
    
    // Validate all rows - only require countries to be selected
    const isValid = geoForm.rows.every(row => 
      row.selectGeo.length > 0
    );

    if (!isValid) {
      console.error("Validation failed: Some rows don't have countries selected");
      // You can add toast notification here for validation
      return;
    }

    if (!selectedPackage) {
      console.error("selectedPackage is not available");
      return;
    }

         // Helper function to determine if all countries are selected
     const getAllowedGeoValue = (selectedCountries: string[]) => {
       // Check if all available countries are selected
       const allAvailableCountries = countries.map(country => country.value);
       const isAllCountriesSelected = allAvailableCountries.every(country => 
         selectedCountries.includes(country)
       );
       
       if (isAllCountriesSelected) {
         return "all"; // Send ["all"] when all countries are selected
       } else {
         return selectedCountries.join(','); // Send individual countries joined by comma
       }
     };

    if (geoEditMode && editingGeoId && originalGeoValues) {
      // Update existing geo configuration - using first row for now
      const firstRow = geoForm.rows[0];
      
      // Log the selected countries for debugging
      console.log("Selected countries for edit:", firstRow.selectGeo);
      console.log("All available countries:", countries.map(c => c.value));
      console.log("Is all countries selected:", firstRow.selectGeo.length === countries.length);
      
      const allowedGeoValue = getAllowedGeoValue(firstRow.selectGeo);
      console.log("Final allowed_geo value:", allowedGeoValue);
      
      // Prepare payload for edit API
      const editPayload = {
        package_name: selectedPackage,
        old_value: {
          parameter: originalGeoValues.parameter,
          value: originalGeoValues.value,
          allowed_geo: originalGeoValues.allowed_geo
        },
        new_value: {
          parameter: firstRow.parameter || "",
          value: firstRow.value || "",
          allowed_geo: allowedGeoValue
        }
      };

      console.log("Edit Geo Payload:", editPayload);

      if (editGeoConfigApi.type === "mutation") {
        editGeoConfigApi.result.mutateAsync(editPayload);
      }
    } else {
      // Create new geo configurations - call API
      const payload = {
        package_name: selectedPackage,
       
        update_data: geoForm.rows.map(row => {
          // Log each row's selected countries
          console.log(`Row countries:`, row.selectGeo);
          console.log(`All available countries:`, countries.map(c => c.value));
          console.log(`Is all countries selected for this row:`, row.selectGeo.length === countries.length);
          
          const allowedGeoValue = getAllowedGeoValue(row.selectGeo);
          console.log(`Final allowed_geo value for this row:`, allowedGeoValue);
          
          return {
            parameter: row.parameter || "",
            value: row.value || "",
            allowed_geo: allowedGeoValue
          };
        })
      };

      console.log("Add Geo Payload:", payload);

      if (addGeoConfigApi.type === "mutation") {
        addGeoConfigApi.result.mutateAsync(payload);
      }
    }
  };

  const handleCancelGeo = () => {
    setIsGeoModalOpen(false);
    setGeoForm({ 
      rows: [
        {
          parameter: "", 
          value: "", 
          selectGeo: [] 
        }
      ]
    });
    setGeoEditMode(false);
    setEditingGeoId(null);
    setOriginalGeoValues(null);
  };




  const handleGeoTableRefresh = () => {
    setGeoSearchTerm("");
    setGeoCurrentPage(1);
    fetchGeoConfigData();
  };

  return (
    <div className="mt-2">
      <div className="w-full bg-gray-200 text-sub-header font-semibold text-center sm:text-body p-2">
        Rule & Geo Configuration
      </div>
      {/* Configuration Section */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-6">
          {thresholdToleranceApi.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              
            </div>
          ) : 
            
         (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-center">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
                  Frequency Capping (in days)
                </label>
                <Input
                  value={frequencyCapping}
                  onChange={(e) => setFrequencyCapping(e.target.value)}
                  placeholder="Enter frequency capping"
                  className="w-full text-sm"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
                  Fraud Tolerance
                </label>
                <Select
                  value={fraudTolerance}
                  onValueChange={setFraudTolerance}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select fraud tolerance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1 flex flex-row  items-start sm:items-center lg:items-start justify-between gap-1 mt-4">
                <div className="flex items-center gap-4 w-full sm:w-auto mt-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-white">
                    Blocked
                  </span>
                  <Switch
                    checked={isBlocked}
                    onCheckedChange={setIsBlocked}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <Button
                  onClick={handleSaveConfiguration}
                  className="w-full sm:w-auto dark:text-white rounded-md"
                  size="sm"
                  disabled={updateThresholdToleranceApi.loading}
                >
                  {updateThresholdToleranceApi.loading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-1 sm:gap-2 mt-2">
        {/* Rule Configuration Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4  gap-3 sm:gap-0">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Rule Configuration
              </CardTitle>
             
            </div>
            <div className="p-2 sm:p-4 flex flex-col">
              <div className="flex-1 ">
                <ResizableTable
                  columns={ruleConfigColumns}
                  data={ruleConfigData}
                  isPaginated={false}
                  isSearchable={true}
                  SearchTerm={ruleSearchTerm}
                  setSearchTerm={setRuleSearchTerm}
                  headerColor="#f8f9fa"
                  isSelectable={false}
                  totalPages={ruleTotalPages}
                  pageNo={ruleCurrentPage}
                  onPageChangeP={setRuleCurrentPage}
                  onLimitChange={(newLimit) =>
                    console.log("Limit changed:", newLimit)
                  }
                  isFile={false}
                  isDownload={false}
                  isTableDownload={false}
                  isEdit={true}
                  isDelete={true}
                  onEdit={handleEditRule}
                  onDelete={handleDeleteRule}
                  isView={false}
                  isClone={false}
                  isSend={false}
                  isPause={false}
                  isPlay={false}
                  isUserTable={false}
                  isRuleConfiguration={true}
                  handleAddRuleConfiguration={handleAddRule}
                  height={300}
                  isLoading={ruleConfigApi.loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geo Configuration Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4  gap-3 sm:gap-0">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Geo Configuration
              </CardTitle>
           
            </div>
            <div className="p-2 sm:p-4 flex flex-col">
              <div className="flex-1">
               
                  <ResizableTable
                    columns={geoConfigColumns}
                    data={geoConfigData}
                    isPaginated={true}
                    isSearchable={true}
                    SearchTerm={geoSearchTerm}
                    setSearchTerm={setGeoSearchTerm}
                    headerColor="#f8f9fa"
                    isSelectable={false}
                    totalPages={geoTotalPages}
                    pageNo={geoCurrentPage}
                    onPageChangeP={setGeoCurrentPage}
                    onLimitChange={(newLimit) =>
                      console.log("Limit changed:", newLimit)
                    }
                    onRefresh={handleGeoTableRefresh}
                    isRefetch={false}
                    isFile={false}
                    isDownload={false}
                    isTableDownload={false}
                    isEdit={true}
                    isDelete={true}
                    onEdit={handleEditGeo}
                    onDelete={handleDeleteGeo}
                    isView={false}
                    isClone={false}
                    isSend={false}
                    isPause={false}
                    isPlay={false}
                    isUserTable={false}
                    isGeoConfiguration={true}
                    handleAddGeoConfiguration={handleAddGeo}
                    height={300}
                    isLoading={geoConfigApi.loading}
                  />
              
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rule Configuration Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-sm font-semibold text-gray-900">
              {ruleEditMode
                ? "Edit Rule Configuration"
                : "Rule Configuration"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 ">
            <div className="space-y-4">
              <div className="flex justify-end items-center">
                <Button
                  type="button"
                  onClick={addRuleRow}
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {ruleForm?.rows?.map((row, index) => (
                <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
                  {/* Configuration Parameter */}
                  <div className="flex-1">
                    <Label
                      htmlFor={`configurationParameter-${index}`}
                      className="text-sm font-medium text-gray-700 mb-1 block"
                    >
                      Configuration Parameter
                    </Label>
                    <Select
                      value={row.configurationParameter}
                      onValueChange={(value) =>
                        updateRuleRow(index, "configurationParameter", value)
                      }
                      disabled={configParametersApi.loading || ruleEditMode}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue 
                          placeholder={
                            configParametersApi.loading 
                              ? "Loading..." 
                              : "Select..."
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {configParameters?.length > 0 ? (
                          configParameters.map((parameter) => (
                            <SelectItem key={parameter} value={parameter}>
                              {parameter}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-parameters" disabled>
                            No parameters available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value */}
                  <div className="flex-1">
                    <Label
                      htmlFor={`value-${index}`}
                      className="text-sm font-medium text-gray-700 mb-1 block"
                    >
                      Value
                    </Label>
                    <Input
                      id={`value-${index}`}
                      placeholder="Enter Value"
                      value={row.value}
                      onChange={(e) =>
                        updateRuleRow(index, "value", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Whitelist Threshold */}
                  <div className="flex-1">
                    <Label
                      htmlFor={`whitelistThreshold-${index}`}
                      className="text-sm font-medium text-gray-700 mb-1 block"
                    >
                      Whitelist Threshold
                    </Label>
                    <Input
                      id={`whitelistThreshold-${index}`}
                      placeholder="Enter Threshold"
                      value={row.whitelistThreshold}
                      onChange={(e) =>
                        updateRuleRow(index, "whitelistThreshold", e.target.value)
                      }
                      className="w-full"
                      // type="number"
                    />
                  </div>

                  {/* Action Icons */}
                  <div className="flex gap-2">
                    {ruleForm.rows.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeRuleRow(index)}
                        size="sm"
                        variant="outline"
                        className=""
                      >
                        {/* <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg> */}
                        <Trash2 className="h-3 w-3 text-primary" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleCancelRule}
              
              className="w-full sm:w-auto order-2 sm:order-1 rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              className="w-full sm:w-auto order-1 sm:order-2 rounded-md"
              disabled={ruleEditMode ? editRuleConfigApi.loading : addRuleConfigApi.loading}
            >
              {(ruleEditMode ? editRuleConfigApi.loading : addRuleConfigApi.loading) ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {ruleEditMode ? "Updating..." : "Saving..."}
                </>
              ) : (
                ruleEditMode ? "Update" : "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geo Configuration Modal */}
      <Dialog open={isGeoModalOpen} onOpenChange={setIsGeoModalOpen}>
        <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-sm font-semibold text-gray-900">
              {geoEditMode
                ? "Edit GEO Configuration"
                : "GEO Configuration"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <div className="flex justify-end items-center">
                <Button
                  type="button"
                  onClick={addGeoRow}
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {geoForm.rows.map((row, index) => (
                <div key={index} className="flex items-end gap-3 p-3 border rounded-lg mb-4">
                  {/* Parameter */}
                  <div className="flex-1">
                    <Label
                      htmlFor={`parameter-${index}`}
                      className="text-sm font-medium text-gray-700 mb-1 block"
                    >
                      Parameter
                    </Label>
                    <Select
                      value={row.parameter}
                      onValueChange={(value) =>
                        updateGeoRow(index, "parameter", value)
                      }
                      disabled={configParametersApi.loading || geoEditMode}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue 
                          placeholder={
                            configParametersApi.loading 
                              ? "Loading..." 
                              : "Select..."
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {configParameters?.length > 0 ? (
                          configParameters.map((parameter) => (
                            <SelectItem key={parameter} value={parameter}>
                              {parameter}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-parameters" disabled>
                            No parameters available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value */}
                  <div className="flex-1">
                    <Label
                      htmlFor={`geoValue-${index}`}
                      className="text-sm font-medium text-gray-700 mb-1 block"
                    >
                      Value (Optional)
                    </Label>
                    <Input
                      id={`geoValue-${index}`}
                      placeholder="Enter Value"
                      value={row.value}
                      onChange={(e) =>
                        updateGeoRow(index, "value", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Select GEO */}
                  <div className="flex-1">
                    <Label
                      htmlFor={`selectGeo-${index}`}
                      className="text-sm font-medium text-gray-700 mb-1 block"
                    >
                      Select GEO
                    </Label>
                                         <MultipleSelect
                       options={filteredCountries.map(country => country.value)}
                       selectedValues={row.selectGeo}
                       onSelectionChange={(selectedValues) => updateGeoRow(index, "selectGeo", selectedValues)}
                       placeholder="Select Country"
                       searchable={true}
                       searchPlaceholder="Search countries..."
                     />
                  </div>

                  {/* Action Icons */}
                  <div className="flex gap-2">
                    {geoForm.rows.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeGeoRow(index)}
                        size="sm"
                        variant="outline"
                        className=""
                      >
                       <Trash2 className="h-3 w-3 text-primary" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleCancelGeo}
            
              className="w-full sm:w-auto order-2 sm:order-1 rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGeo}
              className="w-full sm:w-auto order-1 sm:order-2 rounded-md"
              disabled={geoEditMode ? editGeoConfigApi.loading : addGeoConfigApi.loading}
            >
              {(geoEditMode ? editGeoConfigApi.loading : addGeoConfigApi.loading) ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {geoEditMode ? "Updating..." : "Saving..."}
                </>
              ) : (
                geoEditMode ? "Update" : "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Delete Confirmation Dialog */}
      <Dialog open={ruleDeleteDialogOpen} onOpenChange={setRuleDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this rule configuration?
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRuleDeleteDialogOpen(false)}
              disabled={deleteRuleConfigApi.loading}
              className="text-white bg-primary hover:bg-primary rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteRule}
              disabled={deleteRuleConfigApi.loading}
              className="text-white bg-primary hover:bg-primary"
            >
              {deleteRuleConfigApi.loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geo Delete Confirmation Dialog */}
      <Dialog open={geoDeleteDialogOpen} onOpenChange={setGeoDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this geo configuration?
          </div>
          <DialogFooter>
            <Button
              onClick={() => setGeoDeleteDialogOpen(false)}
              disabled={deleteGeoConfigApi.loading}
              className="text-white bg-primary hover:bg-primary rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteGeo}
              disabled={deleteGeoConfigApi.loading}
              className="text-white bg-primary hover:bg-primary"
            >
              {deleteGeoConfigApi.loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RuleGeoConfigurationComponent; 