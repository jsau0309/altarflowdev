"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createManualDonation, CreateManualDonationParams } from "@/lib/actions/donations.actions";
import { DonorFilterItem } from "@/lib/actions/donations.actions";
import { getAllDonorsForManualDonation } from "@/lib/actions/donors.actions";
import { format } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { safeStorage } from "@/lib/safe-storage";

interface ManualDonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // donors prop removed - we always fetch the correct list internally
  // Add churchId prop if we decide to pass it instead of reading from localStorage
  // churchId: string | null;
}

export function ManualDonationDialog({ isOpen, onClose, onSuccess }: ManualDonationDialogProps) {
  const { t } = useTranslation(['donations', 'common']); // Load donations and common namespaces
  const [manualDonationAmount, setManualDonationAmount] = useState<string>("");
  const [manualDonationDate, setManualDonationDate] = useState<Date | undefined>(new Date());
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [isDonorComboboxOpen, setIsDonorComboboxOpen] = useState(false);
  const [selectedDonationType, setSelectedDonationType] = useState<string | undefined>(undefined);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined);
  const [manualDonationNotes, setManualDonationNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [donors, setDonors] = useState<DonorFilterItem[]>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState<boolean>(false);

  // Effect to fetch donors when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset fields when modal opens
      setManualDonationAmount("");
      setManualDonationDate(new Date());
      setSelectedDonorId(null);
      setSelectedDonationType(undefined);
      setSelectedPaymentMethod(undefined);
      setManualDonationNotes("");
      setIsSaving(false);
      
      // Always fetch donors for manual donation to get the correct list
      // This ensures we get both manual donors AND universal donors who have donated
      const fetchDonors = async () => {
        setIsLoadingDonors(true);
        try {
          const donorsList = await getAllDonorsForManualDonation();
          setDonors(donorsList);
        } catch (error) {
          console.error("Failed to fetch donors for manual donation:", error);
          setDonors([]);
          toast.error(t('donations:newManualDonation.failedToLoadDonors', 'Failed to load donors'));
        } finally {
          setIsLoadingDonors(false);
        }
      };
      
      // Always fetch the correct donor list
      fetchDonors();
    }
  }, [isOpen, t]);

  const handleSave = async () => {
    setIsSaving(true);
    const churchId = safeStorage.getItem("churchId"); // Consider passing as prop for better testability/flexibility

    if (!churchId) {
      toast.error(t('common:errors.churchId_not_found'));
      setIsSaving(false);
      return;
    }

    if (!manualDonationAmount || parseFloat(manualDonationAmount) <= 0) {
      toast.error(t('donations:newManualDonation.validation.invalid_amount'));
      setIsSaving(false);
      return;
    }
    if (!manualDonationDate) {
      toast.error(t('donations:newManualDonation.validation.date_required'));
      setIsSaving(false); return;
    }
    if (!selectedDonorId) {
      toast.error(t('donations:newManualDonation.validation.donor_required'));
      setIsSaving(false); return;
    }
    if (!selectedDonationType) {
      toast.error(t('donations:newManualDonation.validation.type_required'));
      setIsSaving(false); return;
    }
    if (!selectedPaymentMethod) {
      toast.error(t('donations:newManualDonation.validation.method_required'));
      setIsSaving(false); return;
    }

    const params: CreateManualDonationParams = {
      churchId,
      amount: Math.round(parseFloat(manualDonationAmount) * 100), // Convert to cents
      donationDate: manualDonationDate,
      donorId: selectedDonorId,
      donationTypeName: selectedDonationType,
      paymentMethod: selectedPaymentMethod,
      notes: manualDonationNotes || null,
    };

    try {
      const result = await createManualDonation(params);
      if (result.error) {
        // Check if the error is an i18n key (starts with 'donations:')
        const errorMessage = result.error.startsWith('donations:')
          ? t(result.error, result.error) // Translate if it's an i18n key
          : result.error; // Use as-is if it's a regular error message
        toast.error(errorMessage);
        setIsSaving(false);
      } else {
        toast.success(t('donations:newManualDonation.success_message', 'Donation created successfully!'));
        onSuccess(); // Call parent's success handler to refresh data
        onClose(); // Close the modal
        return; // Exit early to prevent setIsSaving(false) below
      }
    } catch (error) {
      console.error("Failed to save manual donation:", error);
      toast.error(t('common:errors.unexpected_error', 'An unexpected error occurred'));
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full sm:max-w-[525px] sm:max-h-[90vh] sm:h-auto overflow-hidden flex flex-col p-0 sm:p-6 sm:rounded-lg">
        <DialogHeader className="px-6 pt-6 pb-4 sm:px-0 sm:pt-0 sm:pb-0">
          <DialogTitle>{t('donations:newManualDonation.title')}</DialogTitle>
          <DialogDescription>
            {t('donations:newManualDonation.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto overflow-x-hidden px-6 sm:px-1 flex-grow">
          <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">{t('donations:newManualDonation.amount')}</Label>
              <Input
                id="amount"
                type="number"
                value={manualDonationAmount}
                onChange={(e) => setManualDonationAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date">{t('donations:newManualDonation.date')}</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !manualDonationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {manualDonationDate ? format(manualDonationDate, "MMMM d, yyyy") : <span>{t('donations:newManualDonation.pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar
                    mode="single"
                    selected={manualDonationDate}
                    onSelect={setManualDonationDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="donor">{t('donations:newManualDonation.donor')}</Label>
            <Popover open={isDonorComboboxOpen} onOpenChange={setIsDonorComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isDonorComboboxOpen}
                  className="w-full justify-between mt-1"
                >
                  {selectedDonorId
                    ? donors.find((donor) => donor.id === selectedDonorId)?.name
                    : t('donations:newManualDonation.selectDonor')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t('donations:newManualDonation.searchDonor')} />
                  {isLoadingDonors ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('donations:newManualDonation.loadingDonors', 'Loading donors...')}
                    </div>
                  ) : donors.length === 0 ? (
                    <CommandEmpty>{t('donations:newManualDonation.noDonorFound')}</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {donors.map((donor) => (
                          <CommandItem
                            key={donor.id}
                            value={donor.name} // Ensure value is unique and useful for search
                            onSelect={() => {
                              setSelectedDonorId(donor.id === selectedDonorId ? null : donor.id);
                              setIsDonorComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDonorId === donor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {donor.name}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="donationType">{t('donations:newManualDonation.donationType')}</Label>
              <Select value={selectedDonationType} onValueChange={setSelectedDonationType}>
                <SelectTrigger id="donationType" className="mt-1">
                  <SelectValue placeholder={t('donations:newManualDonation.selectDonationType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tithe">{t('donations:funds.tithe')}</SelectItem>
                  <SelectItem value="Offering">{t('donations:funds.offering')}</SelectItem>
                  {/* TODO: Add other fund types if necessary */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentMethod">{t('donations:newManualDonation.paymentMethod')}</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger id="paymentMethod" className="mt-1">
                  <SelectValue placeholder={t('donations:newManualDonation.selectPaymentMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">{t('donations:methods.cash')}</SelectItem>
                  <SelectItem value="Check">{t('donations:methods.check')}</SelectItem>
                  <SelectItem value="Bank Transfer">{t('donations:methods.bankTransfer')}</SelectItem>
                  <SelectItem value="Other">{t('donations:methods.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">{t('donations:newManualDonation.notes')}</Label>
            <Textarea
              id="notes"
              value={manualDonationNotes}
              onChange={(e) => setManualDonationNotes(e.target.value)}
              placeholder={t('donations:newManualDonation.notesPlaceholder')}
              className="mt-1"
            />
          </div>
        </div>
        </div>
        <DialogFooter className="pt-4 pb-6 px-6 mt-auto border-t sm:px-0 sm:pb-0 flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">{t('donations:newManualDonation.cancelButton')}</Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('donations:newManualDonation.saving')}</>
            ) : (
              t('donations:newManualDonation.saveButton')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
