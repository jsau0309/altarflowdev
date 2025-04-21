"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import type { MemberFormValues } from "./validation-schema"
import type { CustomField } from "./types"

// Define the refactored type for mock data
type MockCustomField = Omit<CustomField, 'label' | 'options'> & { 
  labelKey: string, 
  options?: { value: string, labelKey: string }[] 
}

// TODO: Replace this hardcoded data later
const MOCK_CUSTOM_FIELDS: MockCustomField[] = [
  { id: "cf1", fieldType: "text", labelKey: "customFields.cf1.label", isRequired: false, isActive: true },
  { id: "cf2", fieldType: "date", labelKey: "customFields.cf2.label", isRequired: false, isActive: true },
  { id: "cf3", fieldType: "select", labelKey: "customFields.cf3.label", 
    options: [
      { value: "email", labelKey: "customFields.cf3.options.email" },
      { value: "phone", labelKey: "customFields.cf3.options.phone" },
      { value: "text", labelKey: "customFields.cf3.options.text" },
    ],
    isRequired: true, isActive: true 
  },
  { id: "cf4", fieldType: "checkbox", labelKey: "customFields.cf4.label", isRequired: false, isActive: true },
  { id: "cf5", fieldType: "number", labelKey: "customFields.cf5.label", isRequired: false, isActive: false }, // Inactive example
];

export function CustomFieldsSection() {
  // const { config } = useFormConfig() // Remove

  // Filter mock data - Exclude specific fields for /connect page context
  const fieldsToExclude = ["cf1", "cf2", "cf4"]; // IDs for Spouse, Anniversary, Newsletter
  const activeCustomFields = MOCK_CUSTOM_FIELDS.filter((field) => 
    field.isActive && !fieldsToExclude.includes(field.id)
  );

  if (activeCustomFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {activeCustomFields.map((field) => (
        // Pass field only, language/translation handled inside
        <CustomFieldInput key={field.id} field={field} />
      ))}
    </div>
  )
}

function CustomFieldInput({
  field,
}: {
  // Use the corrected type
  field: MockCustomField
}) {
  const { t, i18n } = useTranslation(); // Get t and i18n instance
  const form = useFormContext<MemberFormValues>()
  const fieldName = `customFields.${field.id}`
  const label = t(field.labelKey); 
  // Correctly access language from i18n instance for placeholder
  const placeholder = field.placeholder?.[i18n.language as 'en' | 'es'] || field.placeholder?.en || "";
  const isRequired = field.isRequired

  const renderFieldInput = () => {
    switch (field.fieldType) {
      case "text":
        return (
          <FormField
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {label} {isRequired && "*"}
                </FormLabel>
                <FormControl>
                  <Input placeholder={placeholder} {...formField} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "number":
        return (
          <FormField
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {label} {isRequired && "*"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={placeholder}
                    {...formField}
                    // Ensure value is stored as number
                    onChange={(e) => formField.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                    value={formField.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "date":
        return (
          <FormField
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {label} {isRequired && "*"}
                </FormLabel>
                <FormControl>
                  <Input type="date" {...formField} value={formField.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "select":
        return (
          <FormField
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {label} {isRequired && "*"}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {/* Use t() with option's labelKey */}
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "checkbox":
        return (
          <FormField
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox 
                    checked={!!formField.value} // Ensure value is boolean
                    onCheckedChange={formField.onChange} 
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {label} {isRequired && "*"}
                  </FormLabel>
                </div>
                 <FormMessage /> { /* Added FormMessage */}
              </FormItem>
            )}
          />
        )

      default:
        return null
    }
  }

  return renderFieldInput()
}
