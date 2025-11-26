"use client"


import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { editManualDonation } from "@/lib/actions/donation-edit.actions"
import { getDistinctDonorsForFilter } from "@/lib/actions/donations.actions"
import type { DonationTransactionFE } from "@/lib/types"
import type { DonorFilterItem } from "@/lib/actions/donations.actions"

const formSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, "Please enter a valid amount greater than 0"),
  donationDate: z.date(),
  donorId: z.string().min(1, "Please select a donor"),
  donationType: z.string().min(1, "Please select a donation type"),
  paymentMethod: z.string().min(1, "Please select a payment method"),
  editReason: z.string().min(1, "Please provide a reason for this edit"),
  editReasonType: z.enum(["amount_error", "wrong_donor", "wrong_date", "other"]),
})

interface EditDonationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  donation: DonationTransactionFE
}

export function EditDonationDialog({ isOpen, onClose, onSuccess, donation }: EditDonationDialogProps) {
  const { t } = useTranslation(['donations', 'common'])
  const [isLoading, setIsLoading] = useState(false)
  const [donors, setDonors] = useState<DonorFilterItem[]>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: donation.amount,
      donationDate: new Date(donation.transactionDate),
      donorId: donation.donorId || "",
      donationType: donation.donationTypeName,
      paymentMethod: donation.paymentMethodType,
      editReason: "",
      editReasonType: "other",
    },
  })

  const fetchDonors = useCallback(async () => {
    try {
      const donorList = await getDistinctDonorsForFilter()
      setDonors(donorList)
    } catch (error) {
      console.error('Failed to fetch donors:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t('common:errors.fetchFailed', 'Failed to load donors'))
    }
  }, [t])

  useEffect(() => {
    if (isOpen) {
      fetchDonors()
    }
  }, [isOpen, fetchDonors])

  const handleReasonTypeChange = (value: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Form field type is complex
    form.setValue("editReasonType", value as any)
    
    // Pre-fill reason based on type
    switch (value) {
      case "amount_error":
        form.setValue("editReason", t('donations:editDonation.typoInAmount'))
        break
      case "wrong_donor":
        form.setValue("editReason", t('donations:editDonation.wrongDonor'))
        break
      case "wrong_date":
        form.setValue("editReason", t('donations:editDonation.incorrectDate'))
        break
      default:
        form.setValue("editReason", "")
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const result = await editManualDonation({
        donationId: donation.id,
        amount: Math.round(parseFloat(values.amount) * 100), // Convert to cents
        donationDate: values.donationDate,
        donorId: values.donorId,
        donationTypeName: values.donationType,
        paymentMethod: values.paymentMethod,
        editReason: values.editReason,
      })

      if (result.success) {
        toast.success(t('donations:editDonation.editSuccess'))
        onSuccess()
      } else {
        toast.error(result.error || t('common:errors.updateFailed', 'Failed to update donation'))
      }
    } catch (error) {
      console.error('Failed to edit donation:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t('common:errors.updateFailed', 'Failed to update donation'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('donations:editDonation.title')}</DialogTitle>
          <DialogDescription>
            {t('donations:editDonation.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('donations:amount', 'Amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="donationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('donations:date', 'Date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t('common:selectDate', 'Select date')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="donorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('donations:donor', 'Donor')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('donations:selectDonor', 'Select a donor')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {donors.map((donor) => (
                        <SelectItem key={donor.id} value={donor.id}>
                          {donor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="donationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('donations:type', 'Type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('donations:selectDonationType', 'Select type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Tithe">{t('donations:types.tithe', 'Tithe')}</SelectItem>
                      <SelectItem value="Offering">{t('donations:types.offering', 'Offering')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('donations:method', 'Payment Method')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('donations:selectPaymentMethod', 'Select method')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">{t('donations:methods.cash', 'Cash')}</SelectItem>
                      <SelectItem value="check">{t('donations:methods.check', 'Check')}</SelectItem>
                      <SelectItem value="bankTransfer">{t('donations:methods.bankTransfer', 'Bank Transfer')}</SelectItem>
                      <SelectItem value="other">{t('donations:methods.other', 'Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label>{t('donations:editDonation.reasonForEdit')}</Label>
              <RadioGroup
                value={form.watch("editReasonType")}
                onValueChange={handleReasonTypeChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="amount_error" id="amount_error" />
                  <Label htmlFor="amount_error">{t('donations:editDonation.typoInAmount')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wrong_donor" id="wrong_donor" />
                  <Label htmlFor="wrong_donor">{t('donations:editDonation.wrongDonor')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wrong_date" id="wrong_date" />
                  <Label htmlFor="wrong_date">{t('donations:editDonation.incorrectDate')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">{t('donations:editDonation.other')}</Label>
                </div>
              </RadioGroup>

              <FormField
                control={form.control}
                name="editReason"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={t('donations:editDonation.reasonPlaceholder')}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('donations:editDonation.reasonDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common:saving', 'Saving...')}
                  </>
                ) : (
                  t('common:saveChanges', 'Save Changes')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}