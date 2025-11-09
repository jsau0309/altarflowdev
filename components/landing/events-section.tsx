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
}

export function EventsSection({
  upcomingEvents,
  pastEvents,
  buttonBackgroundColor,
  buttonTextColor
}: EventsSectionProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
                className="rounded-xl p-4 backdrop-blur-sm shadow-lg transition hover:shadow-xl"
                style={{
                  backgroundColor: `${buttonBackgroundColor}15`,
                  borderLeft: `4px solid ${buttonBackgroundColor}`,
                }}
              >
                <h4
                  className="font-semibold mb-2 text-base"
                  style={{ color: buttonTextColor }}
                >
                  {event.title}
                </h4>
                <p className="text-sm text-white/80 mb-3 line-clamp-2">
                  {event.description}
                </p>
                <div className="space-y-1.5 text-xs text-white/70">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{formatDate(event.eventDate)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{event.eventTime}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{event.address}</span>
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
                className="rounded-xl p-4 backdrop-blur-sm shadow-lg"
                style={{
                  backgroundColor: `${buttonBackgroundColor}10`,
                  borderLeft: `4px solid ${buttonBackgroundColor}80`,
                }}
              >
                <h4
                  className="font-semibold mb-2 text-sm"
                  style={{ color: buttonTextColor }}
                >
                  {event.title}
                </h4>
                <div className="space-y-1 text-xs text-white/60">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{formatDate(event.eventDate)}</span>
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
