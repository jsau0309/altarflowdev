"use client";

import { useState, useEffect } from "react";
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
import { Calendar, Clock, MapPin, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import LoaderOne from "@/components/ui/loader-one";

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
  eventDate: string;
  eventTime: string;
  address: string;
  isPublished: boolean;
}

const initialFormData: EventFormData = {
  title: "",
  description: "",
  eventDate: "",
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

  // Load events
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/settings/events");
      if (!response.ok) throw new Error("Failed to load events");

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast.error(t("settings:events.loadError", "Failed to load events"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description,
        eventDate: new Date(event.eventDate).toISOString().split('T')[0],
        eventTime: event.eventTime,
        address: event.address,
        isPublished: event.isPublished,
      });
    } else {
      setEditingEvent(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setFormData(initialFormData);
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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
      console.error("Failed to save event:", error);
      toast.error(error.message || t("settings:events.saveError", "Failed to save event"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm(t("settings:events.deleteConfirm", "Are you sure you want to delete this event?"))) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success(t("settings:events.deleteSuccess", "Event deleted successfully"));
      loadEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
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
      console.error("Failed to toggle event:", error);
      toast.error(t("settings:events.toggleError", "Failed to update event"));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPastEvent = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Separate upcoming and past events
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.eventDate) >= now);
  const pastEvents = events.filter(e => new Date(e.eventDate) < now);

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
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                              onClick={() => handleDelete(event.id)}
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
                    {pastEvents.reverse().map((event) => (
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
                              onClick={() => handleDelete(event.id)}
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
                <Label htmlFor="eventDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("settings:events.eventDate", "Date")} *
                </Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                />
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
                  <LoaderOne className="h-4 w-4 mr-2" />
                  {t("common:saving", "Saving...")}
                </>
              ) : (
                t("common:save", "Save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
