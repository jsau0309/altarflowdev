"use client";
import { logger } from '@/lib/logger';

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import LoaderOne from "@/components/ui/loader-one";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  address: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventFormData {
  title: string;
  description: string;
  eventDate: Date | undefined;
  eventTime: string;
  address: string;
  isPublished: boolean;
}

const initialFormData: EventFormData = {
  title: "",
  description: "",
  eventDate: undefined,
  eventTime: "",
  address: "",
  isPublished: true,
};

export function EventManager() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [dateError, setDateError] = useState<string | null>(null);
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/events");
      if (!response.ok) throw new Error("Failed to load events");

      const data = await response.json();
      setEvents(data.events || []);

      // Notify parent component (landing-manager-enhanced) to update preview
      window.dispatchEvent(new CustomEvent('eventsUpdated'));
    } catch (error) {
      logger.error('Failed to load events:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t("settings:events.loadError", "Failed to load events"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Load events
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);

      try {
        // Parse date string - handle both ISO 8601 and plain date strings
        const datePart = event.eventDate.includes('T')
          ? event.eventDate.split('T')[0]
          : event.eventDate;
        const [year, month, day] = datePart.split('-').map(Number);

        // Validate parsed values
        if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
          logger.error('Invalid date format in event', {
            operation: 'ui.event.date_parse_error',
            eventDate: event.eventDate,
            datePart
          });
          // Fallback to current date
          const eventDateObj = new Date();
          setFormData({
            title: event.title,
            description: event.description,
            eventDate: eventDateObj,
            eventTime: event.eventTime,
            address: event.address,
            isPublished: event.isPublished,
          });
        } else {
          const eventDateObj = new Date(year, month - 1, day);
          setFormData({
            title: event.title,
            description: event.description,
            eventDate: eventDateObj,
            eventTime: event.eventTime,
            address: event.address,
            isPublished: event.isPublished,
          });
        }
      } catch (error) {
        logger.error('Error parsing event date:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
        // Fallback to current date on error
        setFormData({
          title: event.title,
          description: event.description,
          eventDate: new Date(),
          eventTime: event.eventTime,
          address: event.address,
          isPublished: event.isPublished,
        });
      }
    } else {
      setEditingEvent(null);
      setFormData(initialFormData);
    }
    setDateError(null);
    setShowPastDateWarning(false);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setFormData(initialFormData);
    setDateError(null);
    setShowPastDateWarning(false);
  };

  const handleSave = async () => {
    // Validate
    if (!formData.title.trim()) {
      toast.error(t("settings:events.titleRequired", "Title is required"));
      return;
    }
    if (!formData.description.trim()) {
      toast.error(t("settings:events.descriptionRequired", "Description is required"));
      return;
    }
    if (!formData.eventDate) {
      toast.error(t("settings:events.dateRequired", "Event date is required"));
      setDateError(t("settings:events.dateRequired", "Event date is required"));
      return;
    }
    if (!formData.eventTime.trim()) {
      toast.error(t("settings:events.timeRequired", "Event time is required"));
      return;
    }
    if (!formData.address.trim()) {
      toast.error(t("settings:events.addressRequired", "Address is required"));
      return;
    }

    setIsSaving(true);
    try {
      const url = editingEvent
        ? `/api/settings/events/${editingEvent.id}`
        : "/api/settings/events";

      const method = editingEvent ? "PATCH" : "POST";

      // Format date as YYYY-MM-DD for API
      const year = formData.eventDate.getFullYear();
      const month = String(formData.eventDate.getMonth() + 1).padStart(2, '0');
      const day = String(formData.eventDate.getDate()).padStart(2, '0');
      const eventDateString = `${year}-${month}-${day}`;

      const payload = {
        title: formData.title,
        description: formData.description,
        eventDate: eventDateString,
        eventTime: formData.eventTime,
        address: formData.address,
        isPublished: formData.isPublished,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save event");
      }

      toast.success(
        editingEvent
          ? t("settings:events.updateSuccess", "Event updated successfully")
          : t("settings:events.createSuccess", "Event created successfully")
      );

      handleCloseDialog();
      loadEvents();
    } catch (error: any) {
      logger.error('Failed to save event:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(error.message || t("settings:events.saveError", "Failed to save event"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setConfirmDelete(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    const loadingToast = toast.loading(t("settings:events.deleting", "Deleting event..."));

    try {
      const response = await fetch(`/api/settings/events/${eventToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.dismiss(loadingToast);
      toast.success(t("settings:events.deleteSuccess", "Event deleted successfully"));
      setConfirmDelete(false);
      setEventToDelete(null);
      loadEvents();
    } catch (error) {
      logger.error('Failed to delete event:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.dismiss(loadingToast);
      toast.error(t("settings:events.deleteError", "Failed to delete event"));
    }
  };

  const handleTogglePublished = async (event: Event) => {
    try {
      const response = await fetch(`/api/settings/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !event.isPublished }),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      toast.success(
        event.isPublished
          ? t("settings:events.unpublishSuccess", "Event hidden from landing page")
          : t("settings:events.publishSuccess", "Event published to landing page")
      );
      loadEvents();
    } catch (error) {
      logger.error('Failed to toggle event:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t("settings:events.toggleError", "Failed to update event"));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Validate date to prevent "Invalid Date" from showing in UI
    if (isNaN(date.getTime())) {
      logger.error('Invalid date string in formatDate', {
        operation: 'ui.event.format_date_error',
        dateString
      });
      return 'Invalid Date';
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Separate upcoming and past events using day-level comparison
  const now = new Date();
  now.setHours(0, 0, 0, 0);  // Set to midnight for day-level comparison

  const upcomingEvents = events.filter(e => {
    const eventDay = new Date(e.eventDate);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay >= now;
  });

  const pastEvents = events
    .filter(e => {
      const eventDay = new Date(e.eventDate);
      eventDay.setHours(0, 0, 0, 0);
      return eventDay < now;
    })
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()); // Sort descending (most recent first)

  if (isLoading) {
    return <LoaderOne />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {t("settings:events.title", "Events")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("settings:events.description", "Manage upcoming and past events displayed on your landing page")}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t("settings:events.addEvent", "Add Event")}
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("settings:events.noEvents", "No events yet")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings:events.noEventsDescription", "Create your first event to display on your landing page")}
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t("settings:events.addFirstEvent", "Add Your First Event")}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                {t("settings:events.upcomingEvents", "Upcoming Events")}
              </h4>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("settings:events.eventName", "Event")}</TableHead>
                      <TableHead>{t("settings:events.date", "Date")}</TableHead>
                      <TableHead>{t("settings:events.time", "Time")}</TableHead>
                      <TableHead>{t("settings:events.status", "Status")}</TableHead>
                      <TableHead className="text-right">{t("settings:events.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{formatDate(event.eventDate)}</TableCell>
                        <TableCell>{event.eventTime}</TableCell>
                        <TableCell>
                          {event.isPublished ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <Eye className="h-3 w-3" />
                              {t("settings:events.published", "Published")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <EyeOff className="h-3 w-3" />
                              {t("settings:events.hidden", "Hidden")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePublished(event)}
                            >
                              {event.isPublished ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(event)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(event)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                {t("settings:events.pastEvents", "Past Events")}
              </h4>
              <div className="border rounded-lg opacity-75">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("settings:events.eventName", "Event")}</TableHead>
                      <TableHead>{t("settings:events.date", "Date")}</TableHead>
                      <TableHead>{t("settings:events.time", "Time")}</TableHead>
                      <TableHead>{t("settings:events.status", "Status")}</TableHead>
                      <TableHead className="text-right">{t("settings:events.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{formatDate(event.eventDate)}</TableCell>
                        <TableCell>{event.eventTime}</TableCell>
                        <TableCell>
                          {event.isPublished ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <Eye className="h-3 w-3" />
                              {t("settings:events.published", "Published")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <EyeOff className="h-3 w-3" />
                              {t("settings:events.hidden", "Hidden")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePublished(event)}
                            >
                              {event.isPublished ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(event)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(event)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent
                ? t("settings:events.editEvent", "Edit Event")
                : t("settings:events.createEvent", "Create Event")}
            </DialogTitle>
            <DialogDescription>
              {t("settings:events.eventFormDescription", "Fill in the event details below")}
            </DialogDescription>
          </DialogHeader>

          {/* Past Date Warning */}
          {showPastDateWarning && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("settings:events.pastDateWarning", "Warning: This event date is in the past. It will appear in the 'Past Events' section.")}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                {t("settings:events.eventTitle", "Event Title")} *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("settings:events.titlePlaceholder", "e.g., Sunday Worship Service")}
                maxLength={200}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                {t("settings:events.eventDescription", "Description")} *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("settings:events.descriptionPlaceholder", "Brief description of the event...")}
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/1000
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {t("settings:events.eventDate", "Date")} *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.eventDate && "text-muted-foreground",
                        dateError && "border-red-500 focus:ring-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.eventDate ? format(formData.eventDate, 'PPP') : <span>{t('members:pickDate', 'Pick a date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.eventDate}
                      onSelect={(date) => {
                        setFormData({ ...formData, eventDate: date });
                        setDateError(null);

                        // Check if date is in the past
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date) {
                          const selected = new Date(date);
                          selected.setHours(0, 0, 0, 0);
                          if (selected < today) {
                            setShowPastDateWarning(true);
                          } else {
                            setShowPastDateWarning(false);
                          }
                        } else {
                          setShowPastDateWarning(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {dateError && (
                  <p className="text-sm text-red-600" role="alert">{dateError}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="eventTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t("settings:events.eventTime", "Time")} *
                </Label>
                <Input
                  id="eventTime"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                  placeholder={t("settings:events.timePlaceholder", "e.g., 10:00 AM")}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("settings:events.eventAddress", "Address")} *
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t("settings:events.addressPlaceholder", "123 Main St, City, State 12345")}
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
              <Label htmlFor="isPublished">
                {t("settings:events.publishToLanding", "Publish to landing page")}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              {t("common:cancel", "Cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common:saving", "Saving...")}
                </>
              ) : (
                t("common:save", "Save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:events.deleteConfirmTitle", "Confirm Deletion")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:events.deleteConfirm", "Are you sure you want to delete this event? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
