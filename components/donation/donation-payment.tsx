"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { DonationFormData } from "./donation-form"
import { Gift } from "lucide-react"

interface DonationPaymentProps {
  formData: DonationFormData
  updateFormData: (data: Partial<DonationFormData>) => void
  onBack: () => void
}

export default function DonationPayment({ formData, updateFormData, onBack }: DonationPaymentProps) {
  const [processingFee, setProcessingFee] = useState<number>(0)
  const [totalAmount, setTotalAmount] = useState<number>(formData.amount || 0)

  // Calculate Stripe processing fee (2.9% + 30¢)
  useEffect(() => {
    const baseAmount = formData.amount || 0
    const fee = baseAmount * 0.029 + 0.3
    setProcessingFee(Number.parseFloat(fee.toFixed(2)))

    // Update total amount based on whether user covers fees
    if (formData.coverFees) {
      setTotalAmount(baseAmount + fee)
    } else {
      setTotalAmount(baseAmount)
    }
  }, [formData.amount, formData.coverFees])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would integrate with Stripe or another payment processor
    alert("Thank you for your donation!")
  }

  const handleCoverFeesChange = (checked: boolean) => {
    updateFormData({ coverFees: checked })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">$</div>
        <div className="text-4xl font-bold text-center text-gray-900 dark:text-white">
          {formData.coverFees ? totalAmount.toFixed(2) : formData.amount?.toFixed(2)}
        </div>
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">USD</div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Donation to:</span>
          <span className="font-medium text-gray-900 dark:text-white">{formData.campaignName || "Tithe"}</span>
        </div>
        {formData.donationType === "recurring" && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Recurring {formData.frequency} donation</div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Choose a payment method:</h3>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={formData.paymentMethod === "card" ? "default" : "outline"}
            className="h-12 justify-center"
            onClick={() => updateFormData({ paymentMethod: "card" })}
          >
            Credit/Debit Card
          </Button>
          <Button
            type="button"
            variant={formData.paymentMethod === "bank" ? "default" : "outline"}
            className="h-12 justify-center"
            onClick={() => updateFormData({ paymentMethod: "bank" })}
          >
            Bank Account
          </Button>
        </div>

        <Button
          type="button"
          variant={formData.paymentMethod === "google-pay" ? "default" : "outline"}
          className="w-full h-12 bg-black text-white hover:bg-gray-800"
          onClick={() => updateFormData({ paymentMethod: "google-pay" })}
        >
          <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.0001 12.2332C22.0001 11.3699 21.9251 10.7399 21.7667 10.0865H12.2667V13.5732H17.8084C17.6834 14.5865 17.0834 16.0065 15.7417 16.9799L15.7209 17.1196L18.7543 19.4529L18.9559 19.4732C20.8309 17.7732 21.9917 15.2732 21.9917 12.2332"
              fill="#4285F4"
            />
            <path
              d="M12.2666 21.9998C15.0999 21.9998 17.4666 21.0998 19.0166 19.4731L15.7416 16.9798C14.8833 17.5798 13.7416 17.9998 12.2666 17.9998C9.49994 17.9998 7.16661 16.1698 6.39994 13.7098L6.27075 13.7191L3.12734 16.1424L3.08661 16.2698C4.64161 19.5998 8.09994 21.9998 12.2666 21.9998Z"
              fill="#34A853"
            />
            <path
              d="M6.39999 13.7099C6.18332 13.0566 6.06665 12.3699 6.06665 11.6666C6.06665 10.9632 6.18332 10.2766 6.38332 9.62322L6.37748 9.47488L3.19415 7.02322L3.08665 7.06322C2.39999 8.4232 1.99999 9.9899 1.99999 11.6666C1.99999 13.3432 2.39999 14.9099 3.08665 16.2699L6.39999 13.7099Z"
              fill="#FBBC05"
            />
            <path
              d="M12.2667 5.33324C14.1667 5.33324 15.45 6.1999 16.2 6.8999L19.1 3.9999C17.4584 2.4499 15.1 1.3999 12.2667 1.3999C8.10005 1.3999 4.64172 3.7999 3.08672 7.0699L6.38338 9.6299C7.16672 7.1699 9.50005 5.33324 12.2667 5.33324Z"
              fill="#EB4335"
            />
          </svg>
          Google Pay
        </Button>

        <Button
          type="button"
          variant={formData.paymentMethod === "apple-pay" ? "default" : "outline"}
          className="w-full h-12 bg-black text-white hover:bg-gray-800"
          onClick={() => updateFormData({ paymentMethod: "apple-pay" })}
        >
          <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.07614 12.3813C7.07614 9.3489 9.52725 8.1867 9.60224 8.1492C8.28906 6.2744 6.27288 6.0118 5.57669 5.9993C3.88653 5.8243 2.25137 7.0365 1.39128 7.0365C0.51869 7.0365 -0.81449 6.0118 -2.2602 6.0368C-4.10536 6.0618 -5.81802 7.1115 -6.75561 8.7366C-8.68179 11.9992 -7.20709 16.8118 -5.34943 19.7942C-4.42434 21.2564 -3.34925 22.8815 -1.91205 22.8315C-0.51235 22.7815 -0.04976 21.9564 1.61626 21.9564C3.25727 21.9564 3.69486 22.8315 5.16456 22.8065C6.67176 22.7815 7.60935 21.3314 8.50944 19.8567C9.57203 18.1691 10.0096 16.5065 10.0346 16.4315C9.9971 16.4065 7.08864 15.3568 7.07614 12.3813Z" />
            <path d="M3.95654 3.7242C4.70773 2.8116 5.21532 1.5619 5.06533 0.2998C3.98024 0.3498 2.63206 1.0249 1.85587 1.9125C1.16468 2.6876 0.55699 3.9748 0.73198 5.1994C1.94216 5.2994 3.18034 4.6243 3.95654 3.7242Z" />
          </svg>
          Apple Pay
        </Button>

        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
          <div className="flex items-start space-x-2">
            <Checkbox id="coverFees" checked={formData.coverFees || false} onCheckedChange={handleCoverFeesChange} />
            <div>
              <Label htmlFor="coverFees" className="font-medium">
                Add ${processingFee.toFixed(2)} to my gift
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                I want to increase my gift to help cover administrative fees and processing costs.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
          <Gift className="mr-2 h-4 w-4" />
          Donate now
        </Button>
      </div>
    </form>
  )
}
