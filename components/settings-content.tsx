"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormSettings } from "./settings/form-settings"
import { useState } from "react"
import { useTranslation } from 'react-i18next'
// Assuming react-hot-toast is used, adjust if necessary
// import toast from 'react-hot-toast'; 

export function SettingsContent() {
  // Load necessary namespaces
  const { i18n, t } = useTranslation(['flows', 'common']); 
  // Remove churchProfile state and handlers
  // const [churchProfile, setChurchProfile] = useState<ChurchProfileData>({
  //   name: initialChurchProfile.name || "", 
  //   phone: initialChurchProfile.phone || "",
  //   address: initialChurchProfile.address || "",
  //   website: initialChurchProfile.website || "",
  // })
  // Remove isLoading state
  // const [isLoading, setIsLoading] = useState(true); 
  // const [isSaving, setIsSaving] = useState(false);  // Saving state for updates
  // const handleChurchProfileChange = (...) => { ... }
  // const handleSaveChurchProfile = async () => { ... }

  // Remove useEffect for fetching data
  /*
  useEffect(() => {
    const fetchProfile = async () => {
      // ... fetch logic removed ...
    };
    fetchProfile();
  }, [t]);
  */

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        {/* Use explicit namespace prefix and add default value */}
        <h1 className="text-3xl font-bold">{t('flows:title', 'Flows')}</h1> 
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
          <FormSettings /> 
        </TabsContent>
      </Tabs>
    </div>
  )
}
