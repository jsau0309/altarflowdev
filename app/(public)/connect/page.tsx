export const dynamic = "force-dynamic"

import { FormConfigProvider } from "@/components/member-form/form-config-context"
import { MemberForm } from "@/components/member-form/member-form"

export default function ConnectPage() {
  return (
    <div className="container mx-auto py-8">
      <FormConfigProvider>
        <MemberForm />
      </FormConfigProvider>
    </div>
  )
}