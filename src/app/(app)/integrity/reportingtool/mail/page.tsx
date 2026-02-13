"use client";

import ResizableTable, { type Column } from "@/components/mf/ReportingToolTable";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useApiCall } from "@/app/(main)/(app)/app-analytics/queries/api_base";
import { format } from "date-fns";
import { debounce } from "@/lib/utils";
import ToastContent, {
  ToastType,
} from "@/components/mf/ToastContent";
import { usePackage } from "@/components/mf/PackageContext";

const queryClient = new QueryClient();

interface AdGrpRowData {
  id: string | number;
  Report_Name: string;
  Report_Type: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  Report_Status: string;
  status: string;
  mailing_list_name: string;
  emails?: string[];
}

import { useFormik, FormikProvider, FieldArray, getIn } from "formik";
import * as Yup from "yup";

interface EmailListModalProps {
  mailingListApi: any;
  selectedMailingList: any;
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "view" | "edit";
  initialData?: {
    id: string | number;
    mailing_list_name: string;
    emails: string[];
  };
  onRefresh: () => void;
}

const EmailListModal = ({
  isOpen,
  onClose,
  mode = "create",
  initialData,
  mailingListApi,
  selectedMailingList,
  onRefresh,
}: EmailListModalProps) => {
  const [toastData, setToastData] = useState<{
    type: ToastType;
    title: string;
    description?: string;
    variant?: "default" | "destructive" | null;
  } | null>(null);
  const { toast } = useToast();
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const { selectedPackage } = usePackage();

  const mailingListNameRegex = /^[a-zA-Z _-]+$/;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validationSchema = Yup.object({
    mailing_list_name: Yup.string()
      .trim()
      .min(3, "Mailing list name must be at least 3 characters")
      .max(50, "Mailing list name cannot exceed 50 characters")
      .matches(
        mailingListNameRegex,
        "Mailing list name can only contain letters, numbers, spaces, dashes, and underscores"
      )
      .required("Mailing list name is required"),

    emails: Yup.array()
      .of(
        Yup.string()
          .trim()
          .matches(emailRegex, "Invalid email address")
          .required("Email is required")
      )
      .min(1, "At least one email is required"),
  });

  // Formik setup
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      mailing_list_name: initialData?.mailing_list_name || "",
      emails: initialData?.emails.length ? initialData.emails : [""],
    },
    validationSchema,
    onSubmit: async (values) => {
      if (isViewMode) {
        onClose();
        return;
      }

      try {
        if (isEditMode) {
          const mailingListId = selectedMailingList?.id;
          if (!mailingListId) {
          
            setToastData({
              type: "error",
              title: "Error",
              description: "Invalid mailing list ID. Cannot update.",
              variant: "default",
            });
            return;
          }

          updateMailingListMutation.mutate({
            mailing_list_id: mailingListId,
            mailing_list_name: values.mailing_list_name.trim(),
            status: "True",
            emails: values.emails,
            package_name: selectedPackage,
            // package_name: "com.myairtelapp",
          });
        } else {
          createMailingListMutation.mutate({
            package_name: selectedPackage,
            // package_name: "com.myairtelapp",
            mailing_list_name: values.mailing_list_name.trim(),
            status: "True",
            emails: values.emails,
          });
        }
      } catch (error) {
       

        setToastData({
          type: "error",
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "default",
        });
      }
    },
  });

  // API call for create mailing list
  const {
    loading: createMailingListLoading,
    result: createMailingListMutation,
  } = useApiCall({
    
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/create_mailing_list`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/create_mailing_list`,
    method: "POST",
    manual: true,
    onSuccess: () => {
      onClose();
      onRefresh();
      
      setToastData({
        type: "success",
        title: "Success",
        description: "Mailing list created successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      if (error?.response?.status === 200) {
        onClose();
        onRefresh();
       

        setToastData({
          type: "success",
          title: "Success",
          description: "Mailing list created successfully!",
          variant: "default",
        });
      } else {
       
        setToastData({
          type: "error",
          title: "Error",
          description:
            error?.response?.data?.message || "Failed to create mailing list.",
          variant: "default",
        });
      }
    },
  });

  // API call for update mailing list
  const {
    loading: updateMailingListLoading,
    result: updateMailingListMutation,
  } = useApiCall({
    
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/edit_mailing_list`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/edit_mailing_list`,
    method: "POST",
    manual: true,
    onSuccess: () => {
      onClose();
      onRefresh();
      

      setToastData({
        type: "success",
        title: "Success",
        description: "Mailing list updated successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      if (error?.response?.status === 200) {
        onClose();
        onRefresh();
       
        setToastData({
          type: "success",
          title: "Success",
          description: "Mailing list updated successfully!",
          variant: "default",
        });
      } else {
       
        setToastData({
          type: "error",
          title: "Error",
          description:
            error?.response?.data?.message || "Failed to update mailing list.",
          variant: "default",
        });
      }
    },
  });

  // Reset form on modal open/close or initial data change
  useEffect(() => {
    formik.resetForm({
      values: {
        mailing_list_name: initialData?.mailing_list_name || "",
        emails: initialData?.emails.length ? initialData.emails : [""],
      },
    });
  }, [initialData, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] rounded-lg bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isViewMode
              ? "View Mailing List"
              : isEditMode
                ? "Edit Mailing List"
                : "Create Mailing List"}
          </DialogTitle>
        </DialogHeader>

        <FormikProvider value={formik}>
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Mailing List Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Mailing List Name</Label>
                <Input
                  id="mailing_list_name"
                  name="mailing_list_name"
                  placeholder="Enter Mailing List Name"
                  disabled={isViewMode}
                  value={formik.values.mailing_list_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={
                    formik.touched.mailing_list_name &&
                    formik.errors.mailing_list_name
                      ? "border-red-500"
                      : ""
                  }
                />
                {formik.touched.mailing_list_name &&
                  formik.errors.mailing_list_name && (
                    <p className="mt-1 text-sm text-red-600">
                      {formik.errors.mailing_list_name}
                    </p>
                  )}
              </div>
            </div>

            {/* Emails Array */}
            <div className="space-y-2">
              <Label className="mb-2 block">Email Addresses</Label>
              <FieldArray
                name="emails"
                render={(arrayHelpers) => (
                  <>
                    {formik.values.emails.map((email, index) => {
                      const emailError = getIn(
                        formik.errors,
                        `emails[${index}]`
                      );
                      const emailTouched = getIn(
                        formik.touched,
                        `emails[${index}]`
                      );
                      return (
                        <div key={index} className="flex gap-2 items-center">
                          <div className="w-full">
                            <Input
                              id={`emails.${index}`}
                              name={`emails.${index}`}
                              type="email"
                              placeholder="Enter Email"
                              disabled={isViewMode}
                              value={email}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              className={
                                emailTouched && emailError
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            {emailTouched && emailError && (
                              <p className="ml-2 text-sm text-red-600">
                                {emailError}
                              </p>
                            )}
                          </div>

                          {!isViewMode && (
                            <>
                              {index === formik.values.emails.length - 1 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => arrayHelpers.push("")}
                                  className="shrink-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => arrayHelpers.remove(index)}
                                  className="shrink-0"
                                  disabled={formik.values.emails.length === 1}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              />
            </div>

            {/* Buttons */}
            <div className="mt-8 flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-full bg-white px-8 hover:bg-gray-50"
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>
              {!isViewMode && (
                <Button
                  type="submit"
                  className="rounded-full bg-primary px-8 text-white hover:bg-secondary"
                  disabled={
                    createMailingListLoading ||
                    updateMailingListLoading ||
                    !formik.isValid ||
                    !formik.dirty
                  }
                >
                  {createMailingListLoading || updateMailingListLoading
                    ? isEditMode
                      ? "Updating..."
                      : "Creating..."
                    : isEditMode
                      ? "Update"
                      : "Save"}
                </Button>
              )}
            </div>
          </form>
        </FormikProvider>
      </DialogContent>
    </Dialog>
  );
};

interface ApiResponse {
  status: string;
  message?: string;
  data?: any;
}

interface MailingListData {
  id: string | number;
  mailing_list_name: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  emails?: string[];
}

const mailingList: React.FC = () => {
  const [toastData, setToastData] = useState<{
    type: ToastType;
    title: string;
    description?: string;
    variant?: "default" | "destructive" | null;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [TotalRecord, setTotalRecord] = useState(0);
  const [limit, setLimit] = useState(10);
  const { toast } = useToast();
  const [RowCount, setRowCount] = useState(0);
  const [emailListModalOpen, setEmailListModalOpen] = useState(false);
  const [selectedMailingList, setSelectedMailingList] = useState<
    | {
        id: string | number;
        mailing_list_name: string;
        emails: string[];
      }
    | undefined
  >(undefined);
  const [tableData, setTableData] = useState<AdGrpRowData[]>([]);
  const [searchTermMail, setSearchTermMail] = useState<string>("");
  const [localSearchTerm, setLocalSearchTerm] = useState<string>("");
  const searchInputRef = useRef<string>("");

  const [modalMode, setModalMode] = useState<"create" | "view" | "edit">(
    "create"
  );

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<{
    id: string | number;
    // field: "Report_Status" | "status";
    checked: boolean;
  } | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const { selectedPackage } = usePackage();

  // Add status update API call
  const { result: updateStatusMutation } = useApiCall<{
      message: string;
    }>({
 
    // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/status_change`,
    url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/status_change`,
    method: "POST",
    manual: true,
    onSuccess: (response) => {
        setToastData({
          type: "success",
          title: "Success",
          description: "Status updated successfully!",
          variant: "default",
        });

        refreshMailingList();
    },
    onError: (error: any) => {
      

      setToastData({
        type: "error",
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to update status. Please try again.",
        variant: "default",
      });
    },
  });

  const handleStatusChange = (
    id: string | number,
    field: "Report_Status" | "status",
    checked: boolean
  ) => {
    setStatusToUpdate({ id,  checked });
    setStatusDialogOpen(true);
  };

  // const confirmStatusUpdate = async () => {
  //   if (!statusToUpdate) return;

  //   setStatusUpdateLoading(true);
  //   try {
  //     const mutation = updateStatusMutation as any;
      
  //     if (mutation?.mutate) {
  //       await mutation.mutate({
  //         id: statusToUpdate.id,
  //         status: statusToUpdate.checked ? "True" : "False",
  //       });
  //       setStatusDialogOpen(false);
  //       setStatusToUpdate(null);
  //     }
  //   } catch (error) {
  //     console.error("Error updating status:", error);
  //   } finally {
  //     setStatusUpdateLoading(false);
  //   }
  // };



  const confirmStatusUpdate = () => {
  if (
    statusToUpdate &&
    updateStatusMutation &&
    typeof (updateStatusMutation as any).mutate === "function"
  ) {
    const payload = {
      mailing_list_id: statusToUpdate.id,
      status: statusToUpdate.checked ? "True" : "False",
    };

    // Optimistically update table data
    setTableData((prevData) =>
      prevData.map((item) =>
        item.id === payload.id ? { ...item, status: payload.status } : item
      )
    );

    // Trigger mutation
    (updateStatusMutation as any).mutate(payload);
  }

  // Close dialog and clear selected item
  setStatusDialogOpen(false);
  setStatusToUpdate(null);
};

  const handleView = (data: Record<string, string | number | string[]>) => {
    const id = data.id || data.ID || data.Id; // Handle different ID field cases

    setSelectedMailingList({
      id: String(id), // Keep as string for MongoDB ObjectId
      mailing_list_name: String(
        data.mailing_list_name || data.mailingListName || ""
      ),
      emails: Array.isArray(data.emails) ? data.emails : [],
    });
    setModalMode("view");
    setEmailListModalOpen(true);
  };

  const handleEdit = (data: Record<string, string | number | string[]>) => {
    const id = data.id || data.ID || data.Id; // Handle different ID field cases

    setSelectedMailingList({
      id: String(id), // Keep as string for MongoDB ObjectId
      mailing_list_name: String(
        data.mailing_list_name || data.mailingListName || ""
      ),
      emails: Array.isArray(data.emails) ? data.emails : [],
    });
    setModalMode("edit");
    setEmailListModalOpen(true);
  };

  const handleCreateMailingList = () => {
    setSelectedMailingList(undefined);
    setModalMode("create");
    setEmailListModalOpen(true);
  };

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTermMail(term);
    }, 1000),
    []
  );

  const adgrpcolumns: Column<AdGrpRowData>[] = [
    { title: "Mailing List Name", key: "mailing_list_name" },
    { title: "Created By", key: "created_by" },
    {
      title: "Created Date",
      key: "created_at",
      render: (data: AdGrpRowData) => (
        <div className="text-left">
          {format(new Date(data.created_at), "yyyy-MM-dd HH:mm:ss")}
        </div>
      ),
    },
    { title: "Updated By", key: "updated_by" },
    {
      title: "Updated Date",
      key: "updated_at",
      render: (data: AdGrpRowData) => (
        <div className="text-left">
          {format(new Date(data.updated_at), "yyyy-MM-dd HH:mm:ss")}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (data: AdGrpRowData) => (
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
      ),
    },
  ];

  
  const { result: mailingListResult, loading: mailingListLoading } =
    useApiCall<{
      mailing_lists: MailingListData[];
      total_pages: number;
    }>({
    
      // url: `https://uat-api-dev.mfilterit.net/v1/app/reporting_tool/integrity/list_all_mailing_lists`,
      url: process.env.NEXT_PUBLIC_APP_PERF + `reporting_tool/integrity/list_all_mailing_lists`,
      method: "POST",
      manual: true,
      onSuccess: (data) => {
        if (Array.isArray(data?.mailing_lists)) {
          setTableData(data.mailing_lists);
          setTotalRecord(data.total_pages);
        }
      },
      onError: (error: any) => {
        console.error("Error fetching mailing list:", error);
       
         setToastData({
        type: "error",
        title: "Error",
        description: "Failed to fetch mailing lists. Please try again.",
        variant: "default",
      });
      },
    });

    console.log("selected package is",selectedPackage)

  // Function to refresh mailing list data
  const refreshMailingList = useCallback(() => {
    if (!selectedPackage) return; // Don't call API if no package is selected
    
    mailingListResult.mutate({
      page_number: currentPage,
      record_limit: limit,
      mailing_list_name: searchTermMail,
      package_name: selectedPackage
      // package_name: "com.myairtelapp"
    });
  }, [mailingListResult, currentPage, limit, searchTermMail, selectedPackage]);

  useEffect(() => {
    if (selectedPackage) { // Only call when we have a package
      refreshMailingList();
    }
  }, [limit, searchTermMail, currentPage, selectedPackage]); // Add selectedPackage as dependency

  // Add a separate effect to handle initial package load
  useEffect(() => {
    if (selectedPackage) {
      refreshMailingList();
    }
  }, [selectedPackage]); // This will trigger when package is first loaded

  const handleSearchChange = (term: string) => {
    setLocalSearchTerm(term);
    debouncedSearch(term);
  };

  return (
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
        <div className="p-4">
          <ResizableTable
            isPaginated={true}
            columns={adgrpcolumns ?? []}
            data={tableData}
            isLoading={mailingListLoading}
            headerColor="#DCDCDC"
            itemCount={setRowCount}
            isSearchable={true}
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
            isEdit={true}
            isView={true}
            isClone={false}
            isSelectable={true}
            onGenerateReport={handleCreateMailingList}
            buttonTextName="Create Mailing List"
            onView={handleView}
            onEdit={handleEdit}
            isbuttonText={true}
          />
          <EmailListModal
            isOpen={emailListModalOpen}
            onClose={() => {
              setEmailListModalOpen(false);
              setSelectedMailingList(undefined);
            }}
            mode={modalMode}
            initialData={selectedMailingList}
            mailingListApi={{ result: mailingListResult }}
            selectedMailingList={selectedMailingList}
            onRefresh={refreshMailingList}
          />
        </div>
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Status Change</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              Are you sure you want to{" "}
              {statusToUpdate?.checked ? "enable" : "disable"} this mailing
              list?
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
  );
};

export default mailingList;


