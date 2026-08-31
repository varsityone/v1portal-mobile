export interface PhaseItem {
  label: string;
}

export interface Phase {
  number: number;
  title: string;
  description: string;
  items: PhaseItem[];
}

export const PHASES: Phase[] = [
  {
    number: 1,
    title: 'Know Your Value',
    description: 'Get your V1 Score, understand your recruiting tier, and see exactly where you fit in college football.',
    items: [
      { label: 'Complete the V1 Assessment' },
      { label: 'Review your full V1 Score breakdown' },
      { label: 'Understand your recruiting tier' },
    ],
  },
  {
    number: 2,
    title: 'Build Your Profile',
    description: 'Fill out your public athlete profile with film, measurables, academic info, and stats so coaches can evaluate you at a glance.',
    items: [
      { label: 'Complete your public athlete profile' },
      { label: 'Upload film and game highlights' },
      { label: 'Add academic stats and test scores' },
    ],
  },
  {
    number: 3,
    title: 'Find Your Matches',
    description: 'Swipe through programs that fit your level, match with coaches who are actually interested, and message them directly.',
    items: [
      { label: 'Browse programs at your level' },
      { label: 'Like the programs you want to hear from' },
      { label: 'Message your matches' },
    ],
  },
  {
    number: 4,
    title: 'Execute the Timeline',
    description: 'Stay on schedule through signing day. Review key deadlines, schedule campus visits, and execute your recruiting calendar.',
    items: [
      { label: 'Review key recruiting deadlines' },
      { label: 'Schedule campus visits' },
      { label: 'Execute your recruiting calendar' },
    ],
  },
];
