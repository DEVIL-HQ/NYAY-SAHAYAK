
export type AppMode = 'SAHAYAK' | 'EXPERT';
export type UserRole = 'CITIZEN' | 'PROFESSIONAL' | null;

export type Language = 'EN' | 'HI' | 'BN' | 'TE' | 'MR' | 'GU' | 'TA' | 'KN' | 'PA' | 'BH';

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  citations?: Citation[];
  grounding?: GroundingChunk[];
}

export interface Citation {
  section: string;
  act: string;
  summary: string;
}

export interface MockResponse {
  keywords: string[];
  response: string;
  citations: Citation[];
}

export type LawyerSpecialization = 'Criminal' | 'Civil' | 'Family' | 'Property' | 'Corporate' | 'Cyber' | 'Bail Rules' | 'Domestic Violence' | 'Financial Fraud';

export interface FIR {
  id: string;
  date: string;
  status: 'Filed' | 'Investigation' | 'Court' | 'Closed';

  // Incident Details
  incidentDate: string;
  incidentTime: string;
  location: string;
  category: string;
  description: string;
  suspect?: string;

  // Complainant Details
  complainantName: string;
  aadhaar: string;
  mobile: string;
  email: string;

  // Police & Officer
  station: string;
  officer: string;
  officerContact?: {
    phone: string;
    email: string;
  };

  // Meta
  evidenceCount: number;
  timeline: { status: string; date: string; completed: boolean }[];
}

export interface Lawyer {
  id: string;
  name: string;
  specialization: LawyerSpecialization[];
  fee: number;
  wins: number;
  losses: number;
  rating: number;
  feedbackCount: number;
  image: string;
  isVerified: boolean;
  court: string;
  // New Fields
  barCouncilId: string;
  experience: number; // Years
  availability: 'AVAILABLE' | 'BUSY';
  bio?: string;
  email?: string;
  phone?: string;
}

export interface ConnectionRequest {
  id: string;
  userId: string;
  lawyerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: Date;
  message?: string;
}
