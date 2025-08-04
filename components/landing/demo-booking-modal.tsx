"use client"
import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface DemoBookingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoBookingModal({ isOpen, onClose }: DemoBookingModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Load Cal.com script when modal opens
      const script = document.createElement("script")
      script.type = "text/javascript"
      script.innerHTML = `
        (function (C, A, L) { 
          let p = function (a, ar) { a.q.push(ar); }; 
          let d = C.document; 
          C.Cal = C.Cal || function () { 
            let cal = C.Cal; 
            let ar = arguments; 
            if (!cal.loaded) { 
              cal.ns = {}; 
              cal.q = cal.q || []; 
              d.head.appendChild(d.createElement("script")).src = A; 
              cal.loaded = true; 
            } 
            if (ar[0] === L) { 
              const api = function () { p(api, arguments); }; 
              const namespace = ar[1]; 
              api.q = api.q || []; 
              if(typeof namespace === "string"){
                cal.ns[namespace] = cal.ns[namespace] || api;
                p(cal.ns[namespace], ar);
                p(cal, ["initNamespace", namespace]);
              } else p(cal, ar); 
              return;
            } 
            p(cal, ar); 
          }; 
        })(window, "https://app.cal.com/embed/embed.js", "init");
        
        Cal("init", "altarflow-demo", {origin:"https://app.cal.com"});  
        Cal.ns["altarflow-demo"]("inline", {    
          elementOrSelector:"#my-cal-inline-altarflow-demo",    
          config: {"layout":"month_view","theme":"light"},    
          calLink: "jeffrey-alonso-ce3niv/altarflow-demo",  
        });  
        Cal.ns["altarflow-demo"]("ui", {
          "theme":"light",
          "cssVarsPerTheme":{"light":{"cal-brand":"#3B82F6"}},
          "hideEventTypeDetails":true,
          "layout":"month_view"
        });
      `
      document.head.appendChild(script)

      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden"

      return () => {
        // Clean up script and restore scroll
        document.head.removeChild(script)
        document.body.style.overflow = "unset"
      }
    } else {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Book a Demo</h2>
                <p className="text-gray-600 mt-1">Schedule a personalized demo of Altarflow</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Cal.com Embed */}
            <div className="p-6">
              <div
                style={{ width: "100%", height: "600px", overflow: "scroll" }}
                id="my-cal-inline-altarflow-demo"
                className="rounded-lg border border-gray-200"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
