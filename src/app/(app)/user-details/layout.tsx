"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layouts/AppLayout";

export default function UserDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeButton, setActiveButton] = useState("Security");

  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.includes("/user-details/security")) {
      setActiveButton("Security");
    }
  }, []);

  return (
    <AppLayout
      contentClassName={`flex-1 overflow-auto bg-gray-100 dark:bg-background ${
        activeButton === "Security" ? "p-8" : "p-4"
      }`}
    >
      {children}
    </AppLayout>
  );
}
