"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";
import { Download, X, Info } from "lucide-react";
import MultipleSelect from "@/components/ui/multiple-select";
import { MFSingleSelect } from "@/components/mf/MFSingleSelect";
import { ToggleButton } from "@/components/mf/ToggleButton";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import {
  useVtaEnablesPublishers,
  useGetAttributionWindow,
  useGetPayoutDetails,
  useGetCountryCodes,
  useGetConfiguredCountries,
  useSaveConfiguration,
} from "@/app/(main)/(app)/re-engagement/queries/vta-enables-publishers";
import ToastContent, { ToastType } from "@/components/mf/ToastContent";

const Configuration = () => {
  const { selectedPackage, isPackageLoading } = usePackage();
  const { startDate, endDate } = useDateRange();
  const [clickToInstallWindow, setClickToInstallWindow] = useState(0);
  const [installToEventWindow, setInstallToEventWindow] = useState(0);
  const [frequencyCap, setFrequencyCap] = useState(0);
  const [vtaEnablesPublishers, setVtaEnablesPublishers] = useState<string[]>(
    []
  );
  const [vtaPublishersList, setVtaPublishersList] = useState<string[]>([]);
  const [selectedVtaPublishers, setSelectedVtaPublishers] = useState<string[]>(
    []
  );
  const [vtaEnablesAgency, setVtaEnablesAgency] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState<string[]>([]);
  const [selectedRiskTolerance, setSelectedRiskTolerance] = useState<string>(
    ""
  );
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [selectedPublishersByType, setSelectedPublishersByType] = useState<{
    Impression: string[];
    Click: string[];
    Conversion: string[];
    Event: string[];
  }>({
    Impression: [],
    Click: [],
    Conversion: [],
    Event: [],
  });
  const [selectedGeos, setSelectedGeos] = useState<string[]>([]);
  const [selectedEventType, setSelectedEventType] = useState("Event");
  const [selectedRadio, setSelectedRadio] = useState("SDK");
  const [selectedPayoutType, setSelectedPayoutType] = useState("Impression");
  const [eventTableData, setEventTableData] = useState([
    { id: 1, eventName: "Content", sdkS2s: "Content", checked: true },
    { id: 2, eventName: "Content", sdkS2s: "Content", checked: false },
  ]);
  // Add a ref to track if we're in the middle of a payout type change
  const isChangingPayoutType = useRef(false);
  // Add a ref to track if we've initialized from API data
  const hasInitializedFromAPI = useRef(false);

  // VTA Enables Publishers API
  const vtaEnablesPublishersApi = useVtaEnablesPublishers();

  // Attribution Window API
  const attributionWindowApi = useGetAttributionWindow();

  // Payout Details API
  const payoutDetailsApi = useGetPayoutDetails();

  // Country Codes API
  const countryCodesApi = useGetCountryCodes();

  // Configured Countries API
  const configuredCountriesApi = useGetConfiguredCountries();

  // Save Configuration API
  const saveConfigurationApi = useSaveConfiguration();

  // Toast state for success/error messages
  const [toastData, setToastData] = useState<{
    type: ToastType;
    title: string;
    description?: string;
    variant?: "default" | "destructive" | null;
  } | null>(null);

  // Success and error handling for save operation
  useEffect(() => {
    if (
      saveConfigurationApi.type === "mutation" &&
      saveConfigurationApi.result.isSuccess
    ) {
      setToastData({
        type: "success",
        title: "Success",
        description: "Configuration saved successfully",
        variant: "default",
      });
    }
  }, [saveConfigurationApi.result.isSuccess]);

  useEffect(() => {
    if (
      saveConfigurationApi.type === "mutation" &&
      saveConfigurationApi.result.isError
    ) {
      setToastData({
        type: "error",
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    }
  }, [saveConfigurationApi.result.isError]);

  // Clear toast after 5 seconds
  useEffect(() => {
    if (toastData) {
      const timer = setTimeout(() => {
        setToastData(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastData]);

  // Payout details state
  const [payoutDetails, setPayoutDetails] = useState<{
    Impression: string[];
    Click: string[];
    Conversion: string[];
    Event: string[];
  }>({
    Impression: [],
    Click: [],
    Conversion: [],
    Event: [],
  });

  // Country codes state
  const [countryCodesList, setCountryCodesList] = useState<string[]>([]);

  // Configured countries state
  const [configuredCountriesList, setConfiguredCountriesList] = useState<
    string[]
  >([]);


  // Payout publishers options - use the same VTA publishers list as VTA Enables Publishers
  const payoutPublishersOptions =
    vtaPublishersList.length > 0 ? vtaPublishersList : [];

  // Filter selected publishers to only include those that are available in the options
  const validSelectedPublishers = selectedPublishers.filter(publisher =>
    payoutPublishersOptions.includes(publisher)
  );

  // Filter selected VTA publishers to only include those that are available in the options
  const validSelectedVtaPublishers = selectedVtaPublishers.filter(publisher =>
    vtaPublishersList.includes(publisher)
  );

  const eventTypeOptions = [
    "Event",
    "Click",
    "Install",
    "Conversion",
    "Registration",
  ];
  const riskToleranceOptions = ["Low", "Medium", "High"];

  // Table columns for events
  const eventColumns = [
    { title: "Event Name", key: "eventName" },
    { title: "SDK / S2S", key: "sdkS2s" },
    { title: "Status", key: "status" },
    { title: "Action", key: "action" },
  ];

  // Sample table data for events
  const [eventsTableData, setEventsTableData] = useState([
    {
      id: 1,
      eventName: "Content View",
      sdkS2s: "SDK",
      status: "Active",
      action: "Edit",
    },
    {
      id: 2,
      eventName: "Purchase",
      sdkS2s: "S2S",
      status: "Active",
      action: "Edit",
    },
    {
      id: 3,
      eventName: "Registration",
      sdkS2s: "SDK",
      status: "Inactive",
      action: "Edit",
    },
    {
      id: 4,
      eventName: "Login",
      sdkS2s: "S2S",
      status: "Active",
      action: "Edit",
    },
  ]);

  // Fetch Attribution Window data when component mounts or dependencies change
  useEffect(() => {
    if (selectedPackage && !isPackageLoading) {
      // Trigger the Attribution Window API call
      if (attributionWindowApi.type === "mutation") {
        attributionWindowApi.result.mutate({
          package_name: selectedPackage,
        });
      }
    }
  }, [selectedPackage, isPackageLoading]);

  // Handle Attribution Window API success
  useEffect(() => {
    if (
      attributionWindowApi.type === "mutation" &&
      attributionWindowApi.result.isSuccess
    ) {
      const data = attributionWindowApi.result.data;
      if (data) {
        setClickToInstallWindow(data["Click to Open Window (in Days)"] || 0);
        setInstallToEventWindow(data["Inactivity Window"] || 0);
        setFrequencyCap(data["Frequency Cap"] || 0);
        // Only set VTA publishers if we have the publishers list
        if (vtaPublishersList.length > 0) {
          const vtaPublishers = data["VTA Enables Publishers"];
          if (Array.isArray(vtaPublishers)) {
            const validPublishers = vtaPublishers.filter((publisher) =>
              vtaPublishersList.includes(publisher)
            );
            setSelectedVtaPublishers(validPublishers);
          } else {
            setSelectedVtaPublishers([]);
          }
        }
        setSelectedRiskTolerance(
          data["Risk Tolerence"] ? data["Risk Tolerence"] : ""
        );
      }
    }
  }, [
    attributionWindowApi.result.isSuccess,
    attributionWindowApi.result.data,
    vtaPublishersList,
  ]);

  // Fetch VTA Enables Publishers data when component mounts or dependencies change
  useEffect(() => {
    if (selectedPackage && startDate && endDate && !isPackageLoading) {
      // Trigger the API call
      if (vtaEnablesPublishersApi.type === "mutation") {
        vtaEnablesPublishersApi.result.mutate({
          package_name: selectedPackage,
          start_date: startDate,
          end_date: endDate,
        });
      }
    }
  }, [selectedPackage, startDate, endDate, isPackageLoading]);

  // Handle VTA Enables Publishers API success
  useEffect(() => {
    if (
      vtaEnablesPublishersApi.type === "mutation" &&
      vtaEnablesPublishersApi.result.isSuccess
    ) {
      const data = vtaEnablesPublishersApi.result.data;
      if (Array.isArray(data)) {
        setVtaPublishersList(data);

        // If we have attribution data, set the selected publishers now that we have the list
        if (attributionWindowApi.result.data) {
          const attributionData = attributionWindowApi.result.data;
          const vtaPublishers = attributionData["VTA Enables Publishers"];
          if (Array.isArray(vtaPublishers)) {
            const validPublishers = vtaPublishers.filter((publisher) =>
              data.includes(publisher)
            );
            setSelectedVtaPublishers(validPublishers);
          } else {
            setSelectedVtaPublishers([]);
          }
        }
      }
    }
  }, [
    vtaEnablesPublishersApi.result.isSuccess,
    vtaEnablesPublishersApi.result.data,
    attributionWindowApi.result.data,
  ]);

  // Fetch Payout Details data when component mounts or dependencies change
  useEffect(() => {
    if (selectedPackage && !isPackageLoading) {
      // Trigger the Payout Details API call
      if (payoutDetailsApi.type === "mutation") {
        payoutDetailsApi.result.mutate({
          package_name: selectedPackage,
        });
      }
    }
  }, [selectedPackage, isPackageLoading]);

  // Handle Payout Details API success
  useEffect(() => {
    if (
      payoutDetailsApi.type === "mutation" &&
      payoutDetailsApi.result.isSuccess
    ) {
      const data = payoutDetailsApi.result.data;
      if (data && data.payout_details && !hasInitializedFromAPI.current) {
        setPayoutDetails(data.payout_details);

        // Initialize selectedPublishersByType with data from API
        const publishersByType = {
          Impression: data.payout_details.Impression || [],
          Click: data.payout_details.Click || [],
          Conversion: data.payout_details.Conversion || [],
          Event: data.payout_details.Event || [],
        };
        setSelectedPublishersByType(publishersByType);

        // Set selected publishers based on current payout type, but filter against available options
        const currentPayoutPublishers =
          data.payout_details[
            selectedPayoutType as keyof typeof data.payout_details
          ] || [];
        const availablePublishers =
          vtaPublishersList.length > 0 ? vtaPublishersList : [];
        const filteredPublishers = currentPayoutPublishers.filter((publisher) =>
          availablePublishers.includes(publisher)
        );
        
        // Only set selected publishers if we have the publishers list loaded
        if (vtaPublishersList.length > 0) {
          setSelectedPublishers(filteredPublishers);
        }

        // Mark as initialized to prevent future overrides
        hasInitializedFromAPI.current = true;
      }
    }
  }, [
    payoutDetailsApi.result.isSuccess,
    payoutDetailsApi.result.data,
    selectedPayoutType,
    vtaPublishersList,
  ]);

  // FIXED: Load stored publishers when switching payout types
  useEffect(() => {
    // Skip if we're in the middle of changing payout type or if vtaPublishersList is empty
    if (isChangingPayoutType.current || vtaPublishersList.length === 0) {
      return;
    }

    // Load publishers for the current payout type
    const storedPublishers =
      selectedPublishersByType[
        selectedPayoutType as keyof typeof selectedPublishersByType
      ] || [];

    // Filter stored publishers to only include those that are available in the current options
    const availablePublishers = vtaPublishersList;
    const validStoredPublishers = storedPublishers.filter(publisher =>
      availablePublishers.includes(publisher)
    );

    // Only update if the valid stored publishers are different from current selection
    if (
      JSON.stringify(validStoredPublishers.sort()) !==
      JSON.stringify(selectedPublishers.sort())
    ) {
      setSelectedPublishers(validStoredPublishers);
    }
  }, [selectedPayoutType, vtaPublishersList]); // Removed selectedPublishersByType dependency

  // Debug: Log when selectedPublishers changes
  useEffect(() => {}, [selectedPublishers]);

  // Debug: Log when vtaPublishersList changes
  useEffect(() => {}, [vtaPublishersList]);

  // Clear selected publishers when publishers list is empty or loading
  useEffect(() => {
    if (vtaPublishersList.length === 0 && !vtaEnablesPublishersApi.loading) {
      setSelectedPublishers([]);
      setSelectedVtaPublishers([]);
    }
  }, [vtaPublishersList, vtaEnablesPublishersApi.loading]);

  // Validate selected publishers when publishers list changes
  useEffect(() => {
    if (vtaPublishersList.length > 0) {
      validateSelectedPublishers();
      validateSelectedVtaPublishers();
    }
  }, [vtaPublishersList]);

  // FIXED: Handle payout type change - save current publishers and switch type
  const handlePayoutTypeChange = (newPayoutType: string) => {
    // Set flag to prevent the loading useEffect from running during transition
    isChangingPayoutType.current = true;

    // Create a local copy of the current state and update it
    const currentPublishersByType = { ...selectedPublishersByType };
    currentPublishersByType[
      selectedPayoutType as keyof typeof currentPublishersByType
    ] = [...selectedPublishers];

    // Update the stored publishers
    setSelectedPublishersByType(currentPublishersByType);

    // Change the payout type
    setSelectedPayoutType(newPayoutType);

    // Load publishers for the new type
    const publishersForNewType =
      currentPublishersByType[
        newPayoutType as keyof typeof currentPublishersByType
      ] || [];
    setSelectedPublishers(publishersForNewType);

    // Reset flag after a brief delay to ensure all state updates are processed
    setTimeout(() => {
      isChangingPayoutType.current = false;
    }, 100);
  };

  // Fetch Country Codes data when component mounts or dependencies change
  useEffect(() => {
    if (selectedPackage && !isPackageLoading) {
      // Trigger the Country Codes API call
      if (countryCodesApi.type === "mutation") {
        countryCodesApi.result.mutate({
          package_name: selectedPackage,
        });
      }
    }
  }, [selectedPackage, isPackageLoading]);

  // Handle Country Codes API success
  useEffect(() => {
    if (
      countryCodesApi.type === "mutation" &&
      countryCodesApi.result.isSuccess
    ) {
      const data = countryCodesApi.result.data;
      if (Array.isArray(data)) {
        setCountryCodesList(data);
      }
    }
  }, [countryCodesApi.result.isSuccess, countryCodesApi.result.data]);

  // Fetch Configured Countries data when component mounts or dependencies change
  useEffect(() => {
    if (selectedPackage && !isPackageLoading) {
      // Trigger the Configured Countries API call
      if (configuredCountriesApi.type === "mutation") {
        configuredCountriesApi.result.mutate({
          package_name: selectedPackage,
        });
      }
    }
  }, [selectedPackage, isPackageLoading]);

  // Handle Configured Countries API success
  useEffect(() => {
    if (
      configuredCountriesApi.type === "mutation" &&
      configuredCountriesApi.result.isSuccess
    ) {
      const data = configuredCountriesApi.result.data;
      if (Array.isArray(data)) {
        setConfiguredCountriesList(data);
        // Set the configured countries as selected geos
        setSelectedGeos(data);
      }
    }
  }, [
    configuredCountriesApi.result.isSuccess,
    configuredCountriesApi.result.data,
  ]);

  const handleRuleToggle = (rule: string) => {
    setRuleSelections((prev) => ({
      ...prev,
      [rule]: !prev[rule as keyof typeof prev],
    }));
  };

  const removePublisher = (publisher: string) => {
    const newPublishers = selectedPublishers.filter((p) => p !== publisher);
    setSelectedPublishers(newPublishers);

    // Also update the stored publishers for current type
    setSelectedPublishersByType((prev) => ({
      ...prev,
      [selectedPayoutType]: newPublishers,
    }));
  };

  // Validate and clean up selected publishers to ensure they are all valid
  const validateSelectedPublishers = () => {
    const availablePublishers = payoutPublishersOptions;
    const validPublishers = selectedPublishers.filter(publisher =>
      availablePublishers.includes(publisher)
    );
    
    if (validPublishers.length !== selectedPublishers.length) {
      setSelectedPublishers(validPublishers);
      setSelectedPublishersByType((prev) => ({
        ...prev,
        [selectedPayoutType]: validPublishers,
      }));
    }
  };

  // Validate and clean up selected VTA publishers to ensure they are all valid
  const validateSelectedVtaPublishers = () => {
    const availablePublishers = vtaPublishersList;
    const validPublishers = selectedVtaPublishers.filter(publisher =>
      availablePublishers.includes(publisher)
    );
    
    if (validPublishers.length !== selectedVtaPublishers.length) {
      setSelectedVtaPublishers(validPublishers);
    }
  };

  const removeGeo = (geo: string) => {
    setSelectedGeos((prev) => prev.filter((g) => g !== geo));
  };

 

  // FIXED: Handle MultipleSelect changes
  const handlePublisherSelectionChange = (newPublishers: string[]) => {
    // Only allow selection of publishers that are actually available in the options
    const availablePublishers = payoutPublishersOptions;
    const validPublishers = newPublishers.filter(publisher => 
      availablePublishers.includes(publisher)
    );
    setSelectedPublishers(validPublishers);
  };

  const handlePublisherApply = (newPublishers: string[]) => {
    // Only allow selection of publishers that are actually available in the options
    const availablePublishers = payoutPublishersOptions;
    const validPublishers = newPublishers.filter(publisher => 
      availablePublishers.includes(publisher)
    );
    
    // Update both current selection and stored selection for the current type
    setSelectedPublishers(validPublishers);
    setSelectedPublishersByType((prev) => ({
      ...prev,
      [selectedPayoutType]: validPublishers,
    }));
  };

  const handleSaveConfiguration = () => {
    if (!selectedPackage) {
      return;
    }

    // Make sure we have the latest publishers for current type saved
    const finalPublishersByType = {
      ...selectedPublishersByType,
      [selectedPayoutType]: validSelectedPublishers,
    };

    const payload = {
      package_name: selectedPackage,
      update_data: {
        "Threshold Window": {
          "Click to Open Window (in Days)": clickToInstallWindow,
          "Inactivity Window": installToEventWindow,
          "Frequency Cap": frequencyCap,
          "VTA Enables Publishers": validSelectedVtaPublishers,
          "Risk Tolerence":
            selectedRiskTolerance
              ? selectedRiskTolerance.toLowerCase()
              : "low",
        },
        "Payout Details": {
          Impression: finalPublishersByType.Impression,
          Click: finalPublishersByType.Click,
          Conversion: finalPublishersByType.Conversion,
          Event: finalPublishersByType.Event,
        },
        "Geo Selection": selectedGeos,
      },
    };

    if (saveConfigurationApi.type === "mutation") {
      saveConfigurationApi.result.mutate(payload);
    }
  };

  return (
    <div className=" p-2 flex flex-col gap-6 w-full ">
      {/* Toast for success/error messages */}
      {toastData && (
        <ToastContent
          type={toastData.type}
          title={toastData.title}
          description={toastData.description}
          variant={toastData.variant}
        />
      )}

      {/* Main Content Area */}
      <Card>
        <CardContent className="">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Left Column - Configuration Settings */}
            <div className="space-y-2">
              <div className="space-y-2 border border-gray-200 rounded-lg p-2 bg-gray-200 dark:bg-background">
                <div>
                  <Label
                    htmlFor="clickToInstall"
                    className="text-body font-semibold dark:text-white pl-1"
                  >
                    Click to Install Window (in Days)
                  </Label>
                  <Input
                    id="clickToInstall"
                    type="number"
                    value={clickToInstallWindow}
                    onChange={(e) =>
                      setClickToInstallWindow(Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="installToEvent"
                    className="text-body font-semibold dark:text-white pl-1"
                  >
                    Inactivity Window
                  </Label>
                  <Input
                    id="installToEvent"
                    type="number"
                    value={installToEventWindow}
                    onChange={(e) =>
                      setInstallToEventWindow(Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="frequencyCap"
                    className="text-body font-semibold dark:text-white pl-1"
                  >
                    Frequency Cap
                  </Label>
                  <Input
                    id="frequencyCap"
                    type="number"
                    value={frequencyCap}
                    onChange={(e) => setFrequencyCap(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="vtaEnables"
                    className="text-body font-semibold dark:text-white pl-1"
                  >
                    VTA Enables Publishers
                  </Label>
                  <MultipleSelect
                    key="vta-publishers"
                    options={
                      vtaPublishersList.length > 0 ? vtaPublishersList : []
                    }
                    selectedValues={validSelectedVtaPublishers}
                    onSelectionChange={setSelectedVtaPublishers}
                    onApply={setSelectedVtaPublishers}
                    placeholder={
                      vtaEnablesPublishersApi.loading ||
                      attributionWindowApi.loading
                        ? "Loading..."
                        : vtaPublishersList.length === 0
                        ? "No publishers available"
                        : "Select publishers"
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="riskTolerance"
                      className="text-body font-semibold dark:text-white pl-1"
                    >
                      Risk Tolerance
                    </Label>
                    {/* <Info className="h-4 w-4 text-primary " /> */}
                  </div>
                  <MFSingleSelect
                    items={riskToleranceOptions.map(option => ({
                      title: option,
                      value: option
                    }))}
                    value={selectedRiskTolerance}
                    onValueChange={setSelectedRiskTolerance}
                    placeholder={
                      attributionWindowApi.loading
                        ? "Loading..."
                        : "Select risk tolerance"
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Middle Column - Payout Details & Geo Selection */}
            <div className="space-y-2 ">
              {/* Payout Details Card */}
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-200 dark:bg-background ">
                <Label className="text-body font-semibold">
                  Payout Details
                </Label>
                <div className="mt-3 space-y-2 text-body">
                  <ToggleButton
                    options={[
                      { label: "Impression", value: "Impression" },
                      { label: "Click", value: "Click" },
                      { label: "Conversion", value: "Conversion" },
                      { label: "Event", value: "Event" },
                    ]}
                    selectedValue={selectedPayoutType}
                    onChange={handlePayoutTypeChange}
                    className="w-full"
                  />
                  <div className="space-y-3">
                    <MultipleSelect
                      options={payoutPublishersOptions}
                      selectedValues={validSelectedPublishers}
                      onSelectionChange={handlePublisherSelectionChange}
                      onApply={handlePublisherApply}
                      placeholder={
                        vtaEnablesPublishersApi.loading ||
                        payoutDetailsApi.loading
                          ? "Loading..."
                          : payoutPublishersOptions.length === 0
                          ? "No publishers available"
                          : "Select publishers"
                      }
                      className="mt-1"
                    />
                    {validSelectedPublishers.length > 0 && payoutPublishersOptions.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50 dark:bg-card">
                        <div className="flex flex-wrap gap-2">
                          {validSelectedPublishers.map((publisher, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="flex items-center gap-1 text-white p-2"
                            >
                              {publisher}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removePublisher(publisher)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Geo Selection Card */}
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-200 space-y-2 dark:bg-background">
                <Label className="text-body font-semibold">Geo Selection</Label>
                <MultipleSelect
                  options={countryCodesList}
                  selectedValues={selectedGeos}
                  onSelectionChange={setSelectedGeos}
                  onApply={setSelectedGeos}
                  placeholder={
                    countryCodesApi.loading || configuredCountriesApi.loading
                      ? "Loading..."
                      : "Select geos"
                  }
                />
                {selectedGeos.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50 dark:bg-card">
                    <div className="flex flex-wrap gap-2 ">
                      {selectedGeos.map((geo, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1 p-2"
                        >
                          {geo}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeGeo(geo)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-center">
        <Button
          size="sm"
          className="w-24"
          onClick={handleSaveConfiguration}
          disabled={
            saveConfigurationApi.type === "mutation" &&
            saveConfigurationApi.result.isPending
          }
        >
          {saveConfigurationApi.type === "mutation" &&
          saveConfigurationApi.result.isPending
            ? "Saving..."
            : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default Configuration;