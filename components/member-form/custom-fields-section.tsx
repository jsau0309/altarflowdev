"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form"
import { useFormConfig } from "./form-config-context"
import type { MemberFormValues } from "./validation-schema"
import type { CustomField } from "./types"

export function CustomFieldsSection() {
  const { config, language } = useFormConfig()
  const form = useFormContext<MemberFormValues>()

  const activeCustomFields = config.customFields.filter((field) => field.isActive)

  if (activeCustomFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {activeCustomFields.map((field) => (
        <CustomFieldInput key={field.id} field={field} language={language} />
      ))}
    </div>
  )
}

function CustomFieldInput({
  field,
  language,
}: {
  field: CustomField
  language: "en" | "es"
}) {
  const form = useFormContext<MemberFormValues>()
  const fieldName = `customFields.${field.id}`
  const label = field.label[language]
  const placeholder = field.placeholder?.[language] || ""
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
                    onChange={(e) => formField.onChange(e.target.valueAsNumber)}
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
                  <Input type="date" {...formField} />
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
                        {option.label[language]}
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
                  <Checkbox checked={formField.value} onCheckedChange={formField.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {label} {isRequired && "*"}
                  </FormLabel>
                </div>
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
