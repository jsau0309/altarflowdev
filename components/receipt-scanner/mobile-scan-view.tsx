"use client"

import { useRef, useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MobileScanViewProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
}

export function MobileScanView({ onCapture, onCancel }: MobileScanViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })

        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
      }
    }

    setupCamera()

    return () => {
      // Clean up the camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw the current video frame to the canvas
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert canvas to data URL
        const imageData = canvas.toDataURL("image/jpeg")
        onCapture(imageData)

        // Stop the camera stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    }
  }

  return (
    <div className="relative">
      <div className="aspect-[4/5] bg-black rounded-t-lg overflow-hidden flex items-center justify-center">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-2 border-white/50 m-8 rounded-md"></div>

        <div className="absolute inset-x-0 top-4 text-center">
          <Badge variant="secondary" className="bg-black/70 text-white">
            Center receipt in frame
          </Badge>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full bg-white" onClick={onCancel}>
          <X className="h-6 w-6" />
        </Button>
        <Button size="icon" className="rounded-full h-14 w-14" onClick={captureImage}>
          <div className="h-10 w-10 rounded-full border-2 border-white"></div>
        </Button>
      </div>

      <div className="bg-background p-4 rounded-b-lg">
        <p className="text-center text-sm text-muted-foreground">
          Ensure good lighting and that the entire receipt is visible
        </p>
      </div>
    </div>
  )
}
