"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createDonor, CreateDonorPayload } from "@/lib/actions/donors.actions";
import { useState, useEffect } from "react";
import { getAllMembersForLinking, MemberForLinkingSummary } from '@/lib/actions/members.actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  memberId: z.string().nullable().optional(),
});

interface NewDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewDonorModal({ isOpen, onClose, onSuccess }: NewDonorModalProps) {
  const { t } = useTranslation('donations');
  const [members, setMembers] = useState<MemberForLinkingSummary[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      memberId: null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
          const data = await getAllMembersForLinking();
          setMembers(data);
        } catch (error) {
          console.error('Failed to fetch members:', error);
          toast.error(t('fetchMembersFailed'));
          setMembers([]);
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    } else {
      // Reset state when modal closes
      setMembers([]);
      setSelectedMemberId(null);
      setLoadingMembers(false);
      form.reset();
    }
  }, [isOpen, form, t]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Convert empty strings to undefined for optional fields
    const payload: CreateDonorPayload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        addressLine1: values.addressLine1?.trim() || undefined,
        city: values.city?.trim() || undefined,
        state: values.state?.trim() || undefined,
        postalCode: values.postalCode?.trim() || undefined,
        country: values.country?.trim() || undefined,
        memberId: selectedMemberId,
    };
    const result = await createDonor(payload);
    if (result.success) {
        onSuccess();
        toast.success(t('addDonorModal.success', { firstName: values.firstName, lastName: values.lastName }));
    } else {
        // Handle error
        console.error(result.error);
        toast.error(result.error || t('addDonorModal.error'));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('addDonorModal.title', 'Add New Donor')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addDonorModal.firstName', 'First Name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addDonorModal.lastName', 'Last Name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addDonorModal.email', 'Email')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addDonorModal.phone', 'Phone')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addDonorModal.address', 'Address')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('addDonorModal.addressPlaceholder', 'Street Address')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addDonorModal.city', 'City')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addDonorModal.state', 'State')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addDonorModal.postalCode', 'Postal Code')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addDonorModal.country', 'Country')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Link to Member Section */}
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('linkToMember')}</FormLabel>
                  <Select
                    value={selectedMemberId || ''}
                    onValueChange={(value) => {
                      const newValue = value === '__none__' ? null : value;
                      setSelectedMemberId(newValue);
                      field.onChange(newValue);
                    }}
                    disabled={loadingMembers}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectMemberToLink')} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingMembers ? (
                        <SelectItem value="__loading__" disabled>
                          {t('loadingMembers')}...
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="__none__">
                            {t('noMemberOrUnlink')}
                          </SelectItem>
                          {members.map((member: MemberForLinkingSummary) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.email ?? t('common:noEmail', 'No email')})
                            </SelectItem>
                          ))}
                          {(!members || members.length === 0) && !loadingMembers && (
                            <SelectItem value="__no_members_found__" disabled>
                              {t('noMembersFound')}
                            </SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>{t('common:cancel', 'Cancel')}</Button>
              <Button type="submit">{t('addDonorModal.submit', 'Add Donor')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
