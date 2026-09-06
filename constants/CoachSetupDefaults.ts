// Coach profile form defaults and enums

export const COACH_TITLES = [
  'Head Coach',
  'Associate Head Coach',
  'Offensive Coordinator',
  'Defensive Coordinator',
  'Special Teams Coordinator',
  'Quarterbacks Coach',
  'Running Backs Coach',
  'Wide Receivers Coach',
  'Tight Ends Coach',
  'Offensive Line Coach',
  'Defensive Line Coach',
  'Linebackers Coach',
  'Defensive Backs Coach',
  'Director of Football Operations',
  'Assistant Coach',
  'Recruiting Coordinator',
  'Graduate Assistant',
];

export const DIVISIONS = [
  { label: 'NCAA D1 FBS', value: 'NCAA D1 FBS' },
  { label: 'NCAA D1 FCS', value: 'NCAA D1 FCS' },
  { label: 'NCAA D2', value: 'NCAA D2' },
  { label: 'NCAA D3', value: 'NCAA D3' },
  { label: 'NAIA', value: 'NAIA' },
  { label: 'NJCAA', value: 'NJCAA' },
];

export const NJCAA_REGIONS = [
  'California',
  'Colorado',
  'Florida',
  'Illinois',
  'Iowa',
  'Kansas',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Nebraska',
  'New Mexico',
  'New York',
  'Ohio',
  'Oklahoma',
  'Pennsylvania',
  'Tennessee',
  'Texas',
  'Washington',
];

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'LS'] as const;

export const LEVEL_BANDS = [
  'Elite P4/FBS Prospect',
  'Strong FBS/FCS Prospect',
  'FCS/D2 Prospect',
  'D2/D3/NAIA Prospect',
  'JUCO/Development Prospect',
  'Significant Development Needed',
];
