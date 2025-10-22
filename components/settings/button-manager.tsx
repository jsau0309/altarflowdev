"use client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Trash2, Plus, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

export interface ButtonConfig {
  id: string;
  type: 'preset' | 'custom';
  label: string;
  url?: string; // Only for custom buttons
  enabled: boolean;
  order: number;
}

interface ButtonManagerProps {
  buttons: ButtonConfig[];
  onButtonsChange: (buttons: ButtonConfig[]) => void;
  hasStripeAccount?: boolean;
  hasActiveFlow?: boolean;
}

function SortableButton({
  button,
  onToggle,
  onLabelChange,
  onUrlChange,
  onDelete,
  statusInfo,
}: {
  button: ButtonConfig;
  onToggle: () => void;
  onLabelChange: (label: string) => void;
  onUrlChange?: (url: string) => void;
  onDelete?: () => void;
  statusInfo?: {
    available: boolean;
    reason?: string;
  };
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: button.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isPreset = button.type === 'preset';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-card border rounded-lg ${
        !button.enabled ? 'opacity-60' : ''
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>

      {/* Toggle Switch */}
      <div className="flex items-center">
        <Switch
          checked={button.enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {/* Button Configuration */}
      <div className="flex-1 grid gap-2">
        {/* Label Input */}
        <div>
          <Input
            value={button.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Button label"
            className="font-medium"
            disabled={!button.enabled}
          />
        </div>

        {/* URL Input (only for custom buttons) */}
        {!isPreset && (
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
            <Input
              value={button.url || ''}
              onChange={(e) => onUrlChange?.(e.target.value)}
              placeholder="https://example.com"
              className="text-sm"
              disabled={!button.enabled}
            />
          </div>
        )}

        {/* Preset Badge */}
        {isPreset && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {button.id === 'donate' ? 'Donate Page' : 'Connect Flow'}
            </span>
          </div>
        )}

        {/* Status Indicator */}
        {button.enabled && statusInfo && (
          <div className="flex items-start gap-2 mt-1">
            {statusInfo.available ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Will show on landing page</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{statusInfo.reason}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Button (only for custom buttons) */}
      {!isPreset && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={!button.enabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function ButtonManager({
  buttons,
  onButtonsChange,
  hasStripeAccount = false,
  hasActiveFlow = false,
}: ButtonManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate status for each button
  const getButtonStatus = (button: ButtonConfig) => {
    if (button.type === 'custom') {
      const hasUrl = !!button.url && button.url.trim().length > 0;
      return {
        available: hasUrl,
        reason: hasUrl ? undefined : 'Add a URL to make this button visible',
      };
    }

    // Preset buttons
    if (button.id === 'donate') {
      return {
        available: hasStripeAccount,
        reason: hasStripeAccount
          ? undefined
          : 'Set up Stripe Connect in Banking settings (paid feature)',
      };
    }

    if (button.id === 'connect') {
      return {
        available: hasActiveFlow,
        reason: hasActiveFlow
          ? undefined
          : 'Create a Flow in Flows settings (free - start here first!)',
      };
    }

    return { available: true };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = buttons.findIndex((btn) => btn.id === active.id);
      const newIndex = buttons.findIndex((btn) => btn.id === over.id);

      const newButtons = arrayMove(buttons, oldIndex, newIndex).map((btn, index) => ({
        ...btn,
        order: index,
      }));

      onButtonsChange(newButtons);
    }
  };

  const handleToggle = (buttonId: string) => {
    const newButtons = buttons.map((btn) =>
      btn.id === buttonId ? { ...btn, enabled: !btn.enabled } : btn
    );
    onButtonsChange(newButtons);
  };

  const handleLabelChange = (buttonId: string, label: string) => {
    const newButtons = buttons.map((btn) =>
      btn.id === buttonId ? { ...btn, label } : btn
    );
    onButtonsChange(newButtons);
  };

  const handleUrlChange = (buttonId: string, url: string) => {
    const newButtons = buttons.map((btn) =>
      btn.id === buttonId ? { ...btn, url } : btn
    );
    onButtonsChange(newButtons);
  };

  const handleDelete = (buttonId: string) => {
    const newButtons = buttons
      .filter((btn) => btn.id !== buttonId)
      .map((btn, index) => ({ ...btn, order: index }));
    onButtonsChange(newButtons);
  };

  const handleAddCustomButton = () => {
    const newButton: ButtonConfig = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      label: 'New Button',
      url: '',
      enabled: true,
      order: buttons.length,
    };
    onButtonsChange([...buttons, newButton]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Button Manager</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Drag to reorder, toggle to enable/disable
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCustomButton}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Custom Button
        </Button>
      </div>

      {/* Sortable List */}
      {buttons.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={buttons.map((btn) => btn.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {buttons.map((button) => (
                <SortableButton
                  key={button.id}
                  button={button}
                  onToggle={() => handleToggle(button.id)}
                  onLabelChange={(label) => handleLabelChange(button.id, label)}
                  onUrlChange={
                    button.type === 'custom'
                      ? (url) => handleUrlChange(button.id, url)
                      : undefined
                  }
                  onDelete={
                    button.type === 'custom'
                      ? () => handleDelete(button.id)
                      : undefined
                  }
                  statusInfo={getButtonStatus(button)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            No buttons yet. Add your first button to get started.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomButton}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Button
          </Button>
        </div>
      )}
    </div>
  );
}
