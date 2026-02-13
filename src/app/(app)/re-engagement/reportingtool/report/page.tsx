"use client";

import ResizableTable, { type Column } from "@/components/mf/ReportingToolTable";
import type React from "react";
import { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useApiCall } from "../../queries/api_base";
import Endpoint from "@/app/(main)/(app)/app-analytics/common/endpoint";
import { debounce } from "@/lib/utils";
import { usePackage } from "@/components/mf/PackageContext";
import { useDateRange } from "@/components/mf/DateRangeContext";
import { useToast } from "@/hooks/use-toast";

import ToastContent, {
  ToastType,
} from "@/components/mf/ToastContent";
import { Loader2 } from "lucide-react";
import EllipsisTooltip from "@/components/mf/EllipsisTooltip";

// Create a client
const queryClient = new QueryClient();

interface AdGrpRowData {
  id: number;
  report_name: string;
  report_type: string;
  created_by: string;
  created_date: string;
  From_Date: string;
  To_Date: string;
  Report_Status: string;
  status: string;
  frequency?: string;
  last_run?: string;
  next_run?: string;
  download?: boolean;
  report_s3_link?: string;
  category?: string;
  report_differentiator?: string;
  report_date?: string;
}

// Add type for API response
interface ApiResponse {
  reports: AdGrpRowData[];
  total_pages: number;
  message?: string;
}

// Add type for status update payload
interface StatusUpdatePayload {
  id: number;
  status: string;
}

const CampaignOverviewPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [TotalRecord, setTotalRecord] = useState<number>(0);
  const { selectedPackage } = usePackage();
  const { startDate, endDate } = useDateRange();
  const { toast } = useToast();

  const [toastData, setToastData] = useState<{
    type: ToastType;
    title: string;
    description?: string;
    variant?: "default" | "destructive" | null;
  } | null>(null);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("Campaign Overview Logs");
  const [RowCount, setRowCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [selectedReport, setSelectedReport] = useState<Record<
    string,
    string | number
  > | null>(null);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(
    {
      from: subDays(new Date(), 7),
      to: new Date(),
    }
  );

  const [tableData, setTableData] = useState<AdGrpRowData[]>([]);
  const [searchTermReport, setSearchTermReport] = useState<string>("");

  const [localSearchTerm, setLocalSearchTerm] = useState<string>("");

  const searchInputRef = useRef<string>("");

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<{
    id: number;
    checked: boolean;
  } | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  // report api call
  const { result: reportApi, loading: reportLoading } = useApiCall<ApiResponse>(
    {
      // url1: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/summary-table`,
      url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/summary-table`,
      method: "POST",
      params: {
        package_name: selectedPackage,
        // package_name: "com.myairtelapp",
        report_name: searchTermReport,
        // start_date: startDate,
        // end_date: endDate,
        page_number: currentPage,
        record_limit: limit,
      },
      onSuccess: (response) => {
        if (Array.isArray(response.reports)) {
          setTableData(response.reports);
          setTotalRecord(response.total_pages);
        }
      },
      onError: (error) => {
        console.error("Error fetching reports:", error);
      },
    }
  );

  // Add status update API call
  const { result: statusUpdateApi, loading: statusUpdateLoading } = useApiCall<{
    message: string;
  }>({
   
    // url:`https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/report_status_change`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/report_status_change`,
    method: "POST",
    manual: true,
    onSuccess: (response) => {
      setToastData({
        type: "success",
        title: "Success",
        description: response.message || "Status updated successfully!",
        variant: "default",
      });
      // Refresh the report list
      if (reportApi && typeof (reportApi as any).mutate === "function") {
        (reportApi as any).mutate({
          package_name: selectedPackage,
          // package_name: "com.myairtelapp",
          report_name: searchTermReport,
          start_date: startDate,
          end_date: endDate,
          page: currentPage,
          page_size: limit,
        });
      }
    },
    onError: (error) => {
      console.error("Error updating status:", error);

      setToastData({
        type: "error",
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "default",
      });
      // Revert the status in the table
      setTableData((prevData) =>
        prevData.map((item) =>
          item.id === statusToUpdate?.id
            ? { ...item, status: !statusToUpdate.checked ? "True" : "False" }
            : item
        )
      );
    },
  });

  useEffect(() => {
    if (selectedPackage || searchTermReport !== undefined) {
      reportApi.mutate({
        package_name: selectedPackage,
        // package_name: "com.myairtelapp",
        report_name: searchTermReport,
        start_date: startDate,
        end_date: endDate,
        page: currentPage,
        page_size: limit,
      });
    }
  }, [
    selectedPackage,
    searchTermReport,
    startDate,
    endDate,
    currentPage,
    limit,
  ]);

  // Add polling effect
  useEffect(() => {
    // Start polling when component mounts
    const interval = setInterval(() => {
      reportApi.mutate({
        package_name: selectedPackage,
        // package_name: "com.myairtelapp",
        report_name: searchTermReport,
        start_date: startDate,
        end_date: endDate,
        page: currentPage,
        page_size: limit,
      });
    }, 5000); // Poll every 5 seconds

    setPollingInterval(interval);

    // Cleanup on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedPackage, searchTermReport, startDate, endDate, currentPage, limit]);

  // api call for delete
  const { result: deleteApi, loading: deleteLoading } = useApiCall({
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/delete_report`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/reengagement/delete_report`,
    method: "POST",
    manual: true,
    onSuccess: (response) => {
      setToastData({
        type: "success",
        title: "Success",
        description: response?.message,
        variant: "default",
      });
      reportApi.mutate({
        package_name: selectedPackage,
        // package_name: "com.myairtelapp",
        report_name: searchTermReport,
        start_date: startDate,
        end_date: endDate,
        page: currentPage,
        page_size: limit,
      });

      setDeleteDialogOpen(false);
      setRowToDelete(null);
    },
    onError: (error) => {
      console.error("Error deleting report:", error);
    },
  });

  // api call for clone report
  const { result: cloneApi, loading: cloneLoading } = useApiCall({
    url: process.env.NEXT_PUBLIC_USER_MANAGEMENT + Endpoint.REPORT_CLONE_API,
    method: "POST",
    manual: true,
    onSuccess: (response) => {
      setToastData({
        type: "success",
        title: "Success",
        description: "Report clone successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error cloning report:", error);
    },
  });

  const handleStatusChange = (
    id: number,
    field: "Report_Status" | "status",
    checked: boolean
  ) => {
    // Show confirmation dialog
    setStatusToUpdate({ id, checked });
    setStatusDialogOpen(true);
  };

  const confirmStatusUpdate = () => {
    if (
      statusToUpdate &&
      statusUpdateApi &&
      typeof (statusUpdateApi as any).mutate === "function"
    ) {
      const payload: StatusUpdatePayload = {
        id: statusToUpdate.id,
        status: statusToUpdate.checked ? "True" : "False",
      };

      // Update local state immediately for better UX
      setTableData((prevData) =>
        prevData.map((item) =>
          item.id === statusToUpdate.id
            ? { ...item, status: payload.status }
            : item
        )
      );

      // Call the status update API
      (statusUpdateApi as any).mutate(payload);
    }
    setStatusDialogOpen(false);
    setStatusToUpdate(null);
  };

  const handleDelete = (item: Record<string, string | number>) => {
    setRowToDelete(item.id as number);
    setDeleteDialogOpen(true);
  };

  const handleClone = (item: Record<string, string | number>) => {
    router.push(`/re-engagement/reportingtool/generate?id=${item.id}&mode=clone`);
  };

  const handleEdit = (item: Record<string, string | number>) => {
    router.push(`/re-engagement/reportingtool/generate?id=${item.id}&mode=edit`);
  };

  const confirmDelete = () => {
    if (rowToDelete) {
      console.log("rowToDelete", rowToDelete);
      deleteApi.mutate({
        doc_id: rowToDelete,
        package_name: selectedPackage
        // package_name: "com.myairtelapp"
      });
    }
  };

  const handleSend = (item: Record<string, string | number>) => {
    setSelectedReport(item);
    setEmailModalOpen(true);
  };

  const handleSendEmail = () => {
    setEmailTo("");
    setSelectedReport(null);
    setEmailModalOpen(false);
  };

  

  const adgrpcolumns: Column<AdGrpRowData>[] = [
    {
      title: "Report Name",
      key: "report_name",
      render: (data: AdGrpRowData) => (
        <div className="flex flex-col">
          <EllipsisTooltip content={data.report_name} />
        </div>
      ),
    },
    // { title: "Created By", key: "created_by" ,render: (data: AdGrpRowData) => (
    //   <div className="text-left">{data.created_by || "-"}</div>
    // )},
    {
      title: "Created Date",
      key: "created_date",
      
      render: (data: AdGrpRowData) => {
        const parsedDate = new Date(data.created_date.replace(" ", "T"));
        return (
          <EllipsisTooltip content={isNaN(parsedDate.getTime())
            ? "-"
            : format(parsedDate, "yyyy-MM-dd HH:mm:ss")} />
        );
      }
    },
    {
      title: "Frequency",
      key: "frequency",
      render: (data: AdGrpRowData) => (
        <div className="text-left">{data.frequency || "-"}</div>
      ),
    },
    {
      title: "Category",
      key: "category",
      render: (data: AdGrpRowData) => (
        <div className="text-left">{data.category}</div>
      ),
    },
    { title: "Report Category", key: "report_type" ,render: (data: AdGrpRowData) => (
      <div className="text-left">{data.report_type || "-"}</div>
    )},
    
    {
      title: "Report Date",
      key: "report_date",
      render: (data: AdGrpRowData) => (
        // <div className="text-left">{data.report_date || "-"}</div>
        <EllipsisTooltip content={data.report_date || "-"} />
      ),
    },
    { title: "Report Differentiator", key: "report_differentiator" ,render: (data: AdGrpRowData) => (
      <div className="text-left">{data.report_differentiator || "-"}</div>
    )},

    {
      title: "Last Run",
      key: "last_run",
      render: (data: AdGrpRowData) => (
        <EllipsisTooltip content={data.last_run || "-"} />
      ),
    },
    {
      title: "Next Run",
      key: "next_run",
      render: (data: AdGrpRowData) => (
        <EllipsisTooltip content={data.next_run || "-"} />
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (data: AdGrpRowData) => (
        <>
          {data.report_differentiator === "Download" ? (
            <div className="flex justify-center">-</div>
          
          ) : (
            <div className="flex justify-center">
              <Switch
                className="h-4 w-8 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                checked={
                  typeof data.status === "boolean"
                    ? data.status
                    : data.status === "True" || data.status === "true"
                }
                onCheckedChange={(checked) =>
                  handleStatusChange(data.id, "status", checked)
                }
              />
            </div>
          )}
        </>
      ),
    },
    // {
    //   title: "Download Status",
    //   key: "download_status",
    //   render: (data: AdGrpRowData) => (
    //     <div className="flex justify-center">
    //       {data.report_s3_link ? (
    //         <span className="text-green-600">Ready</span>
    //       ) : (
    //         <div className="flex items-center gap-2">
    //           <Loader2 className="h-4 w-4 animate-spin text-primary" />
    //           <span className="text-gray-500">Processing</span>
    //         </div>
    //       )}
    //     </div>
    //   ),
    // },
  ];


  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTermReport(term);
    }, 1000),
    []
  );

  // Handler for search input changes from ResizableTable
  const handleSearchChange = (term: string) => {
    if (
      term === "" ||
      (localSearchTerm && term.length < localSearchTerm.length)
    ) {
      setLocalSearchTerm(term);
      searchInputRef.current = term;
      debouncedSearch(term);
      return;
    }

    if (term.length === 1) {
      if (searchInputRef.current !== "" && !localSearchTerm.endsWith(term)) {
        setLocalSearchTerm(term);
        searchInputRef.current = term;
      } else {
        // Otherwise, append to the existing search
        const newTerm = localSearchTerm + term;
        setLocalSearchTerm(newTerm);
        searchInputRef.current = term;
        debouncedSearch(newTerm);
      }
    } else {
      setLocalSearchTerm(term);
      searchInputRef.current = term;
      debouncedSearch(term);
    }
  };

  const handleRefetch = (params?: { startDate?: Date; endDate?: Date }) => {
    if (params?.startDate && params?.endDate) {
      reportApi.mutate({
        package_name: selectedPackage,
        // package_name: "com.myairtelapp",
        report_name: searchTermReport,
        start_date: params.startDate,
        end_date: params.endDate,
        page: currentPage,
        page_size: limit,
      });
    }
  };

  const handleView = (item: Record<string, string | number>) => {
    console.log("View item:", item);
    router.push(`/re-engagement/reportingtool/generate?id=${item.id}&mode=view`);
  };


  return (
    <>
      {cloneLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      ) : (
        <QueryClientProvider client={queryClient}>
          <div className="relative bg-card">
            {toastData && (
              <ToastContent
                type={toastData.type}
                title={toastData.title}
                description={toastData.description}
                variant={toastData.variant}
              />
            )}
            <div className="p-2">
              <ResizableTable
                isPaginated={true}
                columns={adgrpcolumns ?? []}
                data={tableData ?? []}
                // data={ []}
                isLoading={false}
                isDownload={true}
                headerColor="#DCDCDC"
                itemCount={setRowCount}
                isSearchable={true}
                onDownload={(item: Record<string, string | number>) => {
                  if (item.report_s3_link) {
                    const link = document.createElement('a');
                    link.href = item.report_s3_link as string;
                    link.target = '_blank'; // or remove this if you want it in the same tab
                    link.download = ''; // optional: triggers download if it's a file
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else {
                    setToastData({
                      type: 'error',
                      title: 'Download Error',
                      description: 'No data to download',
                      variant: 'destructive',
                    });
                  }
                }}               
                SearchTerm={localSearchTerm}
                setSearchTerm={(term: string) => {
                  handleSearchChange(term);
                }}
                onLimitChange={(newLimit: number) => {
                  setLimit(newLimit);
                  setCurrentPage(1);
                }}
                onPageChangeP={(newPage: number) => {
                  setCurrentPage(newPage);
                }}
                pageNo={currentPage}
                totalPages={TotalRecord}
                isRefetch={false}
                onRefetch={handleRefetch}
                isEdit={true}
                onEdit={handleEdit}
                isSend={false}
                isView={true}
                onView={handleView}
                onSend={handleSend}
                isClone={true}
                onClone={handleClone}
                isSelectable={true}
                isDelete={true}
                onDelete={handleDelete}
                onGenerateReport={() =>
                  router.push("/re-engagement/reportingtool/generate")
                }
                isbuttonText={true}
                isPaginationStyled={true}
              />
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Delete</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  Are you sure you want to delete this report?
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deleteLoading}
                    className="text-white bg-primary hover:bg-primary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDelete}
                    disabled={deleteLoading}
                    className="text-white bg-primary hover:bg-primary"
                  >
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Report via Email</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter recipient's email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                    />
                  </div>
                  {selectedReport && (
                    <div className="text-sm text-muted-foreground">
                      Sharing report: {selectedReport.report_name}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => setEmailModalOpen(false)}
                    className="text-white bg-primary hover:bg-primary/90"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSendEmail}
                    disabled={!emailTo || !selectedReport}
                    className="text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50"
                  >
                    Send
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Status Change</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  Are you sure you want to{" "}
                  {statusToUpdate?.checked ? "enable" : "disable"} this report?
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => setStatusDialogOpen(false)}
                    disabled={statusUpdateLoading}
                    className="text-white bg-primary hover:bg-primary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmStatusUpdate}
                    disabled={statusUpdateLoading}
                    className="text-white bg-primary hover:bg-primary"
                  >
                    {statusUpdateLoading ? "Updating..." : "Confirm"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </QueryClientProvider>
      )}
    </>
  );
};

export default CampaignOverviewPage;