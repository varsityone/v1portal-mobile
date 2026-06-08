import { Plan } from '../hooks/useSubscription';

export interface PhaseItem {
  label: string;
}

export interface Phase {
  number: number;
  title: string;
  description: string;
  items: PhaseItem[];
  minPlan: Plan;
  upgradeTo: 'pro' | 'elite' | null;
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
    minPlan: 'free',
    upgradeTo: null,
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
    minPlan: 'pro',
    upgradeTo: 'pro',
  },
  {
    number: 3,
    title: 'Strategic Program Targeting',
    description: "Get a curated list of programs matched to your V1 Score and tier — no more guessing who's realistic.",
    items: [
      { label: 'View your matched programs' },
      { label: 'Review match scores and why they fit' },
      { label: 'Filter by division, region, and tier' },
    ],
    minPlan: 'pro',
    upgradeTo: 'pro',
  },
  {
    number: 4,
    title: 'Intelligent Outreach',
    description: 'Use tier-specific email templates to contact coaches at your matched programs. Track replies and follow-ups in one place.',
    items: [
      { label: 'Access position-specific email templates' },
      { label: 'Send your first outreach email' },
      { label: 'Track coach responses and follow up' },
    ],
    minPlan: 'pro',
    upgradeTo: 'pro',
  },
  {
    number: 5,
    title: 'Relationship Management',
    description: 'Track every coach relationship from first email to offer. Log status, priority, and next actions in your full recruiting pipeline.',
    items: [
      { label: 'Track all coach communications' },
      { label: 'Build your relationship timeline' },
      { label: 'Monitor recruiting interest levels' },
    ],
    minPlan: 'elite',
    upgradeTo: 'elite',
  },
  {
    number: 6,
    title: 'Execute the Timeline',
    description: 'Stay on schedule through signing day. Review key deadlines, schedule campus visits, and execute your recruiting calendar.',
    items: [
      { label: 'Review key recruiting deadlines' },
      { label: 'Schedule campus visits' },
      { label: 'Execute your recruiting calendar' },
    ],
    minPlan: 'elite',
    upgradeTo: 'elite',
  },
];

const PLAN_ORDER: Plan[] = ['free', 'pro', 'elite'];

export function isPhaseUnlocked(phase: Phase, userPlan: Plan): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(phase.minPlan);
}
