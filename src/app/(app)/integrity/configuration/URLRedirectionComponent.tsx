"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Copy, ArrowRight, Trash2, Loader2, Check } from "lucide-react";
import ResizableTable from "@/components/mf/ReportingToolTable";
import { useApiCall } from "@/services/api_base";
import { usePackage } from "@/components/mf/PackageContext";
import { MdEdit } from "react-icons/md";
import Endpoint from "../common/endpoint";

interface RedirectionResult {
  URL: string;
  status: string;
  status_code: number;
}

interface UrlRedirectionConfig {
  label: string;
  value: string;
}

interface UrlRedirectionData {
  "Target URL"?: string;
  "Target Block URL"?: string;
  status: boolean;
}

interface UrlRedirectionResponse {
  config: UrlRedirectionConfig[];
  data: UrlRedirectionData[];
}

interface GenerateUrlRequest {
  package_name: string;
  urls: string[];
}

interface GenerateUrlResponse {
  url: string;
  wrapped_url: string;
}

const URLRedirectionComponent = () => {
  const { selectedPackage } = usePackage();
  
  const [targetUrl, setTargetUrl] = useState("");
  const [targetBlockUrl, setTargetBlockUrl] = useState("");
  const [redirectionCheckUrl, setRedirectionCheckUrl] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<{[key: number]: boolean}>({});

  // Copy states for URL fields
  const [copiedTargetUrl, setCopiedTargetUrl] = useState(false);
  const [copiedBlockUrl, setCopiedBlockUrl] = useState(false);

  // Edit states for URL fields
  const [isEditingTargetUrl, setIsEditingTargetUrl] = useState(false);
  const [isEditingBlockUrl, setIsEditingBlockUrl] = useState(false);

  // Temporary values for editing
  const [tempTargetUrl, setTempTargetUrl] = useState("");
  const [tempTargetBlockUrl, setTempTargetBlockUrl] = useState("");

  // API call for URL redirection data
  const urlRedirectionApi = useApiCall<UrlRedirectionResponse>({
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.URL_REDIRECTION,
    method: "POST",
    params: {
      package_name:selectedPackage,
    },
    manual: false,
    onSuccess: (responseData) => {
      console.log("URL Redirection API Response:", responseData);
      setApiError(null); // Clear any previous errors
      
      if (responseData.data && Array.isArray(responseData.data)) {
        const data = responseData.data;
        const targetUrlData = data.find(item => item["Target URL"]);
        const blockUrlData = data.find(item => item["Target Block URL"]);
        
        if (targetUrlData?.["Target URL"]) {
          setTargetUrl(targetUrlData["Target URL"]);
          setTempTargetUrl(targetUrlData["Target URL"]);
        }
        
        if (blockUrlData?.["Target Block URL"]) {
          setTargetBlockUrl(blockUrlData["Target Block URL"]);
          setTempTargetBlockUrl(blockUrlData["Target Block URL"]);
        }
      }
    },
    onError: (error) => {
      console.error("URL Redirection API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to load URL configuration";
      setApiError(errorMessage);
    }
  });

  // API call for generating URLs
  const generateUrlApi = useApiCall<GenerateUrlResponse[]>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/generate_url",
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.GENERATE_URL,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Generate URL API Response:", responseData);
    },
    onError: (error) => {
      console.error("Generate URL API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to generate URL";
      setApiError(errorMessage);
    }
  });

  // API call for updating URL redirection
  const updateUrlRedirectionApi = useApiCall<{message: string}>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/update_url_redirection",
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.UPDATE_URL_REDIRECTION,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Update URL Redirection API Response:", responseData);
      setApiError(null);
      // Optionally show success message
    },
    onError: (error) => {
      console.error("Update URL Redirection API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to update URL redirection";
      setApiError(errorMessage);
    }
  });

  // API call for checking redirection
  const checkRedirectionApi = useApiCall<RedirectionResult[]>({
    // url: "https://uat-api-dev.mfilterit.net/v1/app/integrity/click/check_redirection",
    url:process.env.NEXT_PUBLIC_APP_PERF + Endpoint.CHECK_REDIRECTION,
    method: "POST",
    params: {},
    manual: true,
    onSuccess: (responseData) => {
      console.log("Check Redirection API Response:", responseData);
      setApiError(null);
      setRedirectionResults(responseData || []);
    },
    onError: (error) => {
      console.error("Check Redirection API Error:", error);
      const errorMessage = (error.response?.data as any)?.message || error.message || "Failed to check redirection";
      setApiError(errorMessage);
      setRedirectionResults([]); 
    }
  });

  // Trigger API call when selectedPackage changes
  useEffect(() => {
    if (selectedPackage && urlRedirectionApi.type === "mutation") {
      urlRedirectionApi.result.mutateAsync({
        package_name: selectedPackage,
      });
    }
  }, [selectedPackage]);

  // Generate URL rows management
  const [generateUrlRows, setGenerateUrlRows] = useState([
    { id: 1, inputUrl: "", generatedUrl: "", isLoading: false },
  ]);

  // Redirection check results
  const [redirectionResults, setRedirectionResults] = useState<
    RedirectionResult[]
  >([]);

  // Table column definitions
  const redirectionCheckColumns = [
    { title: "URL", key: "URL" },
    { title: "Status", key: "status" },
    { title: "Status Code", key: "status_code" },
  ];

  const handleAddUrlRow = () => {
    const newId = Math.max(...generateUrlRows.map((row) => row.id)) + 1;
    setGenerateUrlRows((prev) => [
      ...prev,
      { id: newId, inputUrl: "", generatedUrl: "", isLoading: false },
    ]);
  };

  const handleRemoveUrlRow = (id: number) => {
    if (generateUrlRows.length > 1) {
      setGenerateUrlRows((prev) => prev.filter((row) => row.id !== id));
    }
  };

  const handleInputUrlChange = (id: number, value: string) => {
    setGenerateUrlRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, inputUrl: value } : row))
    );
  };

  const handleGenerateUrl = async (id: number) => {
    const row = generateUrlRows.find(r => r.id === id);
    if (!row?.inputUrl) return;

    // Set loading state for this specific row
    setGenerateUrlRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, isLoading: true } : r
      )
    );

    try {
      if (generateUrlApi.type === "mutation") {
        const response = await generateUrlApi.result.mutateAsync({
          package_name: selectedPackage,
          urls: [row.inputUrl]
        });

        // Update the row with the generated URL
        setGenerateUrlRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  generatedUrl: response[0]?.wrapped_url || "",
                  isLoading: false,
                }
              : r
          )
        );
      }
    } catch (error) {
      console.error("Error generating URL:", error);
      // Stop loading on error
      setGenerateUrlRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isLoading: false } : r
        )
      );
    }
  };

  const handleCopyUrl = async (generatedUrl: string, rowId: number) => {
    if (!generatedUrl) return;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedUrl);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = generatedUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      // Set copied state for visual feedback
      setCopiedStates(prev => ({ ...prev, [rowId]: true }));
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [rowId]: false }));
      }, 2000);

    } catch (error) {
      console.error('Failed to copy URL:', error);
      
    }
  };

  const handleCopyUrlField = async (urlValue: string, field: 'target' | 'block') => {
    if (!urlValue) return;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(urlValue);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = urlValue;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      // Set copied state for visual feedback
      if (field === 'target') {
        setCopiedTargetUrl(true);
        setTimeout(() => setCopiedTargetUrl(false), 2000);
      } else {
        setCopiedBlockUrl(true);
        setTimeout(() => setCopiedBlockUrl(false), 2000);
      }

    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleCheckRedirection = async () => {
    if (!redirectionCheckUrl) return;

    try {
      if (checkRedirectionApi.type === "mutation") {
        await checkRedirectionApi.result.mutateAsync({
          package_name: selectedPackage,
          url: redirectionCheckUrl
        });
      }
    } catch (error) {
      console.error("Error checking redirection:", error);
    }
  };

  // URL field save handlers
  const handleSaveTargetUrl = async () => {
    try {
      if (updateUrlRedirectionApi.type === "mutation") {
        await updateUrlRedirectionApi.result.mutateAsync({
          package_name:selectedPackage,
          forward_url: tempTargetUrl // Only send the target URL being updated
        });
        
        // Only update state if API call was successful
        setTargetUrl(tempTargetUrl);
        setIsEditingTargetUrl(false);
        console.log("Target URL updated successfully:", tempTargetUrl);
      }
    } catch (error) {
      console.error("Failed to update target URL:", error);
      // Keep editing mode active on error
    }
  };

  const handleCancelTargetUrl = () => {
    setTempTargetUrl(targetUrl);
    setIsEditingTargetUrl(false);
  };

  const handleSaveBlockUrl = async () => {
    try {
      if (updateUrlRedirectionApi.type === "mutation") {
        await updateUrlRedirectionApi.result.mutateAsync({
          package_name: selectedPackage,
          block_url: tempTargetBlockUrl // Only send the block URL being updated
        });
        
        // Only update state if API call was successful
        setTargetBlockUrl(tempTargetBlockUrl);
        setIsEditingBlockUrl(false);
        console.log("Block URL updated successfully:", tempTargetBlockUrl);
      }
    } catch (error) {
      console.error("Failed to update block URL:", error);
      // Keep editing mode active on error
    }
  };

  const handleCancelBlockUrl = () => {
    setTempTargetBlockUrl(targetBlockUrl);
    setIsEditingBlockUrl(false);
  };

  const handleMoveToChecker = (generatedUrl: string) => {
    if (generatedUrl) {
      setRedirectionCheckUrl(generatedUrl);
      // Optionally scroll to the URL Redirection Checker section
      const checkerSection = document.querySelector('[data-checker-section]');
      if (checkerSection) {
        checkerSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleRedirectionTableRefresh = () => {
    setRedirectionResults([]);
    setRedirectionCheckUrl("");
    setApiError(null); // Clear any API errors when refreshing
  };

  // Add state for search term
  const [searchTerm, setSearchTerm] = useState("");


  return (
    <div>
      <div className="w-full bg-gray-200 text-sub-header font-semibold text-center sm:text-body p-2">
        URL Redirection & Generate URL
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-1 sm:gap-2">
        {/* URL Redirection & Generate URL Combined Section */}
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              {/* URL Redirection */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                  <CardTitle className="text-sm font-semibold text-gray-900">
                    URL Redirection
                  </CardTitle>
                </div>
                <div className="space-y-3">
                  {/* Target URL */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-2 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                      <span className="text-sm font-medium text-gray-700 sm:w-32 whitespace-nowrap dark:text-white">
                        Target URL :
                      </span>
                      {isEditingTargetUrl ? (
                        <Input
                          value={tempTargetUrl}
                          onChange={(e) => setTempTargetUrl(e.target.value)}
                          placeholder="Enter target URL"
                          className="flex-1 text-sm"
                        />
                      ) : (
                        <div className="flex-1 bg-gray-50 p-2 rounded border flex items-center">
                          {urlRedirectionApi.loading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900 break-all sm:truncate">
                              {targetUrl || "No URL configured"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end sm:justify-start">
                      {isEditingTargetUrl ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSaveTargetUrl}
                            className="text-xs"
                            disabled={updateUrlRedirectionApi.loading}
                          >
                            {updateUrlRedirectionApi.loading ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary" />
                                Saving...
                              </>
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCancelTargetUrl}
                            className="text-xs"
                            disabled={updateUrlRedirectionApi.loading}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyUrlField(targetUrl, 'target')}
                            disabled={!targetUrl}
                            className={`border-gray-200 hover:bg-gray-50 ${
                              copiedTargetUrl ? 'bg-green-50 border-green-200' : ''
                            }`}
                            title="Copy Target URL"
                          >
                            {copiedTargetUrl ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTempTargetUrl(targetUrl);
                              setIsEditingTargetUrl(true);
                            }}
                          >
                            <MdEdit className="h-4 w-4 text-primary" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Target Block URL */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-2 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                      <span className="text-sm font-medium text-gray-700 sm:w-32 whitespace-nowrap dark:text-white">
                        Target Block URL :
                      </span>
                      {isEditingBlockUrl ? (
                        <Input
                          value={tempTargetBlockUrl}
                          onChange={(e) =>
                            setTempTargetBlockUrl(e.target.value)
                          }
                          placeholder="Enter target block URL"
                          className="flex-1 text-sm"
                        />
                      ) : (
                        <div className="flex-1 bg-gray-50 p-2 rounded border flex items-center">
                          {urlRedirectionApi.loading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900 break-all sm:truncate">
                              {targetBlockUrl || "No URL configured"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end sm:justify-start">
                      {isEditingBlockUrl ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSaveBlockUrl}
                            className="text-xs"
                            disabled={updateUrlRedirectionApi.loading}
                          >
                            {updateUrlRedirectionApi.loading ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary" />
                                Saving...
                              </>
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelBlockUrl}
                            className="text-xs"
                            disabled={updateUrlRedirectionApi.loading}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyUrlField(targetBlockUrl, 'block')}
                            disabled={!targetBlockUrl}
                            className={`border-gray-200 hover:bg-gray-50 ${
                              copiedBlockUrl ? 'bg-green-50 border-green-200' : ''
                            }`}
                            title="Copy Target Block URL"
                          >
                            {copiedBlockUrl ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTempTargetBlockUrl(targetBlockUrl);
                              setIsEditingBlockUrl(true);
                            }}
                          >
                            <MdEdit className="h-4 w-4 text-primary" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate URL */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                  <CardTitle className="text-sm font-semibold text-gray-900">
                    Generate URL
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddUrlRow}
                    className="w-fit self-end sm:self-auto"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {generateUrlRows.map((row, index) => (
                    <div key={row.id} className="space-y-2">
                      {/* Mobile Layout */}
                      <div className="sm:hidden space-y-2">
                        <Input
                          value={row.inputUrl}
                          onChange={(e) =>
                            handleInputUrlChange(row.id, e.target.value)
                          }
                          placeholder="Enter URL"
                          className="w-full text-sm"
                        />

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleGenerateUrl(row.id)}
                            className="flex-1 text-sm dark:text-white"
                            size="sm"
                            disabled={row.isLoading || !row.inputUrl}
                          >
                            {row.isLoading ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-2 text-primary" />
                              </>
                            ) : (
                              "Generate →"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-fit self-end sm:self-auto"
                            onClick={() => handleMoveToChecker(row.generatedUrl)}
                            disabled={!row.generatedUrl}
                            title="Move to URL Checker"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            value={row.generatedUrl}
                            placeholder="Generated URL"
                            readOnly
                            className="flex-1 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyUrl(row.generatedUrl, row.id)}
                            disabled={!row.generatedUrl}
                            className={`border-gray-200 hover:bg-gray-50 ${
                              copiedStates[row.id] ? 'bg-green-50 border-green-200' : ''
                            }`}
                            title="Copy Generated URL"
                          >
                            {copiedStates[row.id] ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          {generateUrlRows.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveUrlRow(row.id)}
                              className=""
                            >
                              <Trash2 className="h-3 w-3 text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center gap-2">
                        <Input
                          value={row.inputUrl}
                          onChange={(e) =>
                            handleInputUrlChange(row.id, e.target.value)
                          }
                          placeholder="Enter URL"
                          className="flex-1 min-w-[150px]"
                        />

                        <Button
                          onClick={() => handleGenerateUrl(row.id)}
                          className="whitespace-nowrap dark:text-white"
                          size="sm"
                          disabled={row.isLoading || !row.inputUrl}
                        >
                          {row.isLoading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-2 text-primary" />
                              Generating...
                            </>
                          ) : (
                            "Generate →"
                          )}
                        </Button>

                        <div className="flex items-center gap-1 flex-1 min-w-[150px]">
                          <Input
                            value={row.generatedUrl}
                            placeholder="Generated URL"
                            readOnly
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyUrl(row.generatedUrl, row.id)}
                            disabled={!row.generatedUrl}
                            className={`border-gray-200 hover:bg-gray-50 ${
                              copiedStates[row.id] ? 'bg-green-50 border-green-200' : ''
                            }`}
                            title="Copy Generated URL"
                          >
                            {copiedStates[row.id] ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          className="border-primary"
                          onClick={() => handleMoveToChecker(row.generatedUrl)}
                          disabled={!row.generatedUrl}
                          title="Move to URL Checker"
                        >
                          <ArrowRight className="h-3 w-3"  />
                        </Button>

                        {generateUrlRows.length > 1 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveUrlRow(row.id)}
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
            </div>
          </CardContent>
        </Card>

        {/* URL Redirection Checker Section */}
        <Card className="shadow-sm" data-checker-section>
          <CardContent className="p-0">
            <div className="p-3 sm:p-6 ">
              <CardTitle className="text-sm font-semibold mb-2 text-gray-900">
                URL Redirection Checker
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                <Input
                  value={redirectionCheckUrl}
                  onChange={(e) => setRedirectionCheckUrl(e.target.value)}
                  placeholder="Enter URL"
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleCheckRedirection}
                  className="whitespace-nowrap w-full sm:w-auto dark:text-white"
                  size="sm"
                  disabled={checkRedirectionApi.loading || !redirectionCheckUrl}
                >
                  {checkRedirectionApi.loading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    "Check Redirection"
                  )}
                </Button>
              </div>
            </div>

            {/* Redirection Results Table */}
            {redirectionResults.length > 0 && (
              <div className="p-2 sm:p-4 ">
                <ResizableTable
                  columns={redirectionCheckColumns}
                  data={redirectionResults as unknown as Record<string, string | number>[]}
                  isPaginated={false}
                  isSearchable={true}
                  SearchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  headerColor="#f8f9fa"
                  isSelectable={false}
                  onRefresh={handleRedirectionTableRefresh}
                  isRefetch={false}
                  isFile={false}
                  isDownload={false}
                  isTableDownload={false}
                  isEdit={false}
                  isDelete={false}
                  isView={false}
                  isClone={false}
                  isSend={false}
                  isPause={false}
                  isPlay={false}
                  isUserTable={false}
                  height={200}
                  
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default URLRedirectionComponent; 