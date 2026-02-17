export interface MockJob {
  id: string;
  agentName: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  lastRun: string;
  successRate: number;
}

export interface MockTrace {
  id: string;
  jobId: string;
  timestamp: string;
  eventCount: number;
  hasErrors: boolean;
}

export const MOCK_JOBS: MockJob[] = [
  {
    id: 'job-1',
    agentName: 'Customer Support Bot',
    status: 'running',
    lastRun: '2 mins ago',
    successRate: 98,
  },
  {
    id: 'job-2',
    agentName: 'Outreach Manager',
    status: 'completed',
    lastRun: '1 hour ago',
    successRate: 85,
  },
  {
    id: 'job-3',
    agentName: 'Research Assistant',
    status: 'failed',
    lastRun: '10 mins ago',
    successRate: 45,
  },
];

export const MOCK_STATS = {
  totalTraces: 12450,
  activeAgents: 12,
  avgSuccessRate: 92,
  repairsGenerated: 450,
};
