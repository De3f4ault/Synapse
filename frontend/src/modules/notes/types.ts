export type ViewMode = 'list' | 'grid' | 'masonry';

export interface ViewOption {
  value: ViewMode;
  label: string;
  icon: React.ReactNode;
}
