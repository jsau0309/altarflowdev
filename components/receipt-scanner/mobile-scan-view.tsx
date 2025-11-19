"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { Flashlight, FlashlightOff, Focus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

interface MobileScanViewProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
}

export function MobileScanView({ onCapture, onCancel }: MobileScanViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isFlashSupported, setIsFlashSupported] = useState(false)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [focusPulse, setFocusPulse] = useState(false)
  const { t } = useTranslation("receiptScanner")

  useEffect(() => {
    let activeStream: MediaStream | null = null
    let isMounted = true

    async function setupCamera() {
      try {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: isIOS ? 3840 : 1920, min: 1280 },
            height: { ideal: isIOS ? 2160 : 1080, min: 720 },
            aspectRatio: { ideal: 16 / 9 },
            ...(isIOS && {
              advanced: [
                {
                  width: { min: 1920 },
                  height: { min: 1080 },
                },
              ],
            }),
          },
        })

        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop())
          return
        }

        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        activeStream = mediaStream
      } catch (error) {
        console.error("Error accessing camera:", error)
      }
    }

    setupCamera()

    return () => {
      isMounted = false
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    const track = stream?.getVideoTracks()?.[0]
    if (!track) return

    const capabilities = track.getCapabilities?.()
    if (capabilities && "torch" in capabilities) {
      setIsFlashSupported(true)
    }
  }, [stream])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const interval = setInterval(() => {
      setFocusPulse(true)
      timeout = setTimeout(() => setFocusPulse(false), 650)
    }, 3200)

    return () => {
      clearInterval(interval)
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [])

  const toggleFlash = async () => {
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return

    try {
      // @ts-expect-error - torch is a valid constraint but not in TypeScript types
      // See: https://www.w3.org/TR/mediacapture-streams/#dom-constrainablevideo
      await track.applyConstraints({ advanced: [{ torch: !isFlashOn }] })
      setIsFlashOn(prev => !prev)
    } catch (error) {
      console.warn("Torch toggle failed", error)
    }
  }

  const captureImage = async () => {
    if (!(videoRef.current && canvasRef.current)) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsCapturing(true)
    if ("vibrate" in navigator) {
      navigator.vibrate?.(35)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = canvas.toDataURL("image/jpeg", 0.95)
    onCapture(imageData)

    if (stream) {
      if (isFlashOn) {
        try {
          // @ts-expect-error - torch is a valid constraint but not in TypeScript types
          // See: https://www.w3.org/TR/mediacapture-streams/#dom-constrainablevideo
          await stream.getVideoTracks()[0]?.applyConstraints({ advanced: [{ torch: false }] })
        } catch (error) {
          console.warn("Unable to disable torch", error)
        }
      }
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }

    setTimeout(() => setIsCapturing(false), 260)
  }

  return (
    <div className="relative flex h-full min-h-[560px] w-full flex-col overflow-hidden rounded-[32px] border border-border bg-black shadow-2xl">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/80" />

      <div className="pointer-events-none absolute inset-4 rounded-[28px] border border-white/15" />

      <AnimatePresence>
        {focusPulse && (
          <motion.div
            key="focus"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 0.9 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/10 p-5"
          >
            <Focus className="h-5 w-5 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCapturing && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/70 disabled:opacity-40"
          onClick={toggleFlash}
          disabled={!isFlashSupported}
        >
          {isFlashSupported ? (isFlashOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />) : <Flashlight className="h-5 w-5" />}
        </Button>

        <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-1 text-xs font-medium text-white backdrop-blur">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          {t("receiptScanner:mobile.autoFocusReady")}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/70"
          onClick={onCancel}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 px-6 pb-10">
        <div className="text-sm font-medium text-white">{t("receiptScanner:mobile.centerInFrame")}</div>

        <Button
          size="icon"
          className="h-20 w-20 rounded-full border-[6px] border-white/85 bg-white/95 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
          onClick={captureImage}
        >
          <span className="sr-only">{t("receiptScanner:mobile.tapToCapture")}</span>
        </Button>

        <div className="w-full rounded-3xl bg-black/60 px-5 py-4 text-center text-xs text-white/80 backdrop-blur">
          <p className="font-medium text-white">{t("receiptScanner:mobile.ensureLighting")}</p>
          <p>{t("receiptScanner:mobile.alignGuides")}</p>
          <p>{t("receiptScanner:mobile.tapToCapture")}</p>
        </div>
      </div>
    </div>
  )
}
