"use client";
import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const TicketingTableSkeleton: React.FC<{ height?: number | string }> = ({ height }) => {
  return (
    <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in w-full" style={{ height: height ? `${height}px` : "auto" }}>
      {/* Search and Filter Bar Skeleton */}
      <div className="mb-6 animate-slide-in">
        <div className="flex flex-col md:flex-row gap-2 w-full">
          {/* Left Side: Search and Filters */}
          <div className="flex flex-col md:flex-row flex-1 gap-2">
            {/* Search Bar */}
            <div className="flex-1">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-2">
              <Skeleton className="h-10 w-full md:w-[140px] rounded-lg" style={{ animationDelay: "100ms" }} />
              <Skeleton className="h-10 w-full md:w-[140px] rounded-lg" style={{ animationDelay: "150ms" }} />
              <Skeleton className="h-10 w-full md:w-[140px] rounded-lg" style={{ animationDelay: "200ms" }} />
            </div>
          </div>
          {/* Right Side: Create Button */}
          <Skeleton className="h-10 w-full md:w-32 rounded-lg" style={{ animationDelay: "250ms" }} />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-t-lg overflow-hidden border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900/50">
              <TableHead>
                <Skeleton className="h-4 w-16 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-20 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-20 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-20 rounded" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16 rounded" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, index) => (
              <TableRow 
                key={index} 
                className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 animate-fade-in"
                style={{ 
                  animationDelay: `${index * 80}ms`,
                  animationFillMode: "both"
                }}
              >
                <TableCell>
                  <Skeleton className="h-4 w-12 rounded" />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 rounded" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24 rounded" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 rounded" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in" style={{ animationDelay: "600ms" }}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton 
              key={i}
              className="h-9 w-9 rounded-md" 
              style={{ animationDelay: `${700 + i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

