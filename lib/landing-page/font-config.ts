// Font family mappings for landing page titles
export const TITLE_FONTS = {
  Modern: { name: 'Modern', family: 'ui-sans-serif, system-ui, sans-serif' },
  Elegant: { name: 'Elegant', family: 'Georgia, "Times New Roman", serif' },
  Bold: { name: 'Bold', family: '"Arial Black", "Arial Bold", sans-serif' },
  Classic: { name: 'Classic', family: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  Playful: { name: 'Playful', family: '"Comic Sans MS", "Chalkboard SE", sans-serif' },
} as const;

// Title size mappings
export const TITLE_SIZES = {
  Small: { name: 'Small', className: 'text-xl' },
  Medium: { name: 'Medium', className: 'text-2xl' },
  Large: { name: 'Large', className: 'text-3xl' },
  'Extra Large': { name: 'Extra Large', className: 'text-4xl' },
} as const;

export function getTitleFont(font: string): string {
  return TITLE_FONTS[font as keyof typeof TITLE_FONTS]?.family || TITLE_FONTS.Modern.family;
}

export function getTitleSizeClass(size: string): string {
  return TITLE_SIZES[size as keyof typeof TITLE_SIZES]?.className || TITLE_SIZES.Large.className;
}
