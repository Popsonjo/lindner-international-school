/**
 * Marketing/public-site content only — the school's actual portal data
 * (students, teachers, events, grades) now lives in Supabase (see
 * supabase/schema.sql and supabase/seed.sql), not here.
 */

export const HOUSES = {
  Phoenix: { color: 'from-orange-600 to-red-700 bg-orange-50 text-orange-950 border-orange-200' },
  Griffin: { color: 'from-amber-500 to-amber-700 bg-amber-50 text-amber-950 border-amber-200' },
  Pegasus: { color: 'from-teal-600 to-teal-800 bg-teal-50 text-teal-950 border-teal-200' },
  Dragon: { color: 'from-rose-600 to-purple-800 bg-rose-50 text-rose-950 border-rose-200' }
};

/** Termly house-point standings, updated by the PE & Pastoral Care office. */
export const HOUSE_POINTS: Record<keyof typeof HOUSES, number> = {
  Phoenix: 1840,
  Dragon: 1795,
  Pegasus: 1720,
  Griffin: 1665,
};

export interface NewsArticle {
  id: string;
  title: string;
  date: string;
  tag: string;
  summary: string;
}

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'Global Innovation & STEM Exhibition',
    date: 'June 18, 2026',
    tag: 'Academic',
    summary: 'High school science teams are preparing interactive experiments on alternative energy and machine-learning diagnostics. Parents are warmly invited.',
  },
  {
    id: 'news-2',
    title: 'Symphonic Chamber Orchestral Premieres',
    date: 'June 12, 2026',
    tag: 'Arts & Culture',
    summary: 'The Music Department will present its end-of-term recital featuring classic choral literature and student compositions in our state-of-the-art Auditorium.',
  },
  {
    id: 'news-3',
    title: 'IB DP Extended Essay Preparatory Camp',
    date: 'June 20, 2026',
    tag: 'Exams & Study',
    summary: 'Mandatory technical thesis drafting workshops are scheduled for Eleventh Grade scholars to support thesis arguments and evidence mapping with faculty leads.',
  },
  {
    id: 'news-4',
    title: 'Inter-House Football Cup Finals',
    date: 'June 16, 2026',
    tag: 'Sports',
    summary: 'Phoenix House and Dragon House face off in the annual championship round on the Main School Grounds. All families are encouraged to attend.',
  },
];

export const PRINCIPAL = {
  name: 'Dr. Clara Lindner-Webb',
  title: 'Principal',
  photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&h=400&q=80',
  message: [
    'Welcome to Lindner International School. Whether you are a prospective family exploring our campus for the first time, or a returning member of our community, I am delighted you are here.',
    'Our classrooms are built on the belief that rigorous scholarship and genuine kindness are not in tension — they reinforce one another. Every scholar who walks through our gates is known by name, challenged to think critically, and supported to become a compassionate global citizen.',
    'I invite you to explore what makes LIS distinct: our International Baccalaureate framework, our House-based pastoral care system, and a faculty who treat teaching as a vocation rather than a job.',
  ],
};

export interface MissionPillar {
  id: string;
  title: string;
  description: string;
}

export const MISSION_PILLARS: MissionPillar[] = [
  {
    id: 'rigor',
    title: 'Epistemic Integrity & Rigor',
    description: 'Our curriculum combines standard STEM subjects with the arts, sparking persistent enquiry and cognitive autonomy.',
  },
  {
    id: 'leadership',
    title: 'Ethical Leadership Architecture',
    description: 'Through the House structures (Phoenix, Pegasus, Dragon, Griffin), students engage in service learning, team governance, and empathetic guidance.',
  },
  {
    id: 'global',
    title: 'Global Perspective Framework',
    description: 'Active Model UN networks and International Student Exchange forums teach scholars to negotiate diversity and lead globally in an interconnected epoch.',
  },
];

export interface AdmissionPathway {
  id: string;
  title: string;
  ageRange: string;
  description: string;
  anchorId: string;
}

export const ADMISSION_PATHWAYS: AdmissionPathway[] = [
  {
    id: 'nursery',
    title: 'Early Years & Nursery',
    ageRange: 'Ages 2 - 5',
    description: 'Play-based foundational learning that builds curiosity, language, and social confidence.',
    anchorId: 'process',
  },
  {
    id: 'primary',
    title: 'Primary School',
    ageRange: 'Ages 6 - 10',
    description: 'A structured, enquiry-driven curriculum covering literacy, numeracy, science, and the arts.',
    anchorId: 'process',
  },
  {
    id: 'secondary',
    title: 'Secondary School',
    ageRange: 'Ages 11 - 18',
    description: 'IGCSE and IB Diploma pathways preparing scholars for global university admission.',
    anchorId: 'process',
  },
  {
    id: 'transfer',
    title: 'International & Transfer Students',
    ageRange: 'All ages',
    description: 'Dedicated onboarding and credit-transfer support for families relocating from abroad.',
    anchorId: 'requirements',
  },
];
