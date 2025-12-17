export interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  isHeading?: boolean;
  isParagraphBreak?: boolean;
}

export type BookFormat = 'txt' | 'fb2' | 'epub';

