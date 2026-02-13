import React, { useEffect, useState, useCallback } from "react";
import {
  useGetScheduleOccurrence,
  useGetDownloadOccurrence,
  useGetMailingListList,
  type MailingListListPayload,
} from "@/app/(app)/app-analytics/hooks/useReport";
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
import { DateRangeProvider, useDateRange } from "@/components/mf/DateRangeContext";

interface DeliveryOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "schedule" | "download";
  onSubmit: (payload: any) => void;
  defaultData?: any;
  mode?: any;
  frequency?: string;
  onFrequencyChange?: (value: string) => void;
  category?: string;
}

interface MailingList {
  id: string | number;
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
}: DeliveryOptionsModalProps) => {
  const { startDate, endDate } = useDateRange();
  const [sendViaEmail, setSendViaEmail] = useState(false);
  const [saveToCloud, setSaveToCloud] = useState(true);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<"AWS">("AWS");
  const [installEmails, setInstallEmails] = useState<string[]>([""]);
  const [eventEmails, setEventEmails] = useState<string[]>([""]);
  const [selectedInstallMailingLists, setSelectedInstallMailingLists] = useState<string[]>([]);
  const [selectedEventMailingLists, setSelectedEventMailingLists] = useState<string[]>([]);
  const [isInstallDropdownOpen, setIsInstallDropdownOpen] = useState(false);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isEventCopiedFromInstall, setIsEventCopiedFromInstall] = useState(false);
  const [cloudConfigs, setCloudConfigs] = useState({
    AWS: { accessKey: "", secretKey: "", bucketName: "" },
  });

  const [mailinglist, setMailinglist] = useState<MailingList[]>([]);
  const { selectedPackage } = usePackage();
  const [occurrenceOptions, setOccurrenceOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [occurrenceError, setOccurrenceError] = useState<string>("");
  const [cloudError, setCloudError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [installEmailErrors, setInstallEmailErrors] = useState<string[]>([""]);
  const [eventEmailErrors, setEventEmailErrors] = useState<string[]>([""]);
  const categoryIncludes = useCallback((value: string): boolean => {
    if (!category) return true;
    const categoryStr = String(category).trim().toLowerCase();
    const valueStr = value.trim().toLowerCase();
    return categoryStr === valueStr || categoryStr.includes(valueStr);
  }, [category]);

  // API hooks for occurrence
  const scheduleOccurrence = useGetScheduleOccurrence(selectedPackage || undefined, isOpen && type === "schedule");
  const downloadOccurrence = useGetDownloadOccurrence(selectedPackage || undefined, isOpen && type === "download");
  
  const occurrenceData = type === "schedule" ? scheduleOccurrence.data : downloadOccurrence.data;
  const occurrenceLoading = type === "schedule" ? scheduleOccurrence.isLoading : downloadOccurrence.isLoading;

  useEffect(() => {
    if (occurrenceData && Array.isArray(occurrenceData)) {
      setOccurrenceOptions(occurrenceData);
    }
  }, [occurrenceData]);

  // API hook for mailing lists
  const [mailingListPayload, setMailingListPayload] = useState<MailingListListPayload | undefined>(undefined);
  const { data: mailingListData, isLoading: mailingListLoading, refetch: refetchMailingList } = useGetMailingListList(
    mailingListPayload,
    !!mailingListPayload
  );

  useEffect(() => {
    if (mailingListData?.mailing_lists && Array.isArray(mailingListData.mailing_lists)) {
      setMailinglist(mailingListData.mailing_lists);
    }
  }, [mailingListData]);

  const refreshMailingList = useCallback(() => {
    if (selectedPackage && sendViaEmail && frequency) {
      setMailingListPayload({
        package_name: selectedPackage,
        page_number: 1,
        record_limit: 100,
        occurance: frequency,
      });
    } else if (selectedPackage && sendViaEmail) {
      // Call API even without frequency if sendViaEmail is true
      setMailingListPayload({
        package_name: selectedPackage,
        page_number: 1,
        record_limit: 100,
      });
    }
  }, [selectedPackage, frequency, sendViaEmail]);

  // Call mailing list API when modal opens, sendViaEmail is enabled, or frequency changes
  useEffect(() => {
    if (isOpen && sendViaEmail && selectedPackage) {
      refreshMailingList();
    }
  }, [isOpen, sendViaEmail, selectedPackage, frequency, refreshMailingList]);

  // Helper to map mailing list names to IDs
  const mapMailingListNamesToIds = useCallback((names: string[]): string[] => {
    return names
      .map((name) => {
        const found = mailinglist.find((ml) => ml.mailing_list_name === name);
        return found ? String(found.id) : null;
      })
      .filter((id): id is string => Boolean(id));
  }, [mailinglist]);

  // Initialize form data from defaultData
  useEffect(() => {
    if (!defaultData) return;

    const { email, aws } = defaultData;

    if (email?.status) {
      setSendViaEmail(true);
      const installEmailAddresses = email.install_to || email.to || [""];
      const eventEmailAddresses = email.event_to || email.to || [""];
      setInstallEmails(installEmailAddresses);
      setEventEmails(eventEmailAddresses);
      setInstallEmailErrors(new Array(installEmailAddresses.length).fill(""));
      setEventEmailErrors(new Array(eventEmailAddresses.length).fill(""));
    }

    if (aws?.status) {
      setSelectedCloudProvider("AWS");
      setSaveToCloud(true);
      setCloudConfigs({
        AWS: {
          accessKey: aws.aws_access_key_id || "",
          secretKey: aws.aws_secret_access_key || "",
          bucketName: aws.bucket_name || "",
        },
      });
    }
  }, [defaultData]);

  // Set mailing lists when data is loaded
  useEffect(() => {
    if (!defaultData?.email?.status || mailinglist.length === 0) return;

    const email = defaultData.email;
    const installMailingListNames = email.install_mail_id_list || email.mail_id_list || [];
    const eventMailingListNames = email.event_mail_id_list || email.mail_id_list || [];

    setSelectedInstallMailingLists(mapMailingListNamesToIds(installMailingListNames));
    setSelectedEventMailingLists(mapMailingListNamesToIds(eventMailingListNames));
  }, [mailinglist, defaultData, mapMailingListNamesToIds]);

  useEffect(() => {
    if (isOpen) {
      setSaveToCloud(false);
    }
  }, [isOpen, type]);

  useEffect(() => {
    setShowDatePicker(type === "download" && frequency === "Custom Range");
  }, [type, frequency]);

  const handleInstallMailingListToggle = useCallback((listId: string | number) => {
    if (mode === "view") return;
    const idStr = String(listId);
    
    setSelectedInstallMailingLists((prev: string[]) => {
      const isCurrentlySelected = prev.includes(idStr);
      const newSelection = isCurrentlySelected 
        ? prev.filter((id: string) => id !== idStr)
        : [...prev, idStr];
      
      if (newSelection.length > 0) {
        setEmailError("");
      }
      
      return newSelection;
    });
  }, [mode]);

  const handleEventMailingListToggle = useCallback((listId: string | number) => {
    if (mode === "view") return;
    const idStr = String(listId);
  
    setSelectedEventMailingLists((prev: string[]) => {
      const isCurrentlySelected = prev.includes(idStr);
      const newSelection = isCurrentlySelected 
        ? prev.filter((id: string) => id !== idStr)
        : [...prev, idStr];
     
      if (newSelection.length > 0) {
        setEmailError("");
      }
      
      return newSelection;
    });
  }, [mode]);


  // Function to copy install data to event section
  const copyInstallToEvent = () => {
    setSelectedEventMailingLists([...selectedInstallMailingLists]);
    setEventEmails([...installEmails]);
    setEventEmailErrors([...installEmailErrors]);
    setIsEventCopiedFromInstall(true);
    // Clear email error when copying data
    setEmailError("");
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
    return selectedInstallMailingLists.length > 0 || installEmails.some(email => email.trim() !== "");
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
      if ((isInstallDropdownOpen || isEventDropdownOpen) && !target.closest(".relative")) {
        setIsInstallDropdownOpen(false);
        setIsEventDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isInstallDropdownOpen, isEventDropdownOpen]);

  const getSelectedMailingListNames = useCallback((selectedIds: string[]) => {
    return selectedIds
      .map((id) => {
        const found = mailinglist.find((ml) => String(ml.id) === id);
        return found?.mailing_list_name;
      })
      .filter(Boolean) as string[];
  }, [mailinglist]);

  const handleConfirm = () => {
    // Clear any previous errors
    setOccurrenceError("");
    setCloudError("");
    setEmailError("");

    // Validate occurrence
    if(!frequency || frequency.trim() === ""){
      setOccurrenceError("Please select occurrence");
      return;
    }

    // Validate cloud configuration if save to cloud is enabled
    if(saveToCloud) {
      const config = cloudConfigs[selectedCloudProvider];
      if(!config.accessKey || !config.secretKey || !config.bucketName) {
        setCloudError("Please fill all cloud configuration fields");
        return;
      }
    }

    // Validate email configuration if send via email is enabled
    if(sendViaEmail) {
      let hasValidEmailConfig = false;
      
      // Check if install category is selected and has email configuration
      if (categoryIncludes("install")) {
        const hasInstallMailingLists = selectedInstallMailingLists.length > 0;
        const hasInstallEmails = installEmails.some(email => email.trim() !== "");
        if (hasInstallMailingLists || hasInstallEmails) {
          hasValidEmailConfig = true;
        }
        
      }
      
      // Check if event category is selected and has email configuration
      if (categoryIncludes("event")) {
        const hasEventMailingLists = selectedEventMailingLists.length > 0;
        const hasEventEmails = eventEmails.some(email => email.trim() !== "");
        if (hasEventMailingLists || hasEventEmails) {
          hasValidEmailConfig = true;
        }
        
      }
      
      if (!hasValidEmailConfig) {
        setEmailError("Please select mailing lists or enter email addresses");
        return;
      }
    }
    const cloudOptions = saveToCloud ? {
      aws: {
        status: true,
        aws_access_key_id: cloudConfigs.AWS.accessKey,
        aws_secret_access_key: cloudConfigs.AWS.secretKey,
        bucket_name: cloudConfigs.AWS.bucketName,
      },
    } : {};

    const installMailingListNames = getSelectedMailingListNames(selectedInstallMailingLists);
    const eventMailingListNames = getSelectedMailingListNames(selectedEventMailingLists);
    const filteredInstallEmails = installEmails.filter((email: string) => email.trim() !== "");
    const filteredEventEmails = eventEmails.filter((email: string) => email.trim() !== "");
    
    const hasInstallMailingLists = installMailingListNames.length > 0;
    const hasInstallEmails = filteredInstallEmails.length > 0;
    const hasEventMailingLists = eventMailingListNames.length > 0;
    const hasEventEmails = filteredEventEmails.length > 0;

    // Create separate delivery configurations for install and event
    const deliveryPayload: any = {};

    // Add install delivery options if install category is selected
    if (categoryIncludes("install")) {
      const installEmailSection = {
        status: sendViaEmail,
        mail_type: hasInstallMailingLists ? "group" : "individual",
        mail_id_list: installMailingListNames,
        email_group: installMailingListNames,
        to: filteredInstallEmails,
        subject: "",
        name: ""
      };

      deliveryPayload.install = {
        ...cloudOptions,
        email: installEmailSection
      };
    }

    // Add event delivery options if event category is selected
    if (categoryIncludes("event")) {
      const eventEmailSection = {
        status: sendViaEmail,
        mail_type: hasEventMailingLists ? "group" : "individual",
        mail_id_list: eventMailingListNames,
        email_group: eventMailingListNames,
        to: filteredEventEmails,
        subject: "",
        name: ""
      };

      deliveryPayload.event = {
        ...cloudOptions,
        email: eventEmailSection
      };
    }

    if(startDate && endDate){
      deliveryPayload.dateRange = {
        startDate: startDate,
        endDate: endDate,
      };
    }
    onSubmit(deliveryPayload);
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
                if (onFrequencyChange) {
                  onFrequencyChange(value);
                }
                // Clear error when user selects a frequency
                setOccurrenceError("");
              }}
              disabled={mode === "view" || mode === "edit"  }
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
            {showDatePicker && (
              <div className="mt-2">
                <MFDateRangePicker />
              </div>
            )}
            {occurrenceError && (
              <div className="text-red-500 text-sm mt-1">
                {occurrenceError}
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
                    // Clear cloud error when checkbox is toggled
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
                     // Clear email error when checkbox is toggled
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
              {/* Install Section */}

              <div className="space-y-6 rounded-lg border p-2 mt-4">
              {categoryIncludes("install") && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-primary">Install</h3>
                  
                  <div className="space-y-2">
                    {/* Selected install mailing lists display */}
                    {selectedInstallMailingLists.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedInstallMailingLists.map((listId) => {
                          const mailingListItem = mailinglist.find(ml => String(ml.id) === listId);
                          if (!mailingListItem) return null;
                          
                          return (
                            <div key={listId} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                              <span>{mailingListItem.mailing_list_name}</span>
                              {mode !== "view" && (
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInstallMailingListToggle(listId);
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Custom dropdown for selecting install mailing lists */}
                    <div className="relative">
                      <div 
                        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${mode === "view" ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => mode !== "view" && setIsInstallDropdownOpen(!isInstallDropdownOpen)}
                      >
                        <span className="flex-1">
                          {selectedInstallMailingLists.length === 0 
                            ? "Choose Install Mailing Lists" 
                            : `${selectedInstallMailingLists.length} mailing list${selectedInstallMailingLists.length > 1 ? 's' : ''} selected`
                          }
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isInstallDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isInstallDropdownOpen && (
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
                              const isSelected = selectedInstallMailingLists.includes(String(list.id));
                              
                              return (
                                <div 
                                  key={list.id}
                                  className="flex items-center gap-2 p-2 hover:bg-accent"
                                >
                                  <Checkbox 
                                    id={`install-mailing-list-checkbox-${list.id}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (mode !== "view") {
                                        handleInstallMailingListToggle(list.id);
                                      }
                                    }}
                                    disabled={mode === "view"}
                                  />
                                  <Label 
                                    htmlFor={`install-mailing-list-checkbox-${list.id}`}
                                    className="flex-1 cursor-pointer"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (mode !== "view") {
                                        handleInstallMailingListToggle(list.id);
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
                    {installEmails.map((email, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Enter Install Email"
                            value={email}
                            onChange={(e) => handleInstallEmailChange(index, e.target.value)}
                            className={`flex-1 ${installEmailErrors[index] ? 'border-red-500 focus:ring-red-500' : ''}`}
                            disabled={mode === "view"}
                          />
                          {index === installEmails.length - 1 ? (
                            <Plus
                              onClick={() => {
                                setInstallEmails([...installEmails, ""]);
                                setInstallEmailErrors([...installEmailErrors, ""]);
                              }}
                              className="mt-2 h-4 w-4 cursor-pointer text-primary"
                            />
                          ) : (
                            <Minus
                              onClick={() => {
                                setInstallEmails(installEmails.filter((_, i) => i !== index));
                                setInstallEmailErrors(installEmailErrors.filter((_, i) => i !== index));
                              }}
                              className="mt-2 h-4 w-4 cursor-pointer text-primary"
                            />
                          )}
                        </div>
                        {installEmailErrors[index] && (
                          <div className="text-red-500 text-xs ml-2">
                            {installEmailErrors[index]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>

              
              {/* Event Section */}
              {categoryIncludes("event") && (
                <div className="space-y-6 rounded-lg border p-2 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">Event</h3>
                    
                    {/* Copy from Install functionality */}
                    {categoryIncludes("install") && hasInstallData() && (
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
                            📋 Copy from Install
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 font-medium">✅ Copied from Install</span>
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
                    {/* Selected event mailing lists display */}
                    {selectedEventMailingLists.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedEventMailingLists.map((listId) => {
                          const mailingListItem = mailinglist.find(ml => String(ml.id) === listId);
                          if (!mailingListItem) return null;
                          
                          return (
                            <div key={listId} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                              <span>{mailingListItem.mailing_list_name}</span>
                              {mode !== "view" && (
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventMailingListToggle(listId);
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Custom dropdown for selecting event mailing lists */}
                    <div className="relative">
                      <div 
                        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${mode === "view" ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => mode !== "view" && setIsEventDropdownOpen(!isEventDropdownOpen)}
                      >
                        <span className="flex-1">
                          {selectedEventMailingLists.length === 0 
                            ? "Choose Event Mailing Lists" 
                            : `${selectedEventMailingLists.length} mailing list${selectedEventMailingLists.length > 1 ? 's' : ''} selected`
                          }
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isEventDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isEventDropdownOpen && (
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
                              const isSelected = selectedEventMailingLists.includes(String(list.id));
                              
                              return (
                                <div 
                                  key={list.id}
                                  className="flex items-center gap-2 p-2 hover:bg-accent"
                                >
                                  <Checkbox 
                                    id={`event-mailing-list-checkbox-${list.id}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (mode !== "view") {
                                        handleEventMailingListToggle(list.id);
                                      }
                                    }}
                                    disabled={mode === "view"}
                                  />
                                  <Label 
                                    htmlFor={`event-mailing-list-checkbox-${list.id}`}
                                    className="flex-1 cursor-pointer"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (mode !== "view") {
                                        handleEventMailingListToggle(list.id);
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
                    {eventEmails.map((email, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Enter Event Email"
                            value={email}
                            onChange={(e) => handleEventEmailChange(index, e.target.value)}
                            className={`flex-1 ${eventEmailErrors[index] ? 'border-red-500 focus:ring-red-500' : ''}`}
                            disabled={mode === "view"}
                          />
                          {index === eventEmails.length - 1 ? (
                            <Plus
                              onClick={() => {
                                setEventEmails([...eventEmails, ""]);
                                setEventEmailErrors([...eventEmailErrors, ""]);
                              }}
                              className="mt-2 h-4 w-4 cursor-pointer text-primary"
                            />
                          ) : (
                            <Minus
                              onClick={() => {
                                setEventEmails(eventEmails.filter((_, i) => i !== index));
                                setEventEmailErrors(eventEmailErrors.filter((_, i) => i !== index));
                              }}
                              className="mt-2 h-4 w-4 cursor-pointer text-primary"
                            />
                          )}
                        </div>
                        {eventEmailErrors[index] && (
                          <div className="text-red-500 text-xs ml-2">
                            {eventEmailErrors[index]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              )}
              
              {/* Email configuration error message */}
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
                  {["AWS"].map((provider) => (
                    <button
                      disabled={mode === "view"}
                      key={provider}
                      onClick={() =>
                        setSelectedCloudProvider(
                          provider as "AWS"
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
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="dark:text-white">Secret Key</Label>
                <Input
                  value={cloudConfigs.AWS.secretKey}
                  onChange={(e) => {
                    setCloudConfigs((prev) => ({
                      ...prev,
                      AWS: { ...prev.AWS, secretKey: e.target.value },
                    }));
                    if (e.target.value.trim() !== "") setCloudError("");
                  }}
                  placeholder="Enter AWS Secret Key"
                  disabled={mode === "view"}
                  className="dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-white">Access Key</Label>
                <Input
                  value={cloudConfigs.AWS.accessKey}
                  onChange={(e) => {
                    setCloudConfigs((prev) => ({
                      ...prev,
                      AWS: { ...prev.AWS, accessKey: e.target.value },
                    }));
                    if (e.target.value.trim() !== "") setCloudError("");
                  }}
                  placeholder="Enter AWS Access Key"
                  disabled={mode === "view"}
                  className="dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-white">Bucket Name</Label>
                <Input
                  value={cloudConfigs.AWS.bucketName}
                  onChange={(e) => {
                    setCloudConfigs((prev) => ({
                      ...prev,
                      AWS: { ...prev.AWS, bucketName: e.target.value },
                    }));
                    if (e.target.value.trim() !== "") setCloudError("");
                  }}
                  placeholder="Enter Bucket Name"
                  disabled={mode === "view"}
                  className="dark:text-white"
                />
              </div>
                 
                 {/* Cloud configuration error message */}
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
