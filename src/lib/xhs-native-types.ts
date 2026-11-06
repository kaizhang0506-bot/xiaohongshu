import type { CARD_FONTS } from './card-typography';

export type NativeFont = keyof typeof CARD_FONTS;
export type NativeComposition = 'headline' | 'sidebar' | 'collage' | 'checklist' | 'editorial';
export type NativeDecoration = 'rings' | 'tape' | 'riso' | 'daisy' | 'grid' | 'ribbon' | 'stamp' | 'waves' | 'dots' | 'stitch' | 'corners' | 'scallop' | 'brackets' | 'sun' | 'leaf' | 'calendar' | 'confetti' | 'film' | 'polaroid' | 'brush';

export interface NativeFamily {
  id: string;
  name: string;
  description: string;
  bg: string;
  paper: string;
  ink: string;
  accent: string;
  secondary: string;
  titleFont: NativeFont;
  bodyFont: NativeFont;
  decoration: NativeDecoration;
}

export interface NativeTemplate {
  id: string;
  name: string;
  family: NativeFamily;
  composition: NativeComposition;
  description: string;
  number: number;
  align: 'left' | 'center';
  titleSize: number;
  titleWeight: number;
  letterSpacing: number;
}
