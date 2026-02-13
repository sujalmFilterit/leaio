"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Pencil, Plus, Eye, Edit, Loader2, Trash2, X } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import MultipleSelect from "@/components/ui/multiple-select";
import { MFSingleSelect } from "@/components/mf/MFSingleSelect";
import ResizableTable from "@/components/mf/ReportingToolTable";
import { useApiCall } from "@/app/(main)/webfraud/queries/api_base";
import { usePackage } from "@/components/mf/PackageContext";
import { MdEdit } from "react-icons/md";
import Endpoint from "../common/endpoint";

interface CustomConfigResponse {
  fraud_threshold: number;
  target_url: string;
  target_blocked_url: string;
  redirection_status: boolean;
}

interface ConfigSummaryItem {
  rule_name: string;
  status: boolean;
  whitelist_configuration: Array<{ event_path: string }>;
  rule_configuration: Record<string, any>;
}

interface ConfigSummaryResponse {
  data: ConfigSummaryItem[];
  total: number;
  page_number: number;
  record_limit: number;
  total_pages: number;
}

interface MappingConfigItem {
  source: string;
  target: string;
}

interface MappingConfigResponse extends Array<MappingConfigItem> {}

interface CountryOption {
  value: string;
  label: string;
}

const CustomConfiguration = () => {
  const { selectedPackage } = usePackage();
  
  // API state
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Configuration fields state - simplified to just 4 fields
  const [config, setConfig] = useState({
    fraudThreshold: "",
    targetUrl: "",
    targetBlockUrl: "",
    redirection: false
  });

  // Single editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | boolean>("");
  const [limit, setLimit] = useState(10);

  // Validation state management
  const [validationErrors, setValidationErrors] = useState<{
    ruleForm: {
      ruleName?: string;
      status?: string;
    };
    mappingForm: {
      source?: string;
      target?: string;
    };
    newKeyValues: {
      [key: string]: string | undefined;
    };
    selectedCountries?: string;
  }>({
    ruleForm: {},
    mappingForm: {},
    newKeyValues: {},
  });

  // Validation functions
  const validateRuleForm = (): boolean => {
    const errors: { ruleName?: string; status?: string } = {};
    
    if (!ruleForm.ruleName?.trim()) {
      errors.ruleName = "Rule name is required";
    } else if (ruleForm.ruleName.trim().length < 3) {
      errors.ruleName = "Rule name must be at least 3 characters";
    }
    
    if (!ruleForm.status) {
      errors.status = "Status is required";
    }
    
    setValidationErrors(prev => ({
      ...prev,
      ruleForm: errors
    }));
    
    return Object.keys(errors).length === 0;
  };

  const validateMappingForm = (): boolean => {
    const errors: { source?: string; target?: string } = {};
    
    if (!mappingForm.source?.trim()) {
      errors.source = "Source is required";
    }
    
    if (!mappingForm.target?.trim()) {
      errors.target = "Target is required";
    }
    
    setValidationErrors(prev => ({
      ...prev,
      mappingForm: errors
    }));
    
    return Object.keys(errors).length === 0;
  };

  const validateNewKeyValues = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    // If we're in edit mode, allow empty configuration (user can delete all items)
    const isEditMode = editMode;
    
    // Validate based on rule type
    if (ruleForm.ruleName === "mf_rule_incorrect_region_country" || ruleForm.ruleName === "mf_rule_redirect") {
      // Validate parameterCountryRows (for specific rules)
      // Allow empty parameterCountryRows if in edit mode (user can delete all)
      if (parameterCountryRows.length === 0 && !isEditMode) {
        errors['general'] = "At least one parameter block is required";
      } else {
        parameterCountryRows.forEach((row) => {
          // Individual field validation for parameterCountryRows
          if (!row.parameter) {
            errors[`${row.id}_parameter`] = "Parameter is required";
          }
          
          if (!row.value?.trim()) {
            errors[`${row.id}_value`] = "Value is required";
          }
          
          // Validate countries for mf_rule_incorrect_region_country
          if (ruleForm.ruleName === "mf_rule_incorrect_region_country" && row.countries.length === 0) {
            errors[`${row.id}_countries`] = "At least one country is required";
          }
          
          // Validate threshold for mf_rule_redirect
          if (ruleForm.ruleName === "mf_rule_redirect" && !row.threshold?.trim()) {
            errors[`${row.id}_threshold`] = "Threshold is required";
          }
        });
      }
    } else {
      // Validate configurationBlocks (for multi-parameter rules)
      // Allow empty configurationBlocks if in edit mode (user can delete all)
      if (configurationBlocks.length === 0 && !isEditMode) {
        errors['general'] = "At least one configuration block is required";
      } else {
        configurationBlocks.forEach((block) => {
          if (block.parameters.length === 0) {
            errors[block.id] = "At least one parameter is required";
          } else {
            block.parameters.forEach((param) => {
              if (!block.values[param]?.trim()) {
                errors[`${block.id}_${param}`] = `${param} value is required`;
              }
            });
          }
        });
      }
    }
    
    setValidationErrors(prev => ({
      ...prev,
      newKeyValues: errors
    }));
    
    return Object.keys(errors).length === 0;
  };

  const validateSelectedCountries = (): boolean => {
    // This function is now handled within validateNewKeyValues for comprehensive validation
    // Keeping it for backward compatibility but it's no longer needed for the new structure
    return true;
  };

  const clearValidationErrors = (formType?: 'ruleForm' | 'mappingForm' | 'newKeyValues' | 'selectedCountries') => {
    if (formType) {
      setValidationErrors(prev => ({
        ...prev,
        [formType]: formType === 'newKeyValues' ? {} : undefined
      }));
    } else {
      setValidationErrors({
        ruleForm: {},
        mappingForm: {},
        newKeyValues: {},
      });
    }
  };

  // Helper function to add new configuration block
  const addConfigurationBlock = () => {
    const newBlock = {
      id: Date.now().toString(),
      parameters: [],
      values: {},
      countries: [],
      threshold: ""
    };
    setConfigurationBlocks(prev => [...prev, newBlock]);
  };

  // Helper function to remove configuration block
  const removeConfigurationBlock = (blockId: string) => {
    setConfigurationBlocks(prev => prev.filter(block => block.id !== blockId));
  };

  // Helper function to update configuration block parameters
  const updateBlockParameters = (blockId: string, parameters: string[]) => {
    setConfigurationBlocks(prev => prev.map(block => {
      if (block.id === blockId) {
        // Remove values for parameters that are no longer selected
        const newValues = { ...block.values };
        Object.keys(newValues).forEach(key => {
          if (!parameters.includes(key)) {
            delete newValues[key];
          }
        });
        
        return {
          ...block,
          parameters,
          values: newValues
        };
      }
      return block;
    }));
  };

  // Helper function to update configuration block value
  const updateBlockValue = (blockId: string, parameter: string, value: string) => {
    setConfigurationBlocks(prev => prev.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          values: {
            ...block.values,
            [parameter]: value
          }
        };
      }
      return block;
    }));
  };

  // API call for getting custom configuration
  const getCustomConfigApi = useApiCall<CustomConfigResponse>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/get_custom_config",
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.GET_CUSTOM_CONFIG,
    method: "POST",
    params: {
      package_name: selectedPackage
    },
    manual: false,
    onSuccess: (responseData) => {
      console.log("Get Custom Config API Response:", responseData);
      setApiError(null);
      
      // Update config with API response
      if (responseData) {
        setConfig({
          fraudThreshold: responseData.fraud_threshold.toString(),
          targetUrl: responseData.target_url,
          targetBlockUrl: responseData.target_blocked_url,
          redirection: responseData.redirection_status
        });
      }
    },
    onError: (error) => {
      console.error("Get Custom Config API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to load custom configuration";
      setApiError(errorMessage);
    }
  });

  // API call for editing custom configuration
  const editCustomConfigApi = useApiCall<string>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/edit_custom_config",
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.EDIT_CUSTOM_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Edit Custom Config API Response:", responseData);
      setApiError(null);
      
      
      // Exit editing mode on successful save
      setEditingField(null);
      setEditingValue("");
    },
    onError: (error) => {
      console.error("Edit Custom Config API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to update configuration";
      setApiError(errorMessage);
    }
  });

  // API call for getting config summary
  const getConfigSummaryApi = useApiCall<ConfigSummaryResponse>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/get_custom_config_summary",
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.GET_CUSTOM_CONFIG_SUMMARY,
    method: "POST",
   
    manual: true,
    onSuccess: (responseData) => {
      console.log("Get Config Summary API Response:", responseData);
      setApiError(null);
      
      if (responseData) {
        // Transform API data to match table structure
        const transformedData = responseData.data.map((item, index) => ({
          id: index + 1,
          ruleName: item.rule_name,
          status: item.status ? "True" : "False",
          whitelistConfiguration: item.whitelist_configuration.length > 0 
            ? JSON.stringify(item.whitelist_configuration)
            : "",
          ruleConfiguration: JSON.stringify(item.rule_configuration),
        }));
        
        setConfigRulesData(transformedData);
        setTotalPages(responseData.total_pages);
        setTotalRecords(responseData.total);
      }
    },
    onError: (error) => {
      console.error("Get Config Summary API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to load config summary";
      setApiError(errorMessage);
    }
  });

  // API call for fetching configuration parameters
  const configParametersApi = useApiCall<string[]>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/get_config_parameters",
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

  // API call for editing custom configuration rule
  const editCustomConfigRuleApi = useApiCall<string>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/edit_custom_config_rule",
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.EDIT_CUSTOM_CONFIG_RULE,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Edit Custom Config Rule API Response:", responseData);
      setApiError(null);
      
      // Refresh the config summary data after successful update
      if (getConfigSummaryApi.type === "mutation") {
        getConfigSummaryApi.result.mutateAsync({
          package_name: selectedPackage,
          page_number: currentPage,
          record_limit: limit
        });
      }
    },
    onError: (error) => {
      console.error("Edit Custom Config Rule API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to update rule configuration";
      setApiError(errorMessage);
    }
  });

  // API call for getting mapping configuration
  const getMappingConfigApi = useApiCall<MappingConfigResponse>({
    url: process.env.NEXT_PUBLIC_APP_PERF + Endpoint.GET_MAPPING_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Get Mapping Config API Response:", responseData);
      setApiError(null);
      
      if (responseData) {
        // Transform API data to match table structure
        const transformedData = responseData.map((item, index) => ({
          id: index + 1,
          source: item.source,
          target: item.target,
        }));
        
        setMappingRulesData(transformedData);
      }
    },
    onError: (error) => {
      console.error("Get Mapping Config API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to load mapping configuration";
      setApiError(errorMessage);
    }
  });

  // API call for updating mapping configuration
  const updateMappingConfigApi = useApiCall<string>({
    url: process.env.NEXT_PUBLIC_APP_PERF + Endpoint.UPDATE_MAPPING_CONFIG,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Update Mapping Config API Response:", responseData);
      setApiError(null);
      
      // Close modal and refresh data
      setIsMappingModalOpen(false);
      setMappingForm({
        source: "",
        target: ""
      });
      setEditingMappingId(null);
      
      // Refresh mapping data
      if (getMappingConfigApi.type === "mutation") {
        getMappingConfigApi.result.mutateAsync({
          package_name: selectedPackage
        });
      }
    },
    onError: (error) => {
      console.error("Update Mapping Config API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to update mapping configuration";
      setApiError(errorMessage);
    }
  });

  // API call for fetching countries
  const countriesApi = useApiCall<CountryOption[]>({
    url: process.env.NEXT_PUBLIC_APP_PERF + Endpoint.GEO_COUNTRY_CODE,
    method: "POST",
    params: {},
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

  // Configuration Rules data from API
  const [configRulesData, setConfigRulesData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Mapping Rules data from API
  const [mappingRulesData, setMappingRulesData] = useState<any[]>([]);

  // Modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingMappingId, setEditingMappingId] = useState<number | null>(null);
  const [viewingRule, setViewingRule] = useState<any>(null);

  // Form state for Rule Configuration
  const [ruleForm, setRuleForm] = useState({
    ruleName: "",
    status: "False",
    whitelistConfiguration: "",
    ruleConfiguration: "",
  });

  // Form state for Mapping Configuration
  const [mappingForm, setMappingForm] = useState({
    source: "",
    target: ""
  });

  // State for parsed rule configuration key-value pairs
  const [ruleConfigPairs, setRuleConfigPairs] = useState<{[key: string]: any}>({});
  
  // State for parsed whitelist configuration key-value pairs
  const [whitelistConfigPairs, setWhitelistConfigPairs] = useState<{[key: string]: any}>({});
  
  // State for add new key functionality
  const [showAddKeyMode, setShowAddKeyMode] = useState(false);
  const [newKeyValues, setNewKeyValues] = useState<{[key: string]: string}>({});
  
  // State for dynamic parameter-country rows
  const [parameterCountryRows, setParameterCountryRows] = useState<Array<{
    id: string;
    parameter: string;
    value: string;
    countries: string[];
    threshold?: string;
  }>>([]);
  
  // State for multiple configuration blocks
  const [configurationBlocks, setConfigurationBlocks] = useState<Array<{
    id: string;
    parameters: string[];
    values: {[key: string]: string};
    countries: string[];
    threshold?: string;
  }>>([]);
  
  // Configuration parameters state - replacing hardcoded availableKeys
  const [configParameters, setConfigParameters] = useState<string[]>([]);
  
  // Countries state
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'whitelist' | 'newConfig';
    key: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'whitelist',
    key: '',
    onConfirm: () => {}
  });
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  

  // Trigger API call when selectedPackage changes
  useEffect(() => {
    if (selectedPackage && getCustomConfigApi.type === "mutation") {
      getCustomConfigApi.result.mutateAsync({
        package_name: selectedPackage
      });
    }
  }, [selectedPackage]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Trigger config summary API call when component mounts or pagination changes
  useEffect(() => {
    if (getConfigSummaryApi.type === "mutation" && selectedPackage) {
      getConfigSummaryApi.result.mutateAsync({
        package_name: selectedPackage,
        page_number: currentPage,
        record_limit: limit,
        search_term: debouncedSearchTerm
      });
    }
  }, [currentPage, selectedPackage, debouncedSearchTerm, limit]);

  // Fetch configuration parameters when selectedPackage changes
  useEffect(() => {
    if (selectedPackage && configParametersApi.type === "mutation") {
      configParametersApi.result.mutateAsync({
        package_name: selectedPackage
      });
    }
  }, [selectedPackage]);

  // Fetch mapping configuration when selectedPackage changes
  useEffect(() => {
    if (selectedPackage && getMappingConfigApi.type === "mutation") {
      getMappingConfigApi.result.mutateAsync({
        package_name: selectedPackage
      });
    }
  }, [selectedPackage]);

  // Fetch countries when selectedPackage changes
  useEffect(() => {
    if (selectedPackage && countriesApi.type === "mutation") {
      countriesApi.result.mutateAsync({
        package_name: selectedPackage
      });
    }
  }, [selectedPackage]);

  // Reset pagination when search terms change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Table column definitions
  const configRulesColumns = [
    { title: "Rule Name", key: "ruleName" },
    { title: "Status", key: "status" },
    { title: "Whitelist Configuration", key: "whitelistConfiguration" },
    { title: "Rule Configuration", key: "ruleConfiguration" },
  ];

  // Mapping Rules table column definitions
  const mappingRulesColumns = [
    { title: "Source", key: "source" },
    { title: "Target", key: "target" },
  ];

  // Simplified edit handlers
  const handleStartEdit = (field: string) => {
    setEditingField(field);
    setEditingValue(config[field as keyof typeof config]);
    setApiError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;
    
    // Create updated config with the new value
    const updatedConfig = {
      ...config,
      [editingField]: editingValue
    };
    
    // Prepare payload for API
    const payload = {
      package_name: selectedPackage,
      config_type: "rule_config",
      update_data: {
        fraud_threshold: parseInt(updatedConfig.fraudThreshold) || 0,
        target_url: updatedConfig.targetUrl,
        target_blocked_url: updatedConfig.targetBlockUrl,
        redirection_status: updatedConfig.redirection
      }
    };
    
    try {
      if (editCustomConfigApi.type === "mutation") {
        await editCustomConfigApi.result.mutateAsync(payload);
        
        // Update local state only if API call succeeds
        setConfig(updatedConfig);
        console.log(`Successfully saved ${editingField}:`, editingValue);
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
      // Keep editing mode active on error so user can retry
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingValue("");
  };

  // Rule handlers
  const handleEditRule = (item: Record<string, string | number>) => {
    // Clear any previous API errors
    setApiError(null);
    
    setRuleForm({
      ruleName: item.ruleName as string,
      status: item.status as string,
      whitelistConfiguration: item.whitelistConfiguration as string,
      ruleConfiguration: item.ruleConfiguration as string,
    });
    
    // Initialize selected countries (you may need to get this from the API response)
    setSelectedCountries([]);
    
    // Initialize configuration blocks
    setConfigurationBlocks([]);

    // Parse rule configuration JSON into key-value pairs
    try {
      const parsedConfig = JSON.parse(item.ruleConfiguration as string || "{}");
      setRuleConfigPairs(parsedConfig);
    } catch (error) {
      console.error("Error parsing rule configuration:", error);
      setRuleConfigPairs({});
    }

    // Parse whitelist configuration JSON into key-value pairs
    try {
      const parsedWhitelist = JSON.parse(item.whitelistConfiguration as string || "[]");
      // Convert array of objects to single object with key-value pairs
      const configPairs: {[key: string]: any} = {};
      let extractedCountries: string[] = [];
      
      if (Array.isArray(parsedWhitelist)) {
        parsedWhitelist.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            // If it's an object, extract its key-value pairs
            Object.entries(item).forEach(([key, value]) => {
              if (key === 'country' && Array.isArray(value)) {
                // Extract countries from the first item (they should be common across all)
                if (index === 0) {
                  extractedCountries = value;
                }
                // Store country information in configPairs for display
                const countryKeyName = parsedWhitelist.length > 1 ? `country_${index}` : 'country';
                configPairs[countryKeyName] = value;
              } else {
                // Only add index suffix if there are multiple items in the array
                const keyName = parsedWhitelist.length > 1 ? `${key}_${index}` : key;
                configPairs[keyName] = value;
              }
            });
          } else {
            // If it's a primitive value, use index as key
            const keyName = parsedWhitelist.length > 1 ? `item_${index}` : `item`;
            configPairs[keyName] = item;
          }
        });
      } else if (typeof parsedWhitelist === 'object' && parsedWhitelist !== null) {
        // If it's already an object, use it directly
        Object.assign(configPairs, parsedWhitelist);
      }
      
      setWhitelistConfigPairs(configPairs);
      setSelectedCountries(extractedCountries);
      
      // Initialize configurationBlocks as empty for non-special rules
      // Don't populate with existing data to avoid duplication
      if (item.ruleName !== "mf_rule_incorrect_region_country" && item.ruleName !== "mf_rule_redirect") {
        setConfigurationBlocks([]);
      }
    } catch (error) {
      console.error("Error parsing whitelist configuration:", error);
      setWhitelistConfigPairs({});
      setSelectedCountries([]);
      setConfigurationBlocks([]);
    }

    setEditingRuleId(Number(item.id));
    setEditMode(true);
    setIsRuleModalOpen(true);
  };

  const handleViewRule = (item: Record<string, string | number>) => {
    setViewingRule(item);
    setIsViewModalOpen(true);
  };

  const handleSaveRule = async () => {
    console.log("handleSaveRule called - current whitelistConfigPairs:", whitelistConfigPairs);
    
    // Clear previous validation errors
    clearValidationErrors('ruleForm');
    clearValidationErrors('newKeyValues');
    clearValidationErrors('selectedCountries');
    
    // Validate all required fields
    const isRuleFormValid = validateRuleForm();
    const isNewKeyValuesValid = showAddKeyMode ? validateNewKeyValues() : true;
    const isCountriesValid = showAddKeyMode ? validateSelectedCountries() : true;
    
    if (!isRuleFormValid || !isNewKeyValuesValid || !isCountriesValid) {
      return;
    }
    
    if (!editMode && !ruleForm.ruleName) {
      return;
    }

    if (editMode && editingRuleId) {
      // Convert whitelist key-value pairs back to array format
      const whitelistArray: any[] = [];
      
      // Always add existing whitelist pairs with country array if present
      Object.entries(whitelistConfigPairs).forEach(([key, value]) => {
        // Check if key has index suffix
        const keyParts = key.split('_');
        const lastPart = keyParts[keyParts.length - 1];
        const hasIndexSuffix = !isNaN(parseInt(lastPart)) && keyParts.length > 1;
        
        if (hasIndexSuffix) {
          // Extract the original key name (remove the _index suffix)
          const originalKey = keyParts.slice(0, -1).join('_');
          const index = parseInt(lastPart);
          
          // Ensure array has enough elements
          while (whitelistArray.length <= index) {
            whitelistArray.push({});
          }
          
          // Add the key-value pair to the correct index
          whitelistArray[index][originalKey] = value;
          
          // If this is a country field and we have a country value, add it to the same object
          if (originalKey === 'country' && Array.isArray(value) && value.length > 0) {
            // The country value is already in the object, no need to add it again
          }
        } else {
          // No index suffix, add to first element
          if (whitelistArray.length === 0) {
            whitelistArray.push({});
          }
          whitelistArray[0][key] = value;
          
          // If this is a country field and we have a country value, add it to the same object
          if (key === 'country' && Array.isArray(value) && value.length > 0) {
            // The country value is already in the object, no need to add it again
          }
        }
      });
      
      // Add new key-value pairs based on rule name (only if showAddKeyMode is true)
      if (showAddKeyMode) {
        if (ruleForm.ruleName === "mf_rule_incorrect_region_country" || ruleForm.ruleName === "mf_rule_redirect") {
          // Use parameterCountryRows for special rules
          parameterCountryRows.forEach((row) => {
            if (row.value.trim()) {
              if (ruleForm.ruleName === "mf_rule_incorrect_region_country") {
                // For mf_rule_incorrect_region_country, include countries
                if (row.countries.length > 0) {
                  // Add country array to each new configuration item
                  whitelistArray.push({ 
                    [row.parameter]: row.value,
                    country: row.countries 
                  });
                }
              } else if (ruleForm.ruleName === "mf_rule_redirect") {
                // For mf_rule_redirect, include threshold if available
                const configItem: any = { [row.parameter]: row.value };
                if (row.threshold) {
                  configItem.threshold = row.threshold;
                }
                whitelistArray.push(configItem);
              }
            }
          });
        } else {
          // Use configurationBlocks for other rules
          // Only add new configuration blocks if they exist and have data
          if (configurationBlocks.length > 0) {
            configurationBlocks.forEach((block) => {
              if (block.parameters.length > 0) {
                const configItem: any = {};
                block.parameters.forEach((param) => {
                  if (block.values[param]?.trim()) {
                    configItem[param] = block.values[param];
                  }
                });
                if (Object.keys(configItem).length > 0) {
                  whitelistArray.push(configItem);
                }
              }
            });
          }
        }
      }
      
      // Ensure that if we're in edit mode and all existing items were deleted, 
      // we send an empty array (don't filter out empty objects in this case)
      const hasExistingItems = Object.keys(whitelistConfigPairs).length > 0;
      const hasNewItems = showAddKeyMode && (
        (ruleForm.ruleName === "mf_rule_incorrect_region_country" || ruleForm.ruleName === "mf_rule_redirect") 
          ? parameterCountryRows.some(row => row.value.trim() && (
              ruleForm.ruleName === "mf_rule_incorrect_region_country" 
                ? row.countries.length > 0 
                : true
            ))
          : configurationBlocks.some(block => block.parameters.length > 0)
      );
      
      console.log("handleSaveRule - hasExistingItems:", hasExistingItems);
      console.log("handleSaveRule - hasNewItems:", hasNewItems);
      console.log("handleSaveRule - ruleForm.ruleName:", ruleForm.ruleName);
      console.log("handleSaveRule - parameterCountryRows:", parameterCountryRows);
      
      // If we have no existing items and no new items, ensure we send an empty array
      const filteredWhitelistArray = (!hasExistingItems && !hasNewItems) 
        ? [] 
        : whitelistArray.filter(item => Object.keys(item).length > 0);
      
      console.log("handleSaveRule - whitelistConfigPairs:", whitelistConfigPairs);
      console.log("handleSaveRule - whitelistArray:", whitelistArray);
      console.log("handleSaveRule - filteredWhitelistArray:", filteredWhitelistArray);
      
      // Prepare payload for API
      const payload = {
        package_name: selectedPackage,
        rule_name: ruleForm.ruleName,
        update_data: {
          status: ruleForm.status === "True",
          whitelist_configuration: filteredWhitelistArray,
          rule_configuration: ruleConfigPairs
        }
      };
      
      console.log("handleSaveRule - final payload:", payload);
      

      
      try {
        if (editCustomConfigRuleApi.type === "mutation") {
          await editCustomConfigRuleApi.result.mutateAsync(payload);
          
          // Close modal and reset form only on successful API call
          setIsRuleModalOpen(false);
          clearValidationErrors(); // Clear all validation errors on successful save
          setRuleForm({
            ruleName: "",
            status: "False",
            whitelistConfiguration: "",
            ruleConfiguration: "",
          });
          setRuleConfigPairs({});
          setWhitelistConfigPairs({});
          setShowAddKeyMode(false);
          setParameterCountryRows([]);
          setConfigurationBlocks([]);
          setNewKeyValues({});
          setSelectedCountries([]); // Reset selected countries after successful save
          setEditMode(false);
          setEditingRuleId(null);
          
          console.log("Rule configuration updated successfully");
        }
      } catch (error) {
        console.error("Failed to update rule configuration:", error);
        // Keep modal open on error so user can retry
      }
    }
  };

  const handleCancelRule = () => {
    // Clear any API errors and validation errors
    setApiError(null);
    clearValidationErrors();
    
    setIsRuleModalOpen(false);
    setRuleForm({
      ruleName: "",
      status: "False",
      whitelistConfiguration: "",
      ruleConfiguration: "",
    });
    setRuleConfigPairs({});
    setWhitelistConfigPairs({});
    setShowAddKeyMode(false);
    setParameterCountryRows([]);
    setConfigurationBlocks([]);
    setNewKeyValues({});
    setSelectedCountries([]); // Reset selected countries
    setEditMode(false);
    setEditingRuleId(null);
  };

  // Mapping edit handlers
  const handleEditMapping = (item: Record<string, string | number>) => {
    // Clear any previous API errors
    setApiError(null);
    
    setMappingForm({
      source: item.source as string,
      target: item.target as string,
    });

    setEditingMappingId(Number(item.id));
    setIsMappingModalOpen(true);
  };

  const handleSaveMapping = async () => {
    // Clear previous validation errors
    clearValidationErrors('mappingForm');
    
    // Validate all required fields
    const isMappingFormValid = validateMappingForm();
    
    if (!isMappingFormValid) {
      return;
    }
    
    if (!editingMappingId) {
      return;
    }

    // Prepare payload for API
    const payload = {
      package_name: selectedPackage,
      update_data: {
        [mappingForm.source]: mappingForm.target
      }
    };
    
    try {
      if (updateMappingConfigApi.type === "mutation") {
        await updateMappingConfigApi.result.mutateAsync(payload);
        console.log("Mapping configuration updated successfully");
        clearValidationErrors('mappingForm'); // Clear validation errors on successful save
      }
    } catch (error) {
      console.error("Failed to update mapping configuration:", error);
      // Keep modal open on error so user can retry
    }
  };

  const handleCancelMapping = () => {
    // Clear any API errors and validation errors
    setApiError(null);
    clearValidationErrors('mappingForm');
    
    setIsMappingModalOpen(false);
    setMappingForm({
      source: "",
      target: ""
    });
    setEditingMappingId(null);
  };

  // Delete confirmation handlers
  // const handleDeleteWhitelistItem = (key: string) => {
  //   setDeleteConfirmation({
  //     isOpen: true,
  //     type: 'whitelist',
  //     key,
  //     onConfirm: () => {
  //       setWhitelistConfigPairs((prev) => {
  //         const newPairs = { ...prev };
  //         delete newPairs[key];
  //         return newPairs;
  //       });
  //       setDeleteConfirmation({ isOpen: false, type: 'whitelist', key: '', onConfirm: () => {} });
  //     }
  //   });
  // };

  // Replace the handleDeleteWhitelistItem function with this improved version
// Replace the handleDeleteWhitelistItem function with this improved version

const handleDeleteWhitelistItem = (key: string) => {
  setDeleteConfirmation({
    isOpen: true,
    type: 'whitelist',
    key,
    onConfirm: () => {
      setWhitelistConfigPairs((prev) => {
        const newPairs = { ...prev };
        
        // First, remove the item
        delete newPairs[key];
        
        // Reconstruct the array format maintaining object boundaries
        const whitelistArray: any[] = [];
        const groupedByIndex: {[index: number]: {[key: string]: any}} = {};
        
        // Group by index suffix, maintaining object integrity
        Object.entries(newPairs).forEach(([originalKey, value]) => {
          const keyParts = originalKey.split('_');
          const lastPart = keyParts[keyParts.length - 1];
          const hasIndexSuffix = !isNaN(parseInt(lastPart)) && keyParts.length > 1;
          
          if (hasIndexSuffix) {
            const baseKey = keyParts.slice(0, -1).join('_');
            const index = parseInt(lastPart);
            
            if (!groupedByIndex[index]) {
              groupedByIndex[index] = {};
            }
            groupedByIndex[index][baseKey] = value;
          } else {
            // No index suffix, belongs to index 0
            if (!groupedByIndex[0]) {
              groupedByIndex[0] = {};
            }
            groupedByIndex[0][originalKey] = value;
          }
        });
        
        // Get all indices and sort them to maintain original order
        const sortedIndices = Object.keys(groupedByIndex)
          .map(index => parseInt(index))
          .sort((a, b) => a - b);
        
        // Rebuild array maintaining original object structure
        sortedIndices.forEach(originalIndex => {
          const obj = groupedByIndex[originalIndex];
          if (Object.keys(obj).length > 0) { // Only add non-empty objects
            whitelistArray.push(obj);
          }
        });
        
        // Convert back to key-value pairs with sequential indexing
        const reindexedPairs: {[key: string]: any} = {};
        
        whitelistArray.forEach((item, newIndex) => {
          Object.entries(item).forEach(([key, value]) => {
            if (whitelistArray.length === 1) {
              // Single object - no index suffix needed
              reindexedPairs[key] = value;
            } else {
              // Multiple objects - add sequential index suffix
              reindexedPairs[`${key}_${newIndex}`] = value;
            }
          });
        });
        
        return reindexedPairs;
      });
      setDeleteConfirmation({ isOpen: false, type: 'whitelist', key: '', onConfirm: () => {} });
    }
  });
};

  const handleDeleteNewConfigItem = (key: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'newConfig',
      key,
      onConfirm: () => {
        setParameterCountryRows(prev => prev.filter(row => row.parameter !== key));
        setNewKeyValues(prev => {
          const newValues = { ...prev };
          delete newValues[key];
          return newValues;
        });
        setDeleteConfirmation({ isOpen: false, type: 'newConfig', key: '', onConfirm: () => {} });
      }
    });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, type: 'whitelist', key: '', onConfirm: () => {} });
  };

  const handleTableRefresh = () => {
    setSearchTerm("");
    setCurrentPage(1);
    // Refresh API data
    if (getConfigSummaryApi.type === "mutation") {
      getConfigSummaryApi.result.mutateAsync({
        package_name: selectedPackage,
        page_number: 1,
        record_limit: limit,
        search_term: ""
      });
    }
  };

  // Helper function to render field with edit capability
  const renderEditableField = (
    fieldKey: keyof typeof config,
    label: string,
    placeholder: string,
    type: 'text' | 'switch' = 'text'
  ) => {
    const isEditing = editingField === fieldKey;
    const value = config[fieldKey];

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-2 sm:gap-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-700 sm:w-32 whitespace-nowrap">
            {label} :
          </span>
          {isEditing ? (
            type === 'switch' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {editingValue ? "True" : "False"}
                </span>
                <Switch
                  checked={editingValue as boolean}
                  onCheckedChange={setEditingValue}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            ) : (
              <Input
                value={editingValue as string}
                onChange={(e) => setEditingValue(e.target.value)}
                placeholder={placeholder}
                className="flex-1 text-sm"
              />
            )
          ) : (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {getCustomConfigApi.loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <>
                  <span className="text-sm text-gray-900 break-all sm:break-words">
                    {type === 'switch' 
                      ? (value ? "True" : "False")
                      : (value || `No ${label.toLowerCase()} configured`)
                    }
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(fieldKey)}
                    disabled={getCustomConfigApi.loading}
                    className="p-1 h-6 w-6 hover:bg-gray-100 ml-1"
                    title={`Edit ${label}`}
                  >
                    <MdEdit className="h-3 w-3 text-primary" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end sm:justify-start flex-shrink-0">
          {isEditing ? (
            <>
              <Button 
                size="sm" 
                onClick={handleSaveEdit} 
                className="text-xs"
                disabled={editCustomConfigApi.loading}
              >
                {editCustomConfigApi.loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancelEdit} 
                className="text-xs"
                disabled={editCustomConfigApi.loading}
              >
                Cancel
              </Button>
            </>
          ) : null}
        </div>
      </div>
    );
  };


  return (
    <div className="w-full space-y-2">
      <div>
        <div className="w-full bg-gray-200 text-sub-header font-semibold text-center sm:text-body p-2">
          Configuration
        </div>
        {/* Configuration Section */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Row 1: Fraud Threshold + Target URL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderEditableField('fraudThreshold', 'Fraud Threshold', 'Enter fraud threshold')}
                {renderEditableField('targetUrl', 'Target URL', 'Enter target URL ')}
              </div>

              {/* Row 2: Target Block URL + Redirection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderEditableField('targetBlockUrl', 'Target Block URL', 'Enter target block URL')}
                {renderEditableField('redirection', 'Redirection', '', 'switch')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="w-full bg-gray-200 text-sub-header font-semibold text-center sm:text-body p-2">
          Configuration Rules
        </div>

        {/* Configuration Rules Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Configuration Rules
              </CardTitle>
            </div>
            <div className="p-4 flex flex-col h-[450px]">
              
              <div className="flex-1">
                <ResizableTable
                  columns={configRulesColumns}
                  data={configRulesData}
                  isPaginated={true}
                  isSearchable={true}
                  SearchTerm={searchTerm}
                  // setSearchTerm={handleSearchChange}
                  setSearchTerm={setSearchTerm}
                  headerColor="#f8f9fa"
                  isSelectable={false}
                  totalPages={totalPages}
                  pageNo={currentPage}
                  onPageChangeP={(newPage: number) => {
                    setCurrentPage(newPage);
                  }}
                  onLimitChange={(newLimit: number) => {
                    setLimit(newLimit);
                    setCurrentPage(1);
                  }}
                  onRefresh={handleTableRefresh}
                  isRefetch={false}
                  isFile={false}
                  isDownload={false}
                  isTableDownload={false}
                  isEdit={true}
                  isView={true}
                  onEdit={handleEditRule}
                  onView={handleViewRule}
                  isClone={false}
                  isSend={false}
                  isPause={false}
                  isDelete={false}
                  isPlay={false}
                  isUserTable={false}
                  height={300}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="w-full bg-gray-200 text-sub-header font-semibold text-center sm:text-body p-2">
          Mapping Rules
        </div>

        {/* Mapping Rules Table */}
        <Card className="shadow-sm" >
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Mapping Rules
              </CardTitle>
            </div>
            <div className="p-4 flex flex-col h-[450px]">
              
              <div className="flex-1">
                                 <ResizableTable
                   columns={mappingRulesColumns}
                   data={mappingRulesData}
                   isPaginated={false}
                   isSearchable={true}
                   SearchTerm=""
                   setSearchTerm={() => {}}
                   headerColor="#f8f9fa"
                   isSelectable={false}
                   totalPages={1}
                   pageNo={1}
                   onPageChangeP={() => {}}
                   onLimitChange={() => {}}
                   onRefresh={() => {
                     if (getMappingConfigApi.type === "mutation") {
                       getMappingConfigApi.result.mutateAsync({
                         package_name: selectedPackage
                       });
                     }
                   }}
                   isRefetch={false}
                   isFile={false}
                   isDownload={false}
                   isTableDownload={false}
                   isEdit={true}
                   isView={false}
                   onEdit={handleEditMapping}
                   onView={(item) => {
                     console.log("View mapping rule:", item);
                     // You can add view functionality here if needed
                   }}
                   isClone={false}
                   isSend={false}
                   isPause={false}
                   isDelete={false}
                   isPlay={false}
                   isUserTable={false}
                   height={300}
                 />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rule Configuration Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Edit Rule Configuration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label
                  htmlFor="ruleName"
                  className="text-sm font-semibold text-gray-700"
                >
                  Rule Name
                </Label>
                <Input
                  id="ruleName"
                  placeholder="Enter Rule Name"
                  value={ruleForm.ruleName}
                  onChange={(e) => {
                    setRuleForm((prev) => ({ ...prev, ruleName: e.target.value }));
                    // Clear validation error when user starts typing
                    if (validationErrors.ruleForm.ruleName) {
                      clearValidationErrors('ruleForm');
                    }
                    // Reset parameterCountryRows when rule name changes
                    setParameterCountryRows([]);
                    setConfigurationBlocks([]);
                  }}
                  className="w-full mt-1"
                  disabled={editMode}
                />
                {validationErrors.ruleForm.ruleName && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.ruleForm.ruleName}</p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="status"
                  className="text-sm font-semibold text-gray-700"
                >
                  Status
                </Label>
                <Select 
                  value={ruleForm.status} 
                  onValueChange={(value) => {
                    setRuleForm((prev) => ({ ...prev, status: value }));
                    // Clear validation error when user selects a value
                    if (validationErrors.ruleForm.status) {
                      clearValidationErrors('ruleForm');
                    }
                  }}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="True">True</SelectItem>
                    <SelectItem value="False">False</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.ruleForm.status && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.ruleForm.status}</p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="whitelistConfiguration"
                  className="text-sm font-semibold text-gray-700"
                >
                  Whitelist Configuration
                </Label>
                                 <div className="mt-1 space-y-3 p-4 border border-gray-300 rounded-md bg-gray-50">
                   {(() => {
                     // Convert whitelistConfigPairs back to array format for display
                     const whitelistArray: any[] = [];
                     
                     // Group by index suffix
                     const groupedByIndex: {[index: string]: {[key: string]: any}} = {};
                     
                     Object.entries(whitelistConfigPairs).forEach(([key, value]) => {
                       const keyParts = key.split('_');
                       const lastPart = keyParts[keyParts.length - 1];
                       const hasIndexSuffix = !isNaN(parseInt(lastPart)) && keyParts.length > 1;
                       
                       if (hasIndexSuffix) {
                         const originalKey = keyParts.slice(0, -1).join('_');
                         const index = lastPart;
                         if (!groupedByIndex[index]) {
                           groupedByIndex[index] = {};
                         }
                         groupedByIndex[index][originalKey] = value;
                       } else {
                         // No index suffix, add to index 0
                         if (!groupedByIndex['0']) {
                           groupedByIndex['0'] = {};
                         }
                         groupedByIndex['0'][key] = value;
                       }
                     });
                     
                     // Convert grouped data back to array
                     Object.keys(groupedByIndex).forEach(index => {
                       const indexNum = parseInt(index);
                       while (whitelistArray.length <= indexNum) {
                         whitelistArray.push({});
                       }
                       whitelistArray[indexNum] = groupedByIndex[index];
                     });
                     
                     if (whitelistArray.length === 0) {
                       return (
                         <div className="text-sm text-gray-500 italic">
                           No whitelist configuration found
                         </div>
                       );
                     }
                     
                                          return (
                       <div className="space-y-3">
                         {whitelistArray.map((item, index) => (
                           Object.keys(item).length > 0 && (
                             <div key={index} className="border border-gray-200 rounded-md p-3 bg-white">
                               <div className="space-y-2">
                                 {Object.entries(item).map(([key, value]) => (
                                   <div key={key} className="flex items-center gap-3">
                                     <Label className="text-sm font-medium text-gray-700 w-32 shrink-0">
                                       {key} :
                                     </Label>
                                     {key === 'country' ? (
                                       <div className="flex-1">
                                         {countriesApi.loading ? (
                                           <div className="flex items-center gap-2 text-sm text-gray-500">
                                             <Loader2 className="h-4 w-4 animate-spin" />
                                             Loading countries...
                                           </div>
                                         ) : countries.length > 0 ? (
                                           <MultiSelect
                                             options={countries.map(country => ({ label: country.label, value: country.value }))}
                                             onValueChange={(selectedValues) => {
                                               // Check if all countries are selected
                                               const allCountryValues = countries.map(country => country.value);
                                               const isAllCountriesSelected = selectedValues.length === allCountryValues.length && 
                                                 selectedValues.every(country => allCountryValues.includes(country));
                                               
                                               // If all countries are selected, store ["all"] instead of the full array
                                               const countriesToStore = isAllCountriesSelected ? ["all"] : selectedValues;
                                               
                                               console.log("MultiSelect onValueChange - selectedValues:", selectedValues);
                                               console.log("MultiSelect onValueChange - isAllCountriesSelected:", isAllCountriesSelected);
                                               console.log("MultiSelect onValueChange - countriesToStore:", countriesToStore);
                                               
                                               // Update the whitelistConfigPairs with the new country values
                                               const keyWithIndex = whitelistArray.length > 1 ? `${key}_${index}` : key;
                                               setWhitelistConfigPairs((prev) => {
                                                 const newState = {
                                                   ...prev,
                                                   [keyWithIndex]: countriesToStore,
                                                 };
                                                 console.log("MultiSelect onValueChange - new whitelistConfigPairs state:", newState);
                                                 return newState;
                                               });
                                             }}
                                             defaultValue={Array.isArray(value) ? (value.includes("all") ? countries.map(country => country.value) : value) : [String(value)]}
                                             placeholder="Select countries"
                                           />
                                         ) : (
                                           <div className="text-sm text-gray-500">
                                             No countries available
                                           </div>
                                         )}
                                       </div>
                                     ) : (
                                     <Input
                                         value={String(value)}
                                       onChange={(e) => {
                                         // Update the whitelistConfigPairs with the new value
                                         const keyWithIndex = whitelistArray.length > 1 ? `${key}_${index}` : key;
                                         setWhitelistConfigPairs((prev) => ({
                                           ...prev,
                                           [keyWithIndex]: e.target.value,
                                         }));
                                       }}
                                       placeholder={`Enter ${key}`}
                                       className="flex-1 h-9"
                                     />
                                     )}
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={() => {
                                         const keyWithIndex = whitelistArray.length > 1 ? `${key}_${index}` : key;
                                         handleDeleteWhitelistItem(keyWithIndex);
                                       }}
                                       className=""
                                     >
                                       <Trash2 className="h-4 w-4 text-primary" />
                                     </Button>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )
                         ))}
                       </div>
                     );
                   })()}
                  {!showAddKeyMode ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddKeyMode(true);
                        // Reset parameterCountryRows when starting fresh
                        setParameterCountryRows([]);
                        setConfigurationBlocks([]);
                        // Automatically add first block for all rules
                        if (ruleForm.ruleName !== "mf_rule_incorrect_region_country" && ruleForm.ruleName !== "mf_rule_redirect") {
                          addConfigurationBlock();
                        } else {
                          // Add first parameter block for country and threshold rules
                          const newRow = {
                            id: Date.now().toString(),
                            parameter: "",
                            value: "",
                            countries: []
                          };
                          setParameterCountryRows([newRow]);
                        }
                      }}
                      className="w-full h-9"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Configuration
                    </Button>
                                    ) : (
                    <div className="space-y-3">
                      {/* Single Configuration Block */}
                      <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-700">
                            Configuration Parameter
                          </h3>
                          <div className="flex items-center gap-2">
                            {/* No Add button needed since we have one next to parameter selection */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowAddKeyMode(false);
                                setParameterCountryRows([]);
                                setConfigurationBlocks([]);
                                setNewKeyValues({});
                                setSelectedCountries([]);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Single Parameter Form */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                          
                            <div className="flex-1">
                              {/* Single select for specific rules, multi select for others */}
                              {(ruleForm.ruleName === "mf_rule_incorrect_region_country" || ruleForm.ruleName === "mf_rule_redirect") ? (
                                <div className="space-y-3">
                                  {/* Add new block button - positioned above blocks */}
                                  <div className="flex items-center justify-end">
                                  <Button
                                   
                                    onClick={() => {
                                      const newRow = {
                                        id: Date.now().toString(),
                                        parameter: "",
                                        value: "",
                                        countries: []
                                      };
                                      setParameterCountryRows(prev => [...prev, newRow]);
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-4 w-4 " />
                                    
                                  </Button>
                                  </div>
                                  
                                  {/* Parameter Blocks */}
                                  {parameterCountryRows.map((row, index) => (
                                    <div key={row.id} className="border border-gray-300 rounded-md p-3 bg-white">
                                      <div className="flex items-center justify-end mb-3">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setParameterCountryRows(prev => prev.filter(r => r.id !== row.id));
                                          }}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          <Label className="text-sm font-medium text-gray-700 w-32 shrink-0">
                                            Parameter :
                                          </Label>
                                          <div className="flex-1">
                                            <MFSingleSelect
                                              items={configParameters.map(key => ({ title: key, value: key }))}
                                              onValueChange={(value) => {
                                                setParameterCountryRows(prev => 
                                                  prev.map(r => 
                                                    r.id === row.id 
                                                      ? { ...r, parameter: value }
                                                      : r
                                                  )
                                                );
                                                // Clear validation error when user selects a parameter
                                                if (validationErrors.newKeyValues[`${row.id}_parameter`]) {
                                                  setValidationErrors(prev => ({
                                                    ...prev,
                                                    newKeyValues: {
                                                      ...prev.newKeyValues,
                                                      [`${row.id}_parameter`]: undefined
                                                    }
                                                  }));
                                                }
                                              }}
                                              value={row.parameter}
                                              placeholder="Select Parameter"
                                              className="flex-1"
                                            />
                                          </div>
                                        </div>
                                        
                                        {/* Show individual validation error for parameter */}
                                        {validationErrors.newKeyValues[`${row.id}_parameter`] && (
                                          <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues[`${row.id}_parameter`]}</p>
                                        )}
                                        
                                        {/* Value field */}
                                        <div className="flex items-center gap-3">
                                          <Label className="text-sm font-medium text-gray-700 w-32 shrink-0">
                                            Value :
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={row.value}
                                              onChange={(e) => {
                                                setParameterCountryRows(prev => 
                                                  prev.map(r => 
                                                    r.id === row.id 
                                                      ? { ...r, value: e.target.value }
                                                      : r
                                                  )
                                                );
                                                // Clear validation error when user types
                                                if (validationErrors.newKeyValues[`${row.id}_value`]) {
                                                  setValidationErrors(prev => ({
                                                    ...prev,
                                                    newKeyValues: {
                                                      ...prev.newKeyValues,
                                                      [`${row.id}_value`]: undefined
                                                    }
                                                  }));
                                                }
                                              }}
                                              placeholder={`Enter ${row.parameter || 'parameter'} value`}
                                              className="h-9"
                                            />
                                          </div>
                                        </div>
                                        
                                        {/* Show individual validation error for value */}
                                        {validationErrors.newKeyValues[`${row.id}_value`] && (
                                          <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues[`${row.id}_value`]}</p>
                                        )}
                                        
                                        {/* Show Countries field only for mf_rule_incorrect_region_country */}
                                        {ruleForm.ruleName === "mf_rule_incorrect_region_country" && (
                                          <div className="flex items-center gap-3">
                                            <Label className="text-sm font-medium text-gray-700 w-32 shrink-0">
                                              Countries :
                                            </Label>
                                            <div className="flex-1">
                                              {countriesApi.loading ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                  Loading countries...
                                                </div>
                                              ) : countries.length > 0 ? (
                                                <MultiSelect
                                                  options={countries.map(country => ({ label: country.label, value: country.value }))}
                                                  onValueChange={(value) => {
                                                    // Check if all countries are selected
                                                    const allCountryValues = countries.map(country => country.value);
                                                    const isAllCountriesSelected = value.length === allCountryValues.length && 
                                                      value.every(country => allCountryValues.includes(country));
                                                    
                                                    // If all countries are selected, store ["all"] instead of the full array
                                                    const countriesToStore = isAllCountriesSelected ? ["all"] : value;
                                                    
                                                    setParameterCountryRows(prev => 
                                                      prev.map(r => 
                                                        r.id === row.id 
                                                          ? { ...r, countries: countriesToStore }
                                                          : r
                                                      )
                                                    );
                                                    // Clear validation error when user selects countries
                                                    if (validationErrors.newKeyValues[`${row.id}_countries`]) {
                                                      setValidationErrors(prev => ({
                                                        ...prev,
                                                        newKeyValues: {
                                                          ...prev.newKeyValues,
                                                          [`${row.id}_countries`]: undefined
                                                        }
                                                      }));
                                                    }
                                                  }}
                                                  defaultValue={Array.isArray(row.countries) ? (row.countries.includes("all") ? countries.map(country => country.value) : row.countries) : row.countries}
                                                  placeholder="Select countries"
                                                />
                                              ) : (
                                                <div className="text-sm text-gray-500">
                                                  No countries available
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Show individual validation error for countries */}
                                        {ruleForm.ruleName === "mf_rule_incorrect_region_country" && validationErrors.newKeyValues[`${row.id}_countries`] && (
                                          <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues[`${row.id}_countries`]}</p>
                                        )}
                                        {/* Show Threshold field only for mf_rule_redirect */}
                                        {ruleForm.ruleName === "mf_rule_redirect" && (
                                          <div className="flex items-center gap-3">
                                            <Label className="text-sm font-medium text-gray-700 w-32 shrink-0">
                                              Threshold :
                                            </Label>
                                            <div className="flex-1">
                                              <Input
                                                value={row.threshold || ""}
                                                onChange={(e) => {
                                                  setParameterCountryRows(prev => 
                                                    prev.map(r => 
                                                      r.id === row.id 
                                                        ? { ...r, threshold: e.target.value }
                                                        : r
                                                    )
                                                  );
                                                  // Clear validation error when user types
                                                  if (validationErrors.newKeyValues[`${row.id}_threshold`]) {
                                                    setValidationErrors(prev => ({
                                                      ...prev,
                                                      newKeyValues: {
                                                        ...prev.newKeyValues,
                                                        [`${row.id}_threshold`]: undefined
                                                      }
                                                    }));
                                                  }
                                                }}
                                                placeholder="Enter threshold value"
                                                className="h-9"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Show individual validation error for threshold */}
                                        {ruleForm.ruleName === "mf_rule_redirect" && validationErrors.newKeyValues[`${row.id}_threshold`] && (
                                          <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues[`${row.id}_threshold`]}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {/* Add new block button - positioned above blocks */}
                                  <div className="flex items-center justify-end">
                                  <Button
                                  
                                    onClick={addConfigurationBlock}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-4 w-4 " />
                                    
                                  </Button>
                                  </div>
                                  
                                  {/* Show general validation error for configuration blocks */}
                                  {validationErrors.newKeyValues['general'] && (
                                    <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues['general']}</p>
                                  )}
                                  
                                  {/* Configuration Blocks */}
                                  {configurationBlocks.map((block, blockIndex) => (
                                    <div key={block.id} className="border border-gray-300 rounded-md p-3 bg-white">
                                      <div className="flex items-center justify-end mb-3">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => removeConfigurationBlock(block.id)}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          <Label className="text-sm font-medium text-gray-700 w-32 shrink-0">
                                            Parameters :
                                          </Label>
                                          <div className="flex-1">
                                            <MultiSelect
                                              options={configParameters.map(key => ({ label: key, value: key }))}
                                              onValueChange={(selectedValues) => {
                                                updateBlockParameters(block.id, selectedValues);
                                                // Clear validation error when user selects parameters
                                                if (validationErrors.newKeyValues[block.id]) {
                                                  setValidationErrors(prev => ({
                                                    ...prev,
                                                    newKeyValues: {
                                                      ...prev.newKeyValues,
                                                      [block.id]: undefined
                                                    }
                                                  }));
                                                }
                                              }}
                                              defaultValue={block.parameters}
                                              placeholder="Select Parameters"
                                            />
                                          </div>
                                        </div>
                                        
                                        {/* Show validation error for this block */}
                                                                                        {validationErrors.newKeyValues[block.id] && (
                                                  <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues[block.id]}</p>
                                                )}
                                        
                                        {/* Value inputs for each selected parameter */}
                                        {block.parameters.length > 0 && (
                                          <div className="space-y-3">
                                            {block.parameters.map((param) => (
                                              <div key={param} className="flex items-center gap-3">
                                                <Label className="text-sm font-medium text-gray-700 w-32 shrink-0">
                                                  {param} :
                                                </Label>
                                                <div className="flex-1">
                                                  <Input
                                                    value={block.values[param] || ""}
                                                    onChange={(e) => {
                                                      updateBlockValue(block.id, param, e.target.value);
                                                      // Clear validation error when user types
                                                      if (validationErrors.newKeyValues[`${block.id}_${param}`]) {
                                                        setValidationErrors(prev => ({
                                                          ...prev,
                                                          newKeyValues: {
                                                            ...prev.newKeyValues,
                                                            [`${block.id}_${param}`]: undefined
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    placeholder={`Enter ${param} value`}
                                                    className="h-9"
                                                  />
                                                </div>
                                                {/* Show validation error for specific parameter */}
                                                {validationErrors.newKeyValues[`${block.id}_${param}`] && (
                                                  <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues[`${block.id}_${param}`]}</p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Show general validation error */}
                              {validationErrors.newKeyValues['general'] && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors.newKeyValues['general']}</p>
                              )}
                            </div>
                          </div>
                          

                        </div>
                      </div>
                      

                    </div>
                    
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">
                  Rule Configuration
                </Label>
                <div className="mt-1 space-y-3 p-4 border border-gray-300 rounded-md bg-gray-50 w-[100%]">
                  {Object.keys(ruleConfigPairs).length === 0 ? (
                    <div className="text-sm text-gray-500 italic">
                      No configuration found
                    </div>
                  ) : (
                    Object.entries(ruleConfigPairs).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-3 w-[100%]">
                        <Label className="text-sm font-medium text-gray-700 w-[55%] shrink-0">
                          {key} :
                        </Label>
                        <Input
                          value={value}
                          onChange={(e) =>
                            setRuleConfigPairs((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${key}`}
                          className="flex-1 h-9 w-[45%]"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 flex-shrink-0">
           
            <Button
              onClick={handleCancelRule}
              className="text-white bg-primary hover:bg-primary rounded-md"
              disabled={editCustomConfigRuleApi.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              className="text-white bg-primary hover:bg-primary rounded-md"
              disabled={editCustomConfigRuleApi.loading || (editMode ? false : !ruleForm.ruleName?.trim())}
            >
              {editCustomConfigRuleApi.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Rule Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              View Rule Configuration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            {viewingRule && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Rule Name
                  </Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {viewingRule.ruleName}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Status
                  </Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {viewingRule.status}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Whitelist Configuration
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border mt-1 max-h-[200px] overflow-y-auto">
                    {(() => {
                      try {
                        const parsedConfig = JSON.parse(viewingRule.whitelistConfiguration || "[]");
                        
                        if (Array.isArray(parsedConfig)) {
                          if (parsedConfig.length === 0) {
                            return (
                              <div className="text-sm text-gray-500 italic">
                                No whitelist configuration found
                              </div>
                            );
                          }
                          
                                                     return (
                             <div className="space-y-3">
                               {parsedConfig.map((item, index) => (
                                 <div key={index} className="border border-gray-200 rounded-md p-3 bg-white">
                                   {typeof item === 'object' && item !== null ? (
                                     <div className="space-y-2">
                                       {Object.entries(item).map(([key, value]) => (
                                         <div key={key} className="flex items-center gap-3">
                                           <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                                             {key} :
                                           </span>
                                           <span className="text-sm text-gray-900 flex-1">
                                             {key === 'country' && Array.isArray(value) 
                                               ? value.join(', ') 
                                               : String(value)
                                             }
                                           </span>
                                         </div>
                                       ))}
                                     </div>
                                   ) : (
                                     <div className="flex items-center gap-3">
                                       <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                                         Value :
                                       </span>
                                       <span className="text-sm text-gray-900 flex-1">
                                         {String(item)}
                                       </span>
                                     </div>
                                   )}
                                 </div>
                               ))}
                             </div>
                           );
                        } else if (typeof parsedConfig === 'object' && parsedConfig !== null) {
                          return (
                            <div className="space-y-2">
                              {Object.entries(parsedConfig).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                                    {key} :
                                  </span>
                                  <span className="text-sm text-gray-900 flex-1">
                                    {key === 'country' && Array.isArray(value) 
                                      ? value.join(', ') 
                                      : String(value)
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-sm text-gray-500 italic">
                              No whitelist configuration found
                            </div>
                          );
                        }
                      } catch (error) {
                        return (
                          <div className="text-sm text-red-500">
                            Error parsing whitelist configuration
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Rule Configuration
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border mt-1 max-h-[200px] overflow-y-auto">
                    {(() => {
                      try {
                        const parsedConfig = JSON.parse(viewingRule.ruleConfiguration || "{}");
                        return Object.keys(parsedConfig).length === 0 ? (
                          <div className="text-sm text-gray-500 italic">
                            No configuration found
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {Object.entries(parsedConfig).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                                  {key} :
                                </span>
                                <span className="text-sm text-gray-900 flex-1">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      } catch (error) {
                        return (
                          <div className="text-sm text-red-500">
                            Error parsing configuration
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              onClick={() => setIsViewModalOpen(false)}
              className="text-white bg-primary hover:bg-primary"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Edit Modal */}
      <Dialog open={isMappingModalOpen} onOpenChange={setIsMappingModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Edit Mapping Configuration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label
                  htmlFor="source"
                  className="text-sm font-semibold text-gray-700"
                >
                  Source
                </Label>
                <Input
                  id="source"
                  value={mappingForm.source}
                  disabled={true}
                  className="w-full mt-1 bg-gray-100"
                />
                {validationErrors.mappingForm.source && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.mappingForm.source}</p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="target"
                  className="text-sm font-semibold text-gray-700"
                >
                  Target
                </Label>
                <Input
                  id="target"
                  placeholder="Enter target value"
                  value={mappingForm.target}
                  onChange={(e) => {
                    setMappingForm((prev) => ({ ...prev, target: e.target.value }));
                    // Clear validation error when user starts typing
                    if (validationErrors.mappingForm.target) {
                      clearValidationErrors('mappingForm');
                    }
                  }}
                  className="w-full mt-1"
                />
                {validationErrors.mappingForm.target && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.mappingForm.target}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              onClick={handleCancelMapping}
              className="text-white bg-primary hover:bg-primary rounded-md"
              disabled={updateMappingConfigApi.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveMapping}
              className="text-white bg-primary hover:bg-primary rounded-md"
              disabled={updateMappingConfigApi.loading || !mappingForm.target?.trim()}
            >
              {updateMappingConfigApi.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle className="">
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
           
              Are you sure you want to delete the configuration item?
            
          </div>
          <DialogFooter className="flex gap-2">
            <Button
            //   variant="outline"
              onClick={handleCancelDelete}
             className="text-white bg-primary hover:bg-primary rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteConfirmation.onConfirm}
              className="text-white bg-primary hover:bg-primary"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomConfiguration;
