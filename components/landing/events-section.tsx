"use client";

import { Calendar, Clock, MapPin } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  address: string;
  isPublished: boolean;
}

interface EventsSectionProps {
  upcomingEvents: Event[];
  pastEvents: Event[];
  buttonBackgroundColor: string;
  buttonTextColor: string;
  eventTitleColor?: string;
  eventDetailsColor?: string;
}

export function EventsSection({
  upcomingEvents,
  pastEvents,
  buttonBackgroundColor,
  buttonTextColor,
  eventTitleColor = '#FFFFFF',
  eventDetailsColor = '#FFFFFF'
}: EventsSectionProps) {
  const formatMonth = (dateString: string) => {
    // Parse as UTC to preserve the date stored by parseDateAtNoon
    const date = new Date(dateString);
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    const localDate = new Date(utcYear, utcMonth, utcDay);
    return localDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };

  const formatDay = (dateString: string) => {
    const date = new Date(dateString);
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    const localDate = new Date(utcYear, utcMonth, utcDay);
    return localDate.getDate();
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    const localDate = new Date(utcYear, utcMonth, utcDay);
    return localDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Only show the first 3 upcoming and 2 past events
  const displayUpcoming = upcomingEvents.slice(0, 3);
  const displayPast = pastEvents.slice(0, 2);

  if (displayUpcoming.length === 0 && displayPast.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md space-y-6 mt-8">
      {/* Upcoming Events */}
      {displayUpcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </h3>
          <div className="space-y-3">
            {displayUpcoming.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 rounded-xl p-4 backdrop-blur-sm shadow-lg transition hover:shadow-xl"
                style={{
                  backgroundColor: `${buttonBackgroundColor}15`,
                }}
              >
                {/* Date Box */}
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: buttonBackgroundColor,
                  }}
                >
                  <div
                    className="text-[10px] font-bold leading-none"
                    style={{ color: buttonTextColor }}
                  >
                    {formatMonth(event.eventDate)}
                  </div>
                  <div
                    className="text-2xl font-bold leading-none mt-1"
                    style={{ color: buttonTextColor }}
                  >
                    {formatDay(event.eventDate)}
                  </div>
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <h4
                    className="font-semibold text-base leading-snug"
                    style={{ color: eventTitleColor }}
                  >
                    {event.title}
                  </h4>

                  {/* Description */}
                  {event.description && (
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: eventDetailsColor, opacity: 0.9 }}
                    >
                      {event.description}
                    </p>
                  )}

                  {/* Date, Time, and Address */}
                  <div className="space-y-1.5 text-xs" style={{ color: eventDetailsColor }}>
                    <div className="flex items-start gap-1.5">
                      <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{formatFullDate(event.eventDate)}, {event.eventTime}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{event.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {displayPast.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white/70 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Past Events
          </h3>
          <div className="space-y-3 opacity-70">
            {displayPast.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 rounded-xl p-4 backdrop-blur-sm shadow-lg"
                style={{
                  backgroundColor: `${buttonBackgroundColor}10`,
                }}
              >
                {/* Date Box */}
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center opacity-80"
                  style={{
                    backgroundColor: buttonBackgroundColor,
                  }}
                >
                  <div
                    className="text-[9px] font-bold leading-none"
                    style={{ color: buttonTextColor }}
                  >
                    {formatMonth(event.eventDate)}
                  </div>
                  <div
                    className="text-xl font-bold leading-none mt-1"
                    style={{ color: buttonTextColor }}
                  >
                    {formatDay(event.eventDate)}
                  </div>
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h4
                    className="font-semibold text-sm leading-snug"
                    style={{ color: eventTitleColor }}
                  >
                    {event.title}
                  </h4>

                  {/* Description */}
                  {event.description && (
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: eventDetailsColor, opacity: 0.8 }}
                    >
                      {event.description}
                    </p>
                  )}

                  {/* Date */}
                  <div className="text-xs" style={{ color: eventDetailsColor, opacity: 0.8 }}>
                    <div className="flex items-start gap-1.5">
                      <Calendar className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{formatFullDate(event.eventDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
