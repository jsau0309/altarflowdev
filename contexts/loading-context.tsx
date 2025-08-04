"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { BoxLoader } from '@/components/ui/box-loader'

interface LoadingContextType {
  showLoader: () => void
  hideLoader: () => void
  setDataLoading: (loading: boolean) => void
  isLoading: boolean
  isAuthTransition: boolean
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthTransition, setIsAuthTransition] = useState(false)
  const [dataIsLoading, setDataIsLoading] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const minTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showLoader = useCallback(() => {
    // Clear any existing timeout before creating new one
    if (minTimeoutRef.current) {
      clearTimeout(minTimeoutRef.current)
      minTimeoutRef.current = null
    }
    
    setIsLoading(true)
    setIsAuthTransition(true)
    setMinTimeElapsed(false)
    
    // Ensure minimum display time of 3 seconds for smooth UX
    minTimeoutRef.current = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 3000)
  }, [])

  const hideLoader = useCallback(() => {
    setIsLoading(false)
    setIsAuthTransition(false)
  }, [])

  const setDataLoading = useCallback((loading: boolean) => {
    setDataIsLoading(loading)
  }, [])

  // Hide loader only when both conditions are met:
  // 1. Data has finished loading
  // 2. Minimum display time has elapsed
  useEffect(() => {
    if (isAuthTransition && !dataIsLoading && minTimeElapsed) {
      hideLoader()
    }
  }, [isAuthTransition, dataIsLoading, minTimeElapsed, hideLoader])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (minTimeoutRef.current) {
        clearTimeout(minTimeoutRef.current)
      }
    }
  }, [])

  return (
    <LoadingContext.Provider value={{ showLoader, hideLoader, setDataLoading, isLoading, isAuthTransition }}>
      {isLoading && <BoxLoader />}
      {children}
    </LoadingContext.Provider>
  )
}

export const useLoading = () => {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}