"use client"

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { ReceiptText, Scan, Sparkles, UploadCloud } from "lucide-react"
import { useTranslation } from "react-i18next"

export type ProcessingStageKey = "uploading" | "analyzing" | "extracting"

const STAGE_ORDER: ProcessingStageKey[] = ["uploading", "analyzing", "extracting"]

const DEFAULT_STAGE_DURATIONS: Record<ProcessingStageKey, number> = {
  uploading: 1.35,
  analyzing: 2.2,
  extracting: 1.25,
}

const STAGE_ICONS: Record<ProcessingStageKey, ReactNode> = {
  uploading: <UploadCloud className="h-5 w-5" />,
  analyzing: <Scan className="h-5 w-5" />,
  extracting: <Sparkles className="h-5 w-5" />,
}

type StageVisualState = "pending" | "active" | "complete"

interface ProcessingViewProps {
  stage: ProcessingStageKey
  stageDurations?: Partial<Record<ProcessingStageKey, number>>
}

export function ProcessingView({ stage, stageDurations }: ProcessingViewProps) {
  const { t } = useTranslation("receiptScanner")
  const durations = useMemo(
    () => ({
      ...DEFAULT_STAGE_DURATIONS,
      ...(stageDurations ?? {}),
    }),
    [stageDurations],
  )

  const stageIndex = useMemo(() => STAGE_ORDER.indexOf(stage), [stage])
  const progressValue = useMotionValue(0)
  const widthPercent = useTransform(progressValue, (v) => `${Math.min(v * 100, 100)}%`)
  const [timeRemaining, setTimeRemaining] = useState(durations[stage])

  // Animate the progress bar toward the next milestone whenever the active stage changes.
  useEffect(() => {
    const target = (stageIndex + 1) / STAGE_ORDER.length
    const controls = animate(progressValue, target, {
      duration: durations[stage],
      ease: "easeInOut",
    })
    return () => controls.stop()
  }, [durations, progressValue, stage, stageIndex])

  // Track countdown per stage for the helper text.
  useEffect(() => {
    const duration = durations[stage]
    setTimeRemaining(duration)
    let frameId: number
    const startTime = performance.now()

    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000
      const remaining = Math.max(duration - elapsed, 0)
      setTimeRemaining(remaining)
      if (remaining > 0) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [durations, stage])

  const stageStates: Record<ProcessingStageKey, StageVisualState> = useMemo(() => {
    return STAGE_ORDER.reduce<Record<ProcessingStageKey, StageVisualState>>((acc, key, index) => {
      if (index < stageIndex) {
        acc[key] = "complete"
      } else if (index === stageIndex) {
        acc[key] = "active"
      } else {
        acc[key] = "pending"
      }
      return acc
    }, {} as Record<ProcessingStageKey, StageVisualState>)
  }, [stageIndex])

  const etaSeconds = Math.max(Math.ceil(timeRemaining), 1)

  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-3 rounded-full border-2 border-primary/20"
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-background shadow-xl"
          animate={{
            y: [0, -4, 0],
            rotate: [0, 1.5, 0, -1.5, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
        >
          <ReceiptText className="h-12 w-12 text-primary" />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="absolute -bottom-2 flex items-center gap-1.5 rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-medium text-primary shadow-sm"
          >
            {STAGE_ICONS[stage]}
            <span>{t(`processing.stages.${stage}.label`)}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <h3 className="mb-3 text-lg font-semibold">{t("processing.title")}</h3>
      <AnimatePresence mode="wait">
        <motion.p
          key={`${stage}-description`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mb-6 text-sm text-muted-foreground"
        >
          {t(`processing.stages.${stage}.description`)}
        </motion.p>
      </AnimatePresence>

      <div className="w-full max-w-xl space-y-5">
        <div className="relative h-3 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full bg-primary" style={{ width: widthPercent }} />
          <div className="absolute inset-0 flex items-center justify-between px-5 text-xs font-semibold tracking-wide">
            {STAGE_ORDER.map((key) => (
              <span
                key={key}
                className={`rounded-full px-2.5 py-0.5 transition-colors ${
                  stageStates[key] !== "pending"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {t(`processing.stages.${key}.short`)}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-left">
          {STAGE_ORDER.map((key) => {
            const state = stageStates[key]
            return (
              <div
                key={key}
                className={`rounded-lg border bg-card/60 p-4 shadow-sm transition-colors ${
                  state === "active"
                    ? "border-primary/50 text-foreground"
                    : state === "complete"
                      ? "border-muted text-foreground"
                      : "border-transparent text-muted-foreground"
                }`}
              >
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <span className="text-primary/80">●</span>
                  {t(`processing.stages.${key}.short`)}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t(`processing.stages.${key}.helper`)}
                </p>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <span>{t("processing.wait")}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${stage}-${etaSeconds}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="font-medium text-primary"
            >
              {t("processing.eta", { seconds: Math.max(etaSeconds, 1) })}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Exported to allow other components to reuse the ordering/keys if needed.
export { STAGE_ORDER }
