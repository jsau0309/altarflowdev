"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NewMemberFlowSettings } from "./flows/new-member-flow-settings"
import { useTranslation } from 'react-i18next'

// Define the type for the church profile data
interface ChurchProfileData {
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
}

// Define the props for the SettingsContent component
interface SettingsContentProps {
  initialChurchProfile: ChurchProfileData | null;
}

export function SettingsContent({ initialChurchProfile }: SettingsContentProps) {
  // Load necessary namespaces
  const { i18n, t } = useTranslation(['flows', 'common']); 
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        {/* Add mb-2 to the h1 */}
        <h1 className="text-3xl font-bold mb-2">{t('flows:title', 'Flows')}</h1> 
        <p className="text-muted-foreground">{t('flows:subtitle', 'Configure and manage your church forms and flows.')}</p>
      </div>

      <Tabs defaultValue="flow-config" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full">
            <TabsTrigger value="flow-config" className="flex-1 whitespace-nowrap">
              {/* Use explicit namespace prefix and add default value */}
              {t('flows:tabs.flowConfiguration', 'Flow Configuration')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="flow-config">
          <NewMemberFlowSettings /> 
        </TabsContent>
      </Tabs>
    </div>
  )
}
