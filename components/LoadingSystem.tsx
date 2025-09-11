"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

interface LoadingSkeletonProps {
  variant?: "article" | "card" | "list" | "header" | "sidebar"
  count?: number
}

export function LoadingSkeleton({ variant = "card", count = 1 }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div key={i} className="animate-pulse">
      {variant === "article" && <ArticleSkeleton />}
      {variant === "card" && <CardSkeleton />}
      {variant === "list" && <ListSkeleton />}
      {variant === "header" && <HeaderSkeleton />}
      {variant === "sidebar" && <SidebarSkeleton />}
    </div>
  ))

  return <>{skeletons}</>
}

function ArticleSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-48 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  )
}

function CardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <div className="flex space-x-4 p-4">
      <Skeleton className="h-16 w-16 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex space-x-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-3/4" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex space-x-3">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageLoadingState() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <LoadingSkeleton variant="article" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoadingSkeleton variant="card" count={4} />
          </div>
        </div>
        <div className="space-y-6">
          <LoadingSkeleton variant="sidebar" />
        </div>
      </div>
    </div>
  )
}

export function ArticleLoadingState() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <LoadingSkeleton variant="article" />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    </div>
  )
}
