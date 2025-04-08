import { SignUpForm } from "@/components/sign-up-form"
import { Building2 } from "lucide-react"
import Link from "next/link"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Altarflow</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-muted-foreground mt-2">Sign up to start managing your church</p>
        </div>

        <SignUpForm />

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
