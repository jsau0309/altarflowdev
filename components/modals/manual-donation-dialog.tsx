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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { t } = useTranslation(['donations', 'common', 'settings']); // Load donations, common, and settings namespaces

  // Helper function to get translated payment method name (EXACT same pattern as Settings page)
  const getTranslatedPaymentMethodName = (methodName: string): string => {
    // Use the SAME translation namespace as the Settings page
    const key = `settings:systemCategories.paymentMethods.${methodName}`;
    const translated = t(key, methodName);
    // If translation returns the key itself, it means no translation exists (user-created method)
    return translated === key ? methodName : translated;
  };

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
  const [donationTypes, setDonationTypes] = useState<Array<{ id: string; name: string; isCampaign: boolean }>>([]);
  const [isLoadingDonationTypes, setIsLoadingDonationTypes] = useState<boolean>(false);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string; color: string; isSystemMethod: boolean }>>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"individual" | "general">("individual");

  // Effect to fetch donors and donation types when modal opens
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
      setActiveTab("individual"); // Reset to individual tab

      // Always fetch donors for manual donation to get the correct list
      // This ensures we get both manual donors AND universal donors who have donated
      const fetchDonors = async () => {
        setIsLoadingDonors(true);
        try {
          const donorsList = await getAllDonorsForManualDonation();
          setDonors(donorsList);
        } catch (error) {
          console.error('Failed to fetch donors for manual donation:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
          setDonors([]);
          toast.error(t('donations:newManualDonation.failedToLoadDonors', 'Failed to load donors'));
        } finally {
          setIsLoadingDonors(false);
        }
      };

      // Fetch donation types (system types + campaigns)
      const fetchDonationTypes = async () => {
        setIsLoadingDonationTypes(true);
        try {
          const churchId = safeStorage.getItem("churchId");
          if (!churchId) {
            throw new Error("Church ID not found");
          }

          // Fetch all donation types for this church (both system and campaigns)
          const response = await fetch(`/api/churches/${churchId}/donation-types`);
          if (!response.ok) {
            throw new Error("Failed to fetch donation types");
          }

          const data = await response.json();
          setDonationTypes(data);
        } catch (error) {
          console.error('Failed to fetch donation types:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
          setDonationTypes([]);
          toast.error(t('donations:newManualDonation.failedToLoadDonationTypes', 'Failed to load donation types'));
        } finally {
          setIsLoadingDonationTypes(false);
        }
      };

      // Fetch payment methods (system methods + custom methods)
      const fetchPaymentMethods = async () => {
        setIsLoadingPaymentMethods(true);
        try {
          const churchId = safeStorage.getItem("churchId");
          if (!churchId) {
            throw new Error("Church ID not found");
          }

          // Fetch all payment methods for this church
          const response = await fetch(`/api/churches/${churchId}/donation-payment-methods`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Payment methods fetch failed', {
              operation: 'ui.donation.payment_methods_error',
              status: response.status,
              errorText
            });
            throw new Error(`Failed to fetch payment methods: ${response.status}`);
          }

          const data = await response.json();
          setPaymentMethods(data);
        } catch (error) {
          console.error('Failed to fetch payment methods:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
          setPaymentMethods([]);
          toast.error(t('donations:newManualDonation.failedToLoadPaymentMethods', 'Failed to load payment methods'));
        } finally {
          setIsLoadingPaymentMethods(false);
        }
      };

      // Fetch all lists
      fetchDonors();
      fetchDonationTypes();
      fetchPaymentMethods();
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
    // Only require donor for individual donations
    if (activeTab === "individual" && !selectedDonorId) {
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
      donorId: activeTab === "individual" ? selectedDonorId : null,
      donationTypeName: selectedDonationType,
      paymentMethod: selectedPaymentMethod,
      notes: manualDonationNotes || null,
      isGeneralCollection: activeTab === "general",
    };

    try {
      const result = await createManualDonation(params);
      if (result.error) {
        // Check if the error is an i18n key (starts with 'donations:')
        const errorMessage = result.error.startsWith('donations:')
          ? t(result.error, result.error) // Translate if it's an i18n key
          : result.error; // Use as-is if it's a regular error message
        toast.error(errorMessage);
      } else {
        // Success - let parent handle toast and data refresh
        onSuccess(); // Call parent's success handler to refresh data
        onClose(); // Close the modal
        return; // Exit early
      }
    } catch (error) {
      console.error('Failed to save manual donation:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t('common:errors.unexpected_error', 'An unexpected error occurred'));
    } finally {
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
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "individual" | "general")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="individual">{t('donations:newManualDonation.tabIndividual')}</TabsTrigger>
              <TabsTrigger value="general">{t('donations:newManualDonation.tabGeneralCollection')}</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="mt-0">
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
                  {isLoadingDonationTypes ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('donations:newManualDonation.loadingDonationTypes', 'Loading donation types...')}
                    </div>
                  ) : donationTypes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('donations:newManualDonation.noDonationTypes', 'No donation types available')}
                    </div>
                  ) : (
                    donationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.isCampaign ? type.name : t(`donations:funds.${type.name.toLowerCase()}`, type.name)}
                      </SelectItem>
                    ))
                  )}
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
                  {isLoadingPaymentMethods ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('donations:newManualDonation.loadingPaymentMethods', 'Loading payment methods...')}
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('donations:newManualDonation.noPaymentMethods', 'No payment methods available')}
                    </div>
                  ) : (
                    paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                          {getTranslatedPaymentMethodName(method.name)}
                        </div>
                      </SelectItem>
                    ))
                  )}
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
            </TabsContent>

            <TabsContent value="general" className="mt-0">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount-general">{t('donations:newManualDonation.amount')}</Label>
                    <Input
                      id="amount-general"
                      type="number"
                      value={manualDonationAmount}
                      onChange={(e) => setManualDonationAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-general">{t('donations:newManualDonation.date')}</Label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="donationType-general">{t('donations:newManualDonation.donationType')}</Label>
                    <Select value={selectedDonationType} onValueChange={setSelectedDonationType}>
                      <SelectTrigger id="donationType-general" className="mt-1">
                        <SelectValue placeholder={t('donations:newManualDonation.selectDonationType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingDonationTypes ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {t('donations:newManualDonation.loadingDonationTypes', 'Loading donation types...')}
                          </div>
                        ) : donationTypes.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {t('donations:newManualDonation.noDonationTypes', 'No donation types available')}
                          </div>
                        ) : (
                          donationTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.isCampaign ? type.name : t(`donations:funds.${type.name.toLowerCase()}`, type.name)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod-general">{t('donations:newManualDonation.paymentMethod')}</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger id="paymentMethod-general" className="mt-1">
                        <SelectValue placeholder={t('donations:newManualDonation.selectPaymentMethod')} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingPaymentMethods ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {t('donations:newManualDonation.loadingPaymentMethods', 'Loading payment methods...')}
                          </div>
                        ) : paymentMethods.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {t('donations:newManualDonation.noPaymentMethods', 'No payment methods available')}
                          </div>
                        ) : (
                          paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.name}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                                {getTranslatedPaymentMethodName(method.name)}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes-general">{t('donations:newManualDonation.notes')}</Label>
                  <Textarea
                    id="notes-general"
                    value={manualDonationNotes}
                    onChange={(e) => setManualDonationNotes(e.target.value)}
                    placeholder={t('donations:newManualDonation.notesPlaceholder')}
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
