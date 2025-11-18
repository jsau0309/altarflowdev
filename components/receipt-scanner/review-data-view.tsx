"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"
import { RefreshCw, Check, AlertCircle, X } from "lucide-react"

type ConfidenceLevel = "high" | "medium" | "low"

interface ExtractedConfidence {
  vendor?: ConfidenceLevel
  total?: ConfidenceLevel
  date?: ConfidenceLevel
  description?: ConfidenceLevel
}

interface ReviewData {
  vendor: string
  total: string
  date: string
  description: string
  items?: Array<{ description: string; amount: string }>
  taxAmount?: string
  receiptImage?: string | null
  receiptUrl?: string | null
  confidence?: ExtractedConfidence | ConfidenceLevel
}

interface ReviewDataViewProps {
  data: ReviewData
  onAccept: (updatedData: ReviewData) => void
  onCancel: () => void
  onRescan: () => void
}

function ConfidenceBadge({ level, label }: { level?: ConfidenceLevel; label: string }) {
  if (!level) return null

  const colors: Record<ConfidenceLevel, string> = {
    high: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border border-amber-200",
    low: "bg-rose-100 text-rose-700 border border-rose-200",
  }

  return <Badge className={`pointer-events-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[level]}`}>{label}</Badge>
}

function ConfidenceIcon({ level }: { level?: ConfidenceLevel }) {
  if (!level) return null

  const iconConfig: Record<ConfidenceLevel, { Component: typeof Check; className: string }> = {
    high: {
      Component: Check,
      className: "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
    },
    medium: {
      Component: AlertCircle,
      className: "flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white"
    },
    low: {
      Component: X,
      className: "flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white"
    },
  }

  const { Component, className } = iconConfig[level]
  return (
    <div className={className}>
      <Component className="h-3 w-3" />
    </div>
  )
}

export function ReviewDataView({ data, onAccept, onCancel, onRescan }: ReviewDataViewProps) {
  const { t } = useTranslation("receiptScanner")
  const [editedData, setEditedData] = useState<ReviewData>(data)

  useEffect(() => {
    setEditedData(data)
  }, [data])

  const fieldConfidence: ExtractedConfidence = typeof data.confidence === "string"
    ? { vendor: data.confidence, total: data.confidence, date: data.confidence }
    : data.confidence || {}

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setEditedData(prev => ({ ...prev, [name]: value }))
  }

  const handleClearField = (field: keyof ReviewData) => {
    setEditedData(prev => ({ ...prev, [field]: "" }))
  }

  const handleResetField = (field: keyof ReviewData) => {
    setEditedData(prev => ({ ...prev, [field]: data[field] ?? "" }))
  }

  const validationWarnings = useMemo(() => {
    const warnings: string[] = []

    if (!editedData.vendor?.trim()) {
      warnings.push(t("receiptScanner:review.validation.missingVendor"))
    }

    const totalNumber = Number.parseFloat(editedData.total)
    if (!Number.isFinite(totalNumber) || totalNumber <= 0) {
      warnings.push(t("receiptScanner:review.validation.invalidTotal"))
    }

    if (!editedData.date || Number.isNaN(new Date(editedData.date).getTime())) {
      warnings.push(t("receiptScanner:review.validation.invalidDate"))
    }

    return warnings
  }, [editedData, t])

  const hasLowConfidence = useMemo(
    () => Object.values(fieldConfidence).some(level => level === "low"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.confidence] // Using data.confidence instead of fieldConfidence to avoid recalculation on every render
  )

  const fieldConfigs: Array<{
    key: keyof ReviewData
    label: string
    type?: string
    helper?: string
    inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"]
  }> = [
    { key: "vendor", label: t("receiptScanner:review.vendor") },
    { key: "date", label: t("receiptScanner:review.date"), type: "date" },
    { key: "total", label: t("receiptScanner:review.totalAmount"), type: "number", inputMode: "decimal" },
    { key: "description", label: t("receiptScanner:review.description") },
  ]

  const confidenceLabel = (level?: ConfidenceLevel) => {
    if (!level) return undefined
    return t(`receiptScanner:review.confidence.${level}`)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden md:-m-6">
      <div className="px-4 pt-5 pb-3 md:px-6 md:pt-6 md:pb-4">
        <h2 className="text-lg font-semibold text-center md:text-left">{t("receiptScanner:review.title")}</h2>
        <p className="text-sm text-muted-foreground text-center md:text-left">{t("receiptScanner:review.success")}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 md:px-6">
        <Card className="border border-primary/10">
          <CardHeader className="space-y-2 border-b bg-primary/5 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base font-semibold text-center md:text-left">
                {t("receiptScanner:review.extractedData")}
              </CardTitle>
              <div className="flex justify-center md:justify-end">
                <ConfidenceBadge
                  level={fieldConfidence.vendor || fieldConfidence.total || fieldConfidence.date}
                  label={
                    confidenceLabel(fieldConfidence.vendor || fieldConfidence.total || fieldConfidence.date) ||
                    t("receiptScanner:review.confidence.unknown")
                  }
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              {t("receiptScanner:review.quickEditHelper")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
              {fieldConfigs.map(field => {
                const key = field.key
                const value = (editedData[key] as string) ?? ""
                const confidence = fieldConfidence[key as keyof ExtractedConfidence]
                const hasWarning =
                  (key === "vendor" && !value.trim()) ||
                  (key === "total" && (Number.parseFloat(value) <= 0 || Number.isNaN(Number.parseFloat(value)))) ||
                  (key === "date" && (!value || Number.isNaN(new Date(value).getTime())))

                return (
                  <div key={String(key)} className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={String(key)} className="text-sm font-medium">
                        {field.label}
                      </Label>
                      <div className="flex items-center gap-1.5">
                        {key !== "description" && <ConfidenceIcon level={confidence} />}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleClearField(key)}
                        >
                          {t("receiptScanner:review.clearField")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleResetField(key)}
                        >
                          {t("receiptScanner:review.resetField")}
                        </Button>
                      </div>
                    </div>
                    <Input
                      id={String(key)}
                      name={String(key)}
                      value={value}
                      type={field.type}
                      inputMode={field.inputMode}
                      onChange={handleInputChange}
                      className={`${hasWarning ? "border-rose-300 focus-visible:ring-rose-400" : ""} ${field.type === "date" ? "[&::-webkit-calendar-picker-indicator]:cursor-pointer" : ""}`}
                    />
                  </div>
                )
              })}

              <div className={`rounded-lg p-3 text-xs transition-colors ${
                validationWarnings.length === 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
                <p className="font-medium text-current">{t("receiptScanner:review.quickValidationTitle")}</p>
                {validationWarnings.length === 0 ? (
                  <p className="text-current">{t("receiptScanner:review.quickValidationPass")}</p>
                ) : (
                  <>
                    <ul className="mt-1 list-disc pl-4 text-current">
                      {validationWarnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                    {hasLowConfidence && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 h-8 border-rose-300 text-rose-700 hover:bg-rose-100"
                        onClick={onRescan}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("receiptScanner:review.rescanButton")}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background px-4 py-4 md:px-6 md:py-6">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          {t("receiptScanner:review.cancelButton")}
        </Button>
        <Button className="flex-1" onClick={() => onAccept(editedData)} disabled={validationWarnings.length > 0}>
          {t("receiptScanner:review.useDataButton")}
        </Button>
      </div>
    </div>
  )
}
