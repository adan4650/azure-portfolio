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
  { category: 'Certification', title: 'Microsoft Azure Fundamentals', detail: 'AZ-900 · Earned' },
  { category: 'Experience', title: 'IT Analyst', detail: 'Iron Bow Technologies' },
  { category: 'Experience', title: 'Digital Forensics Intern', detail: 'Virginia State Police' },
  { category: 'Education', title: 'M.Eng. Computer Science', detail: 'Virginia Tech', status: 'In progress' },
]

export const certificationGoals = [
  { title: 'Security+', description: 'CompTIA', status: 'Earned', complete: true },
  { title: 'AZ-900', description: 'Azure Fundamentals', status: 'Earned', complete: true },
  { title: 'AZ-104', description: 'Azure Administrator', status: 'Planned', complete: false },
]

export const currentProject = {
  id: 'introduction',
  videoId: 'azure-portfolio-introduction',
  title: 'Azure Portfolio & Contact System',
  status: 'Completed',
  description: 'A deployed portfolio with a public contact form, Microsoft sign-in, and a private owner inbox.',
  summary: 'I built the React and TypeScript frontend on Azure Static Web Apps, connected a standalone Azure Function to Table Storage through managed identity, and automated the frontend and Function deployments with GitHub Actions. This is the foundation for my next build: an Enterprise Service Desk API.',
  completed: [
    'Built and deployed the portfolio on Azure Static Web Apps',
    'Added a validated contact form with server-verified Turnstile',
    'Stored submissions in Azure Table Storage using managed identity',
    'Added Microsoft sign-in and server-side owner authorization for the private inbox',
    'Configured monitoring, a 5xx alert, and verified email delivery',
    'Automated frontend and Function releases through GitHub Actions, using OIDC for the Function deployment',
    'Set up Azure for Students, a resource group, a budget, and spending alerts',
  ],
  upcoming: ['Enterprise Service Desk API', 'Secure Azure Network & Governance Lab', 'Cloud Reliability & Recovery Lab'],
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
    id: 'enterprise-service-desk',
    title: 'Enterprise Service Desk API | DevSecOps Project',
    shortTitle: 'Service Desk API',
    status: 'Up next',
    description: 'Take the contact-system foundation into a complete support-ticket workflow.',
    summary: 'I plan to build an ASP.NET Core REST API backed by PostgreSQL and synthetic support tickets, with role-based access, input validation, ticket assignment and status workflows, and audit logging.',
    goals: [
      'Build an ASP.NET Core REST API backed by PostgreSQL and synthetic support tickets',
      'Add role-based access, input validation, ticket assignment, status workflows, and audit logging',
      'Protect the main branch and review changes through GitHub pull requests',
      'Automate API tests, Docker image builds, and container vulnerability scans with GitHub Actions',
      'Provision Azure Container Apps with Terraform, shared remote state, and reviewed plans',
      'Deploy through GitHub Actions with OIDC and an approval gate; document validation and rollback',
    ],
    connection: 'The portfolio taught me how to accept a message, protect access, store data, and ship reliably. The next step is a service desk API with richer roles, ticket workflows, and a container delivery pipeline.',
    icon: 'pipeline',
    businessProblem: 'Support requests need consistent ownership, controlled access, traceable status changes, and a repeatable delivery process.',
    documentationFocus: 'I’ll record API and data-model decisions, permission boundaries, container and infrastructure troubleshooting, and the evidence from deployment validation.',
    productionQuestions: ['How should ticket permissions, audit retention, and database recovery evolve for a real service desk?', 'How should vulnerability findings, database migrations, and failed deployments be handled before production releases?'],
  },
  {
    id: 'infrastructure-automation',
    title: 'Secure Azure Network & Governance Lab',
    shortTitle: 'Network & Governance',
    status: 'Planned',
    description: 'Build a private Azure environment and prove that its access controls work.',
    summary: 'I plan to build a small, single-subscription network lab with hub-and-spoke connectivity, a private Linux VM, and private access to Storage. The focus is network troubleshooting, Azure RBAC, and Azure Policy, using Terraform and deployment practices from the Service Desk API project.',
    goals: [
      'Create hub-and-spoke virtual networks, peering, subnets, and least-privilege network security groups',
      'Deploy a Linux VM without a public IP and document a controlled administration path',
      'Connect Storage through a private endpoint and private DNS; verify public access is blocked',
      'Assign Azure RBAC roles to test identities and prove both allowed and denied operations',
      'Apply Azure Policy for approved regions, VM sizes, and required tags; test a rejected deployment',
      'Troubleshoot a DNS or network-rule fault with Azure CLI, Linux tools, and Network Watcher',
      'Publish the Terraform, architecture, access-test matrix, cost estimate, and teardown procedure',
    ],
    connection: 'The Service Desk API covers application roles and container delivery. This lab adds the platform layer: private connectivity, resource permissions, policy enforcement, and network troubleshooting.',
    icon: 'infrastructure',
    businessProblem: 'A team needs a repeatable environment where workloads and data are not publicly exposed, access is limited to the right identities, and unapproved resource configurations are prevented.',
    documentationFocus: 'I’ll document packet and DNS paths, permission boundaries, policy decisions, and evidence from successful and blocked access tests. I’ll explain the scope and costs of this lab without presenting it as a full enterprise landing zone.',
    productionQuestions: [
      'How would this design expand to multiple subscriptions, hybrid connectivity, and central network inspection?',
      'How would policy exceptions, privileged access, and shared network ownership be managed across teams?',
    ],
  },
  {
    id: 'monitoring-alerting',
    title: 'Cloud Reliability & Recovery Lab',
    shortTitle: 'Reliability & Recovery',
    status: 'Planned',
    description: 'Prove that a cloud service can be diagnosed, restored, and operated within clear limits.',
    summary: 'I plan to use an isolated test deployment of the Service Desk API with synthetic tickets to measure service health, investigate controlled failures, and restore PostgreSQL data. The deliverable is an evidence-backed operations and recovery exercise that builds on the monitoring already completed in the portfolio.',
    goals: [
      'Set availability, latency, recovery-time, and acceptable-data-loss targets for the test service',
      'Use Application Insights, Log Analytics, and KQL to connect failing requests to their dependencies',
      'Run a bounded load test and measure latency, error rate, scaling behavior, and resource cost',
      'Rehearse two controlled incidents in the test environment, such as a bad application release and a blocked database connection',
      'Restore a PostgreSQL backup into an isolated database and verify synthetic ticket data and application access',
      'Measure actual recovery time and data loss against the targets, including application rollback',
      'Publish dashboards, tested runbooks, incident timelines, a postmortem, and cleanup steps',
    ],
    connection: 'After building the application and securing the platform, demonstrate the operational side: detect a real symptom, find its cause, restore service and data, and explain the measured result.',
    icon: 'monitoring',
    businessProblem: 'An alert alone does not restore a service. A team needs actionable evidence, a repeatable response, and proof that backups and rollback procedures can recover the application within agreed limits.',
    documentationFocus: 'I’ll record the test hypothesis, symptoms, queries, diagnosis, recovery steps, elapsed time, data checks, and follow-up actions. I’ll distinguish measured lab results from untested regional disaster-recovery claims.',
    productionQuestions: [
      'What would regional failover, longer backup retention, and larger data volumes change about cost and recovery time?',
      'How would on-call ownership, escalation, and reliability targets evolve for real users?',
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
    title: 'Azure Static Web Apps: security, deployment & monitoring',
    description: 'My Azure Static Web Apps walkthrough, covering security, deployment, and monitoring.',
    project: 'Project 01 · Azure Portfolio & Contact System',
    media: { type: 'youtube', videoId: 'pgwBtNrTJS4' },
  },
]
