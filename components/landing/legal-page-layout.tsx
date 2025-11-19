import type React from "react"
import Link from "next/link"
import { AltarflowFooter } from "@/components/landing/simple-footer"

interface LegalPageLayoutProps {
  title: string
  children: React.ReactNode
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/altarflow-logo.svg" alt="Altarflow" className="w-[191px] h-[45px]" />
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 max-w-4xl">
          <article className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">{title}</h1>
            <p className="text-sm text-gray-500 mb-8">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            {children}
          </article>
        </div>
      </main>

      <AltarflowFooter />
    </div>
  )
}
