export const profile = {
  displayName: 'Andre Daniels Jr.' as string | null,
  githubUrl: 'https://github.com/adan4650',
  repositoryUrl: 'https://github.com/adan4650/azure-portfolio',
  linkedInUrl: 'https://www.linkedin.com/in/andre-daniels-7b5625253/' as string | null,
  portraitUrl: '/assets/portrait.jpg',
}

export const credentials = [
  { category: 'Education', title: 'Computer Science Degree' },
  { category: 'Certification', title: 'CompTIA Security+' },
  { category: 'Experience', title: 'IT Analyst', detail: 'Iron Bow Technologies' },
  { category: 'Education', title: 'M.Eng. Computer Science', detail: 'Virginia Tech', status: 'In progress' },
]

export const currentProject = {
  title: 'Azure Portfolio',
  status: 'In progress',
  description: 'Hosting, DNS, security, and automated deployment.',
  summary: 'My first cloud project is this portfolio. I’m documenting what I build, why I make each decision, and what I learn along the way.',
  completed: ['Azure for Students subscription', 'Resource group', 'Budget & spending alerts', 'GitHub repository'],
  upcoming: ['Azure hosting', 'Custom domain & DNS', 'Security & HTTPS', 'Automated deployment'],
}

export type PortfolioVideo = {
  id: string
  title: string
  description: string
  project: string
  thumbnailUrl?: string
  media:
    | { type: 'file'; url: string; captionsUrl?: string }
    | { type: 'youtube'; videoId: string }
    | { type: 'link'; url: string; label: string }
}

// Add only the owner's supplied project videos here. The homepage and library
// share this collection; an empty collection shows an honest coming-soon state.
export const videos: PortfolioVideo[] = []
