import React, { useEffect, useState, useCallback } from "react";
import { useApiCall } from "@/app/(main)/(app)/integrity/queries/api_base";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Minus, Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePackage } from "@/components/mf/PackageContext";
import { MFDateRangePicker } from "@/components/mf/MFDateRangePicker";
import {
  DateRangeProvider,
  useDateRange,
} from "@/components/mf/DateRangeContext";

interface DeliveryOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "schedule" | "download";
  onSubmit: (payload: any, startDate: string, endDate: string) => void;
  defaultData?: any;
  mode?: any;
  frequency?: string;
  onFrequencyChange?: (value: string) => void;
  category?: string;
  urlKey?: string; // Add urlKey prop to determine URL
}

interface MailingList {
  id: string;
  mailing_list_name: string;
}

// Email validation function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const DeliveryOptionsModalContent = ({
  isOpen,
  onClose,
  type,
  onSubmit,
  defaultData,
  mode,
  frequency,
  onFrequencyChange,
  category,
  urlKey,
}: DeliveryOptionsModalProps) => {
  console.log("category value", category)
  const [sendViaEmail, setSendViaEmail] = useState(false);
  const [saveToCloud, setSaveToCloud] = useState(true);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<
    "AWS" | "GCP" | "Azure"
  >("AWS");
  const [installEmails, setInstallEmails] = useState<string[]>([""]);
  const [eventEmails, setEventEmails] = useState<string[]>([""]);
  const [selectedInstallMailingLists, setSelectedInstallMailingLists] =
    useState<string[]>([]);
  const [selectedEventMailingLists, setSelectedEventMailingLists] = useState<
    string[]
  >([]);
  const [isInstallDropdownOpen, setIsInstallDropdownOpen] = useState(false);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isEventCopiedFromInstall, setIsEventCopiedFromInstall] =
    useState(false);
  const [cloudConfigs, setCloudConfigs] = useState({
    AWS: { accessKey: "", secretKey: "", bucketName: "" },
    GCP: { accessKey: "", secretKey: "", bucketName: "" },
    Azure: { accessKey: "", secretKey: "", bucketName: "" },
  });

  const [mailinglist, setMailinglist] = useState<MailingList[]>([]);
  const { selectedPackage } = usePackage();
  const { startDate, endDate } = useDateRange(); // Get date range from context
  const [occurrenceOptions, setOccurrenceOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Add error state variables for mandatory fields - using empty strings like deliveryoptionsmodal
  const [occurrenceError, setOccurrenceError] = useState<string>("");
  const [cloudError, setCloudError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [installEmailErrors, setInstallEmailErrors] = useState<string[]>([""]);
  const [eventEmailErrors, setEventEmailErrors] = useState<string[]>([""]);


  // Helper function to check if category includes a specific value
  const categoryIncludes = (value: string): boolean => {
    // If no category provided, show all sections by default
    if (!category || category === undefined || category === null) {
      return true;
    }

    // Convert to string and trim whitespace
    const categoryStr = String(category).trim().toLowerCase();
    const valueStr = value.trim().toLowerCase();

    // Check if the category string includes the value or exact match
    return categoryStr === valueStr || categoryStr.includes(valueStr);
  };

  // Get available categories from the category prop
  const getAvailableCategories = () => {
    if (!category) return [];
    
    // Split by comma and clean up
    return category.split(',').map(cat => cat.trim().toLowerCase()).filter(Boolean);
  };

  // Helper function to get category display name
  const getCategoryDisplayName = (categoryKey: string) => {
    // Capitalize first letter and replace underscores/dashes with spaces
    return categoryKey
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to get email placeholder
  const getEmailPlaceholder = (categoryKey: string) => {
    const displayName = getCategoryDisplayName(categoryKey);
    return `Enter ${displayName} Email`;
  };

  // Helper function to get mailing list placeholder
  const getMailingListPlaceholder = (categoryKey: string) => {
    const displayName = getCategoryDisplayName(categoryKey);
    return `Choose ${displayName} Mailing Lists`;
  };

  // Determine the URL based on the urlKey prop
  const getUrlPath = (endpoint: string) => {
    
    return process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/${urlKey}/${endpoint}`;
  };

  // api call for occurrence and schedule
  const occurrenceApiCall = useApiCall({
    url:
      type === "schedule"
        ? getUrlPath("scheduler/occurance")
        : getUrlPath("download/occurance"),
    method: "POST",
    manual: true,
    params: {
      package_name: selectedPackage,
    },
    onSuccess: (data: any) => {
      if (Array.isArray(data)) {
        setOccurrenceOptions(data);
      }
    },
  });

  const occurrenceLoading = occurrenceApiCall.loading;

  useEffect(() => {
    if (isOpen && occurrenceApiCall.type === "mutation") {
      occurrenceApiCall.result.mutate({
        package_name: selectedPackage,
      });
    }
  }, [isOpen, selectedPackage]);

  const mailingListApiCall = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/list_all_mailing_lists`,
    url: getUrlPath("list_all_mailing_lists"),
    method: "POST",
    manual: true,
    onSuccess: (data: any) => {
      if (
        data &&
        typeof data === "object" &&
        Array.isArray(data.mailing_lists)
      ) {
        setMailinglist(data.mailing_lists);
      }
    },
    onError: (error) => {
      console.error("Error fetching mailing list:", error);
    },
  });

  const mailingListLoading = mailingListApiCall.loading;

  const refreshMailingList = useCallback(() => {
    if (mailingListApiCall.type === "mutation") {
      mailingListApiCall.result.mutate({
        page: "1",
        page_size: "200",
        // mailing_list_name: "",
        package_name: selectedPackage,
        occurance: frequency,
      });
    }
  }, [mailingListApiCall, selectedPackage, frequency, category]);

  useEffect(() => {
    if (isOpen && frequency) {
      refreshMailingList();
    }
  }, [isOpen, frequency, category]);

  useEffect(() => {
    if (defaultData) {
      const { email, aws, gcp, azure } = defaultData;

      if (email?.status) {
        setSendViaEmail(true);

        // Wait for mailing list data to be loaded
        if (mailinglist.length > 0) {
          // Handle install mailing lists with fallback to generic mail_id_list
          const installMailingListNames =
            email.install_mail_id_list || email.mail_id_list || [];

          const installLists =
            installMailingListNames
              .map((listName: string) => {
                const found = mailinglist.find(
                  (ml) => ml.mailing_list_name === listName
                );
                return found?.id;
              })
              .filter(Boolean) || [];

          // Handle event mailing lists with fallback to generic mail_id_list
          const eventMailingListNames =
            email.event_mail_id_list || email.mail_id_list || [];

          const eventLists =
            eventMailingListNames
              .map((listName: string) => {
                const found = mailinglist.find(
                  (ml) => ml.mailing_list_name === listName
                );
                return found?.id;
              })
              .filter(Boolean) || [];

          setSelectedInstallMailingLists(installLists);
          setSelectedEventMailingLists(eventLists);
        }

        // Handle email addresses with fallback to generic 'to' field
        const installEmailAddresses = email.install_to || email.to || [""];
        const eventEmailAddresses = email.event_to || email.to || [""];

        setInstallEmails(installEmailAddresses);
        setEventEmails(eventEmailAddresses);
        
        // Initialize email error arrays
        setInstallEmailErrors(new Array(installEmailAddresses.length).fill(""));
        setEventEmailErrors(new Array(eventEmailAddresses.length).fill(""));
      }

      if (aws?.status) {
        setSelectedCloudProvider("AWS");
        setSaveToCloud(true);
        setCloudConfigs((prev) => ({
          ...prev,
          AWS: {
            accessKey: aws.aws_access_key_id || "",
            secretKey: aws.aws_secret_access_key || "",
            bucketName: aws.bucket_name || "",
          },
        }));
      // } else if (gcp?.status) {
      //   setSelectedCloudProvider("GCP");
      //   setSaveToCloud(true);
      //   setCloudConfigs((prev) => ({
      //     ...prev,
      //     GCP: {
      //       accessKey: gcp.gcp_access_key_id || "",
      //       secretKey: gcp.gcp_secret_access_key || "",
      //       bucketName: gcp.storage_name || "",
      //     },
      //   }));
      // } else if (azure?.status) {
      //   setSelectedCloudProvider("Azure");
      //   setSaveToCloud(true);
      //   setCloudConfigs((prev) => ({
      //     ...prev,
      //     Azure: {
      //       accessKey: azure.azure_access_key_id || "",
      //       secretKey: azure.azure_secret_access_key || "",
      //       bucketName: azure.container_name || "",
      //     },
      //   }));
      // }
    }
  }
 }, [defaultData, mailinglist]);

  // Add a separate useEffect to handle mailing list selection when mailing list data is loaded
  useEffect(() => {
    if (defaultData?.email?.status && mailinglist.length > 0) {
      // Handle install mailing lists with fallback to generic mail_id_list
      const installMailingListNames =
        defaultData.email.install_mail_id_list ||
        defaultData.email.mail_id_list ||
        [];

      const installLists =
        installMailingListNames
          .map((listName: string) => {
            const found = mailinglist.find(
              (ml) => ml.mailing_list_name === listName
            );
            return found?.id;
          })
          .filter(Boolean) || [];

      // Handle event mailing lists with fallback to generic mail_id_list
      const eventMailingListNames =
        defaultData.email.event_mail_id_list ||
        defaultData.email.mail_id_list ||
        [];

      const eventLists =
        eventMailingListNames
          .map((listName: string) => {
            const found = mailinglist.find(
              (ml) => ml.mailing_list_name === listName
            );
            return found?.id;
          })
          .filter(Boolean) || [];

      setSelectedInstallMailingLists(installLists);
      setSelectedEventMailingLists(eventLists);
    }
  }, [mailinglist, defaultData]);

  useEffect(() => {
    if (isOpen) {
      if (type === "download") {
        setSaveToCloud(false);
      } else {
        setSaveToCloud(false);
      }
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (type === "download" && frequency === "Custom Range") {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
    }
  }, [type, frequency]);

  

  const handleInstallMailingListToggle = useCallback(
    (listId: string) => {
      if (mode === "view") return;

      setSelectedInstallMailingLists((prev: string[]) => {
        const isCurrentlySelected = prev.includes(listId);

        let newSelection;
        if (isCurrentlySelected) {
          newSelection = prev.filter((id: string) => id !== listId);
        } else {
          newSelection = [...prev, listId];
        }

        return newSelection;
      });
    },
    [mode, selectedInstallMailingLists]
  );

  const handleEventMailingListToggle = useCallback(
    (listId: string) => {
      if (mode === "view") return;

      setSelectedEventMailingLists((prev: string[]) => {
        const isCurrentlySelected = prev.includes(listId);

        let newSelection;
        if (isCurrentlySelected) {
          newSelection = prev.filter((id: string) => id !== listId);
        } else {
          newSelection = [...prev, listId];
        }

        return newSelection;
      });
    },
    [mode, selectedEventMailingLists]
  );

  const removeInstallMailingList = (listId: string) => {
    if (mode === "view") return;
    setSelectedInstallMailingLists((prev: string[]) =>
      prev.filter((id: string) => id !== listId)
    );
  };

  const removeEventMailingList = (listId: string) => {
    if (mode === "view") return;
    setSelectedEventMailingLists((prev: string[]) =>
      prev.filter((id: string) => id !== listId)
    );
  };

  // Function to copy install data to event section
  const copyInstallToEvent = () => {
    setSelectedEventMailingLists([...selectedInstallMailingLists]);
    setEventEmails([...installEmails]);
    setEventEmailErrors([...installEmailErrors]);
    setIsEventCopiedFromInstall(true);
  };

  // Function to clear event section (uncopy)
  const clearEventData = () => {
    setSelectedEventMailingLists([]);
    setEventEmails([""]);
    setEventEmailErrors([""]);
    setIsEventCopiedFromInstall(false);
  };

  // Check if install section has data
  const hasInstallData = () => {
    return (
      selectedInstallMailingLists.length > 0 ||
      installEmails.some((email) => email.trim() !== "")
    );
  };

  // Validate install emails
  const validateInstallEmails = () => {
    const errors = installEmails.map(email => {
      if (email.trim() === "") return "";
      return isValidEmail(email) ? "" : "Please enter a valid email address";
    });
    setInstallEmailErrors(errors);
    return errors.every(error => error === "");
  };

  // Validate event emails
  const validateEventEmails = () => {
    const errors = eventEmails.map(email => {
      if (email.trim() === "") return "";
      return isValidEmail(email) ? "" : "Please enter a valid email address";
    });
    setEventEmailErrors(errors);
    return errors.every(error => error === "");
  };

  // Handle install email change with validation
  const handleInstallEmailChange = (index: number, value: string) => {
    const newEmails = [...installEmails];
    newEmails[index] = value;
    setInstallEmails(newEmails);
    
    // Validate the specific email
    const newErrors = [...installEmailErrors];
    if (value.trim() === "") {
      newErrors[index] = "";
    } else {
      newErrors[index] = isValidEmail(value) ? "" : "Please enter a valid email address";
    }
    setInstallEmailErrors(newErrors);
    
    // Clear general email error when user types
    if (value.trim() !== "") {
      setEmailError("");
    }
  };

  // Handle event email change with validation
  const handleEventEmailChange = (index: number, value: string) => {
    const newEmails = [...eventEmails];
    newEmails[index] = value;
    setEventEmails(newEmails);
    
    // Validate the specific email
    const newErrors = [...eventEmailErrors];
    if (value.trim() === "") {
      newErrors[index] = "";
    } else {
      newErrors[index] = isValidEmail(value) ? "" : "Please enter a valid email address";
    }
    setEventEmailErrors(newErrors);
    
    // Clear general email error when user types
    if (value.trim() !== "") {
      setEmailError("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        (isInstallDropdownOpen || isEventDropdownOpen) &&
        !target.closest(".relative")
      ) {
        setIsInstallDropdownOpen(false);
        setIsEventDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isInstallDropdownOpen, isEventDropdownOpen]);

  const getSelectedInstallMailingListNames = () => {
    const names = selectedInstallMailingLists
      .map((id: string) => {
        const found = mailinglist.find((ml) => ml.id === id);
        return found?.mailing_list_name;
      })
      .filter(Boolean);
    return names;
  };

  const getSelectedEventMailingListNames = () => {
    const names = selectedEventMailingLists
      .map((id: string) => {
        const found = mailinglist.find((ml) => ml.id === id);
        return found?.mailing_list_name;
      })
      .filter(Boolean);

    return names;
  };

  const handleConfirm = () => {
    // Clear any previous errors - using exact same pattern as deliveryoptionsmodal
    setOccurrenceError("");
    setCloudError("");
    setEmailError("");

    // Validate occurrence - using exact same validation logic
    if(!frequency || frequency.trim() === ""){
      setOccurrenceError("Please select occurrence");
      return;
    }

    // Validate cloud configuration if save to cloud is enabled - using exact same validation logic
    if(saveToCloud) {
      const config = cloudConfigs[selectedCloudProvider];
      if(!config.accessKey || !config.secretKey || !config.bucketName) {
        setCloudError("Please fill all cloud configuration fields");
        return;
      }
    }

    // Validate email configuration if send via email is enabled - using exact same validation logic
    if(sendViaEmail) {
      let hasValidEmailConfig = false;
      
      // Check if any mailing lists are selected or any email addresses are entered
      const hasAnyMailingLists = selectedInstallMailingLists.length > 0 || selectedEventMailingLists.length > 0;
      const hasAnyEmails = installEmails.some(email => email.trim() !== "") || eventEmails.some(email => email.trim() !== "");
      
      if (hasAnyMailingLists || hasAnyEmails) {
        hasValidEmailConfig = true;
      }
      
      // Validate install emails if any are provided
      if (installEmails.some(email => email.trim() !== "") && !validateInstallEmails()) {
        setEmailError("Please fix invalid email addresses in Install section");
        return;
      }
      
      // Validate event emails if any are provided
      if (eventEmails.some(email => email.trim() !== "") && !validateEventEmails()) {
        setEmailError("Please fix invalid email addresses in Event section");
        return;
      }
      
      if (!hasValidEmailConfig) {
        setEmailError("Please select mailing lists or enter email addresses");
        return;
      }
    }

    // const cloudOptions = ["AWS", "GCP", "Azure"].reduce(
    const cloudOptions = ["AWS" /* , "GCP", "Azure" */].reduce(
      (acc, provider) => {
        const key = provider.toLowerCase();
        const isSelected = selectedCloudProvider === provider && saveToCloud;
        const config = cloudConfigs[provider as "AWS" /* | "GCP" | "Azure" */];

        acc[key] = {
          status: isSelected,
          [`${key}_access_key_id`]: isSelected ? config.accessKey : "",
          [`${key}_secret_access_key`]: isSelected ? config.secretKey : "",
          "bucket_name": isSelected ? config.bucketName : ",",
        };
        return acc;
      },
      {} as Record<string, any>
    );

    const installMailingListNames = getSelectedInstallMailingListNames();
    const eventMailingListNames = getSelectedEventMailingListNames();
    const filteredInstallEmails = installEmails.filter(
      (email: string) => email.trim() !== ""
    );
    const filteredEventEmails = eventEmails.filter(
      (email: string) => email.trim() !== ""
    );

    const hasInstallMailingLists = installMailingListNames.length > 0;
    const hasInstallEmails = filteredInstallEmails.length > 0;
    const hasEventMailingLists = eventMailingListNames.length > 0;
    const hasEventEmails = filteredEventEmails.length > 0;

    // Create separate delivery configurations for click and impression
    const deliveryPayload: any = {};

    // Get available categories and check which ones are selected
    const availableCategories = getAvailableCategories();
    const selectedCategories = availableCategories.filter(cat => categoryIncludes(cat));

    if (selectedCategories.length > 1) {
      // Multiple categories selected - create separate configurations
      selectedCategories.forEach(cat => {
        const isFirstCategory = cat === selectedCategories[0];
        const mailingListNames = isFirstCategory ? installMailingListNames : eventMailingListNames;
        const filteredEmails = isFirstCategory ? filteredInstallEmails : filteredEventEmails;
        const hasMailingLists = mailingListNames.length > 0;
        const hasEmails = filteredEmails.length > 0;

        const emailSection = {
          status: sendViaEmail,
          mail_type: hasMailingLists ? "group" : "individual",
          mail_id_list: mailingListNames,
          email_group: mailingListNames,
          to: filteredEmails,
          subject: "",
          name: "",
        };

        deliveryPayload[cat] = {
          ...cloudOptions,
          email: emailSection,
        };
      });
    } else if (selectedCategories.length === 1) {
      // Only one category selected - create flat structure
      const cat = selectedCategories[0];
      const isFirstCategory = cat === availableCategories[0];
      const mailingListNames = isFirstCategory ? installMailingListNames : eventMailingListNames;
      const filteredEmails = isFirstCategory ? filteredInstallEmails : filteredEventEmails;
      const hasMailingLists = mailingListNames.length > 0;

      const emailSection = {
        status: sendViaEmail,
        mail_type: hasMailingLists ? "group" : "individual",
        mail_id_list: mailingListNames,
        email_group: mailingListNames,
        to: filteredEmails,
        subject: "",
        name: "",
      };

      Object.assign(deliveryPayload, {
        ...cloudOptions,
        email: emailSection,
      });
    }

    // Add date range to the payload
    // if (startDate && endDate) {
    //   deliveryPayload.dateRange = {
    //     startDate: startDate,
    //     endDate: endDate,
    //   };
    // }

    console.log("deliveryPayload", deliveryPayload);

    onSubmit(deliveryPayload, startDate, endDate);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold dark:text-white">
            {type === "schedule" ? "Schedule Report" : "Download Report"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 w-full">
          {/* Occurrence Dropdown */}
          <div className="space-y-2 mb-4 w-[95%] mx-auto">
            <Label className="dark:text-white">Occurrence</Label>
            <Select
              value={frequency}
              onValueChange={(value) => {
                onFrequencyChange?.(value);
                // Clear occurrence error when user selects a valid occurrence
                if (value && value !== "") {
                  setOccurrenceError("");
                }
              }}
              disabled={mode === "view" || mode === "edit"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Occurrence" />
              </SelectTrigger>
              <SelectContent>
                {occurrenceLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  occurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {occurrenceError && (
              <div className="text-red-500 text-sm mt-1">
                {occurrenceError}
              </div>
            )}
            {showDatePicker && (
              <div className="mt-2">
                <MFDateRangePicker />
              </div>
            )}
          </div>

          <div className="border-b">
            <div className="flex">
              <div className="flex items-center gap-2 min-w-[150px] px-4 py-2">
                <Checkbox
                  id="save-cloud"
                  checked={saveToCloud}
                  onCheckedChange={(checked) => {
                    setSaveToCloud(checked as boolean);
                    // Clear cloud error when checkbox is toggled - using exact same pattern
                    if (checked) {
                      setCloudError("");
                    }
                  }}
                  disabled={mode === "view"}
                />
                <Label htmlFor="save-cloud" className="text-sm font-medium dark:text-white">
                  Save to Cloud
                </Label>
              </div>
              <div className="flex items-center gap-2 min-w-[150px] px-4 py-2">
                <Checkbox
                  id="send-email"
                  checked={sendViaEmail}
                  onCheckedChange={(checked) => {
                    setSendViaEmail(checked as boolean);
                    // Clear email error when checkbox is toggled - using exact same pattern
                    if (checked) {
                      setEmailError("");
                    }
                  }}
                  disabled={mode === "view"}
                />
                <Label htmlFor="send-email" className="text-sm font-medium dark:text-white">
                  Send via Email
                </Label>
              </div>
            </div>
          </div>

          {sendViaEmail && (
            <div className="">
              {/* Dynamic Category Sections */}
              {getAvailableCategories().map((categoryKey, index) => {
                if (!categoryIncludes(categoryKey)) return null;
                
                const isFirstCategory = index === 0;
                const selectedMailingLists = isFirstCategory ? selectedInstallMailingLists : selectedEventMailingLists;
                const emails = isFirstCategory ? installEmails : eventEmails;
                const setEmails = isFirstCategory ? setInstallEmails : setEventEmails;
                const isDropdownOpen = isFirstCategory ? isInstallDropdownOpen : isEventDropdownOpen;
                const setIsDropdownOpen = isFirstCategory ? setIsInstallDropdownOpen : setIsEventDropdownOpen;
                const handleMailingListToggle = isFirstCategory ? handleInstallMailingListToggle : handleEventMailingListToggle;
                
                return (
                  <div key={categoryKey} className="space-y-6 rounded-lg border p-2 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-primary">
                          {getCategoryDisplayName(categoryKey)}
                        </h3>

                        {/* Copy from first category functionality */}
                        {index > 0 && categoryIncludes(getAvailableCategories()[0]) && hasInstallData() && (
                          <div className="flex gap-2">
                            {!isEventCopiedFromInstall ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={copyInstallToEvent}
                                disabled={mode === "view"}
                                className="text-xs"
                              >
                                📋 Copy from {getCategoryDisplayName(getAvailableCategories()[0])}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 font-medium">
                                  ✅ Copied from {getCategoryDisplayName(getAvailableCategories()[0])}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={clearEventData}
                                  disabled={mode === "view"}
                                  className="text-xs"
                                >
                                  🗑️ Clear
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {/* Selected mailing lists display */}
                        {selectedMailingLists.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {selectedMailingLists.map((listId) => {
                              const mailingListItem = mailinglist.find(
                                (ml) => ml.id === listId
                              );
                              if (!mailingListItem) return null;

                              return (
                                <div
                                  key={listId}
                                  className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                                >
                                  <span>{mailingListItem.mailing_list_name}</span>
                                  {mode !== "view" && (
                                    <X
                                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMailingListToggle(listId);
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Custom dropdown for selecting mailing lists */}
                        <div className="relative">
                          <div
                            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${mode === "view" ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() =>
                              mode !== "view" &&
                              setIsDropdownOpen(!isDropdownOpen)
                            }
                          >
                            <span className="flex-1">
                              {selectedMailingLists.length === 0
                                ? getMailingListPlaceholder(categoryKey)
                                : `${selectedMailingLists.length} mailing list${selectedMailingLists.length > 1 ? "s" : ""} selected`}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                            />
                          </div>

                          {isDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
                              {mailingListLoading ? (
                                <div className="flex justify-center items-center p-4">
                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                              ) : mailinglist.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                  No mailing lists available
                                </div>
                              ) : (
                                mailinglist.map((list) => {
                                  const isSelected = selectedMailingLists.includes(list.id);

                                  return (
                                    <div
                                      key={list.id}
                                      className="flex items-center gap-2 p-2 hover:bg-accent"
                                    >
                                      <Checkbox
                                        id={`${categoryKey}-mailing-list-checkbox-${list.id}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          if (mode !== "view") {
                                            handleMailingListToggle(list.id);
                                            // Clear email error when user selects a mailing list
                                            setEmailError("");
                                          }
                                        }}
                                        disabled={mode === "view"}
                                      />
                                      <Label
                                        htmlFor={`${categoryKey}-mailing-list-checkbox-${list.id}`}
                                        className="flex-1 cursor-pointer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (mode !== "view") {
                                            handleMailingListToggle(list.id);
                                          }
                                        }}
                                      >
                                        {list.mailing_list_name}
                                      </Label>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {emails.map((email, emailIndex) => (
                          <div key={emailIndex} className="space-y-1">
                            <div className="flex gap-2">
                              <Input
                                type="email"
                                placeholder={getEmailPlaceholder(categoryKey)}
                                value={email}
                                onChange={(e) => {
                                  if (isFirstCategory) {
                                    handleInstallEmailChange(emailIndex, e.target.value);
                                  } else {
                                    handleEventEmailChange(emailIndex, e.target.value);
                                  }
                                }}
                                className={`flex-1 ${(isFirstCategory ? installEmailErrors[emailIndex] : eventEmailErrors[emailIndex]) ? 'border-red-500 focus:ring-red-500' : ''}`}
                                disabled={mode === "view"}
                              />
                              {emailIndex === emails.length - 1 ? (
                                <Plus
                                  onClick={() => {
                                    setEmails([...emails, ""]);
                                    if (isFirstCategory) {
                                      setInstallEmailErrors([...installEmailErrors, ""]);
                                    } else {
                                      setEventEmailErrors([...eventEmailErrors, ""]);
                                    }
                                  }}
                                  className="mt-2 h-4 w-4 cursor-pointer text-primary"
                                />
                              ) : (
                                <Minus
                                  onClick={() => {
                                    setEmails(emails.filter((_, i) => i !== emailIndex));
                                    if (isFirstCategory) {
                                      setInstallEmailErrors(installEmailErrors.filter((_, i) => i !== emailIndex));
                                    } else {
                                      setEventEmailErrors(eventEmailErrors.filter((_, i) => i !== emailIndex));
                                    }
                                  }}
                                  className="mt-2 h-4 w-4 cursor-pointer text-primary"
                                />
                              )}
                            </div>
                            {(isFirstCategory ? installEmailErrors[emailIndex] : eventEmailErrors[emailIndex]) && (
                              <div className="text-red-500 text-xs ml-2">
                                {isFirstCategory ? installEmailErrors[emailIndex] : eventEmailErrors[emailIndex]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Display email configuration error - using exact same styling as deliveryoptionsmodal */}
              {emailError && (
                <div className="text-red-500 text-sm mt-2 ml-4">
                  {emailError}
                </div>
              )}
            </div>
          )}

          {saveToCloud && (
            <div className="space-y-4 rounded-lg border p-4 mt-4">
              <div className="border-b">
                <div className="flex">
                  { ["AWS" /* , "GCP", "Azure" */].map((provider) => (
                    <button
                      disabled={mode === "view"}
                      key={provider}
                      onClick={() =>
                        setSelectedCloudProvider(
                          provider as "AWS" /* | "GCP" | "Azure" */
                        )
                      }
                      className={`relative min-w-[100px] border-b-2 px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                        selectedCloudProvider === provider
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground"
                      }`}
                    >
                      {provider}
                    </button>
                  )) }
                </div>
              </div>
              {(() => {
                const config = cloudConfigs[selectedCloudProvider];
                return (
                  <>
                    <div className="space-y-2">
                      <Label className="dark:text-white">Secret Key</Label>
                      <Input
                        value={config.secretKey}
                        onChange={(e) => {
                          setCloudConfigs((prev) => ({
                            ...prev,
                            [selectedCloudProvider]: {
                              ...prev[selectedCloudProvider],
                              secretKey: e.target.value,
                            },
                          }));
                          // Clear cloud error when user types - using exact same pattern
                          if (e.target.value.trim() !== "") {
                            setCloudError("");
                          }
                        }}
                        placeholder={`Enter ${selectedCloudProvider} Secret Key`}
                        disabled={mode === "view"}
                        className="dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-white">Access Key</Label>
                      <Input
                        value={config.accessKey}
                        onChange={(e) => {
                          setCloudConfigs((prev) => ({
                            ...prev,
                            [selectedCloudProvider]: {
                              ...prev[selectedCloudProvider],
                              accessKey: e.target.value,
                            },
                          }));
                          // Clear cloud error when user types - using exact same pattern
                          if (e.target.value.trim() !== "") {
                            setCloudError("");
                          }
                        }}
                        placeholder={`Enter ${selectedCloudProvider} Access Key`}
                        disabled={mode === "view"}
                        className="dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-white">
                        {selectedCloudProvider === "AWS"
                          ? "Bucket Name"
                          : selectedCloudProvider === "GCP"
                            ? "Storage Name"
                            : "Container Name"}
                      </Label>
                      <Input
                        value={config.bucketName}
                        onChange={(e) => {
                          setCloudConfigs((prev) => ({
                            ...prev,
                            [selectedCloudProvider]: {
                              ...prev[selectedCloudProvider],
                              bucketName: e.target.value,
                            },
                          }));
                          // Clear cloud error when user types - using exact same pattern
                          if (e.target.value.trim() !== "") {
                            setCloudError("");
                          }
                        }}
                        placeholder={`Enter ${
                          selectedCloudProvider === "AWS"
                            ? "Bucket Name"
                            : selectedCloudProvider === "GCP"
                              ? "Storage Name"
                              : "Container Name"
                        }`}
                        disabled={mode === "view"}
                        className="dark:text-white"
                      />
                    </div>
                  </>
                );
              })()}
              
              {/* Display cloud configuration error - using exact same styling as deliveryoptionsmodal */}
              {cloudError && (
                <div className="text-red-500 text-sm mt-2">
                  {cloudError}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            onClick={onClose}
            className="text-white bg-primary"
            disabled={mode === "view"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="text-white bg-primary"
            disabled={mode === "view"}
          >
            {type === "schedule" ? "Schedule" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const DeliveryOptionsModal = (props: DeliveryOptionsModalProps) => {
  return (
    <DateRangeProvider>
      <DeliveryOptionsModalContent {...props} />
    </DateRangeProvider>
  );
};

export default DeliveryOptionsModal;
