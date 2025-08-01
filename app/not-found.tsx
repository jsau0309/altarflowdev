'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Home, LogIn, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

export default function NotFound() {
  const { isSignedIn } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6">
          <Image
            src="/images/Altarflow.png"
            alt="Altarflow"
            width={150}
            height={40}
            className="mx-auto mb-4"
          />
          <h1 className="text-6xl font-bold text-primary">404</h1>
        </div>
        <h2 className="mb-2 text-2xl font-bold">Page Not Found</h2>
        <p className="mb-6 text-gray-600">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          {isSignedIn ? (
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/signin">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}