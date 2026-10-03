import { InvestigationResult } from './investigation';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  settings: {
    autoSaveReports: boolean;
    defaultInputTab: 'message' | 'url' | 'screenshot' | 'qr' | 'combined';
    theme: 'dark' | 'system';
  };
  createdAt: string;
}

export interface SavedReportItem {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  tags: string[];
  status: 'ACTIVE' | 'ARCHIVED' | 'CONTAINED';
  result: InvestigationResult;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}
