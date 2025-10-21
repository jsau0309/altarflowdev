export interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  css: string;
  preview: string; // For preview in settings
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'preset-1',
    name: 'Ocean Blue',
    description: 'Calm blue gradient',
    css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'preset-2',
    name: 'Sunset Orange',
    description: 'Warm sunset colors',
    css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'preset-3',
    name: 'Forest Green',
    description: 'Natural green gradient',
    css: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
    preview: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
  },
  {
    id: 'preset-4',
    name: 'Royal Purple',
    description: 'Deep purple tones',
    css: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
    preview: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
  },
  {
    id: 'preset-5',
    name: 'Sky Blue',
    description: 'Light and airy blue',
    css: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
    preview: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  },
  {
    id: 'preset-6',
    name: 'Golden Hour',
    description: 'Warm golden tones',
    css: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    preview: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  },
  {
    id: 'preset-7',
    name: 'Rose Pink',
    description: 'Soft pink gradient',
    css: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
    preview: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
  },
  {
    id: 'preset-8',
    name: 'Deep Sea',
    description: 'Dark blue oceanic',
    css: 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)',
    preview: 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)',
  },
  {
    id: 'preset-9',
    name: 'Autumn Leaves',
    description: 'Fall color palette',
    css: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    preview: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    id: 'preset-10',
    name: 'Midnight Sky',
    description: 'Dark elegant gradient',
    css: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
    preview: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
  },
  {
    id: 'preset-classic',
    name: 'Classic AltarFlow',
    description: 'Original blue-gray gradient',
    css: 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)',
    preview: 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)',
  },
];

export function getBackgroundStyle(
  backgroundType: string,
  backgroundValue: string | null
): string {
  switch (backgroundType) {
    case 'PRESET': {
      const preset = BACKGROUND_PRESETS.find(p => p.id === backgroundValue);
      return preset?.css || BACKGROUND_PRESETS[0].css;
    }
    case 'GRADIENT':
      return backgroundValue || BACKGROUND_PRESETS[0].css;
    case 'SOLID':
      return backgroundValue || '#3b82f6';
    case 'IMAGE':
      return `url(${backgroundValue})`;
    default:
      return BACKGROUND_PRESETS[0].css;
  }
}
