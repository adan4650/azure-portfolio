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

export const certificationGoals = [
  { title: 'Security+', description: 'CompTIA', status: 'Earned', complete: true },
  { title: 'AZ-900', description: 'Azure Fundamentals', status: 'Planned', complete: false },
  { title: 'AZ-104', description: 'Azure Administrator', status: 'Planned', complete: false },
]

export const currentProject = {
  id: 'introduction',
  videoId: 'azure-portfolio-introduction',
  title: 'Introduction: Website & Azure setup',
  status: 'Completed',
  description: 'My first step into the cloud: building this website and setting up the Azure web tools behind it.',
  summary: 'I built this portfolio, set up Azure Static Web Apps, and configured a GitHub Actions workflow to build and deploy the site. This introduction establishes the foundation for the projects that follow.',
  completed: [
    'Built the portfolio website',
    'Set up Azure for Students and a resource group',
    'Configured a budget and spending alerts',
    'Created the GitHub repository',
    'Set up Azure Static Web Apps',
    'Configured the GitHub Actions build and deployment workflow',
  ],
  upcoming: ['Infrastructure & Automation', 'Monitoring & Alerting', 'CI/CD Pipeline'],
}

type PlannedProject = {
  id: string
  title: string
  shortTitle: string
  status: 'Up next' | 'Planned'
  description: string
  summary: string
  goals: string[]
  connection: string
  icon: 'infrastructure' | 'monitoring' | 'pipeline'
  businessProblem: string
  documentationFocus: string
  productionQuestions: string[]
  repositoryUrl?: string
}

export const plannedProjects: PlannedProject[] = [
  {
    id: 'infrastructure-automation',
    title: 'Infrastructure & Automation',
    shortTitle: 'Infrastructure',
    status: 'Up next',
    description: 'Build a repeatable Azure environment with Terraform.',
    summary: 'I plan to move from setting up the website to defining an Azure environment in code, with connected networks, restricted access, and shared Terraform state.',
    goals: [
      'Provision the Azure environment with Terraform',
      'Build hub-and-spoke virtual networks',
      'Apply least-privilege network security group rules',
      'Deploy a virtual machine in a private subnet',
      'Connect an Azure Storage account through a private endpoint',
      'Store remote Terraform state in Azure Blob Storage',
    ],
    connection: 'The website introduces Azure. Next, build an environment that can be recreated from code.',
    icon: 'infrastructure',
    businessProblem: 'The goal is to reduce manual setup and inconsistent environments by making infrastructure repeatable, reviewable, and designed around limited access.',
    documentationFocus: 'I’ll record networking and private-access struggles, the alternatives I consider, and the evidence behind my topology, access rules, and Terraform state decisions.',
    productionQuestions: [
      'How would the network and access model change for multiple teams, workloads, or regions?',
      'What additional controls would shared Terraform state, recovery, and infrastructure changes need?',
    ],
  },
  {
    id: 'monitoring-alerting',
    title: 'Monitoring & Alerting',
    shortTitle: 'Monitoring & Alerts',
    status: 'Planned',
    description: 'Turn environment activity into useful alerts.',
    summary: 'I plan to add Azure Monitor and Log Analytics to the Terraform environment, use KQL to investigate activity, and deliver formatted alerts through a Logic App.',
    goals: [
      'Connect Azure Monitor and a Log Analytics workspace',
      'Create KQL detection rules for failed login attempts',
      'Create KQL detection rules for suspicious access patterns',
      'Create KQL detection rules for configuration changes to privileged resources',
      'Use a Logic App to send formatted alerts when detection rules fire',
    ],
    connection: 'Once the infrastructure exists, the next step is understanding what happens inside it.',
    icon: 'monitoring',
    businessProblem: 'The goal is to make risky activity easier to notice and investigate, with alerts that give an operator useful context instead of requiring constant manual log review.',
    documentationFocus: 'I’ll document log collection gaps, KQL troubleshooting, and alert noise, along with the alternatives and test evidence behind each query and notification decision.',
    productionQuestions: [
      'How would query cost, log retention, and alert volume change as the environment grows?',
      'How would alert ownership, escalation, and response procedures work across a larger team?',
    ],
  },
  {
    id: 'cicd-pipeline',
    title: 'CI/CD Pipeline',
    shortTitle: 'CI/CD Pipeline',
    status: 'Planned',
    description: 'Make infrastructure changes a controlled delivery process.',
    summary: 'I plan to connect the Terraform repository to GitHub Actions so each commit is validated and planned, while applying changes requires approval and main is protected.',
    goals: [
      'Connect the Terraform repository to GitHub Actions',
      'Run Terraform validate and plan on every commit',
      'Require a manual approval gate before Terraform apply',
      'Protect the main branch against direct commits',
    ],
    connection: 'With infrastructure and monitoring defined, the next step is controlling how changes reach the environment.',
    icon: 'pipeline',
    businessProblem: 'The goal is to make infrastructure changes traceable and reviewable, catch problems before deployment, and give a team an explicit approval point before changes are applied.',
    documentationFocus: 'I’ll record workflow and approval struggles, explain the alternatives I considered, and show the evidence behind the checks, branch protections, and deployment permissions.',
    productionQuestions: [
      'How would separate development, staging, and production environments change the approval process?',
      'How would the team handle concurrent changes, failed deployments, drift, and emergency fixes?',
    ],
  },
]

export const projectReadmeSections = [
  {
    title: 'Business problem',
    description: 'Explain the problem, who it affects, and the outcome the project is meant to support. Keep intended benefits separate from results I can demonstrate.',
  },
  {
    title: 'Architecture diagram',
    description: 'Show the Azure resources, connections, access boundaries, and flow of data or deployments. Update the diagram as the implementation changes.',
  },
  {
    title: 'Key decisions & why',
    description: 'Record the struggles, alternatives considered, and evidence behind the choices I make, including what failed and how I worked through it.',
  },
  {
    title: 'At production scale',
    description: 'Explain what I would change for a larger production environment, including security, reliability, cost, ownership, and the tradeoffs that still need testing.',
  },
]

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
export const videos: PortfolioVideo[] = [
  {
    id: 'azure-portfolio-introduction',
    title: 'Introducing my Azure portfolio',
    description: 'An introduction to my portfolio and the start of my Azure learning journey.',
    project: 'Project 01 · Introduction',
    media: { type: 'youtube', videoId: 'pgwBtNrTJS4' },
  },
]
