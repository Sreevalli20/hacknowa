import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { InvestigationResult } from '../types/investigation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.resolve(DATA_DIR, 'tracezero_store.json');

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: string;
  settings: {
    autoSaveReports: boolean;
    defaultInputTab: 'message' | 'url' | 'screenshot' | 'qr' | 'combined';
    theme: 'dark' | 'system';
  };
  createdAt: string;
}

export interface SavedReport {
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

interface DatabaseSchema {
  users: UserAccount[];
  sessions: { token: string; userId: string; createdAt: string }[];
  reports: SavedReport[];
}

function ensureDbExists(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      users: [],
      sessions: [],
      reports: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    const empty: DatabaseSchema = { users: [], sessions: [], reports: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
}

function saveDb(db: DatabaseSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export const dbService = {
  // Authentication & Users
  createUser: (email: string, name: string, plainPassword: string): UserAccount => {
    const db = ensureDbExists();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(plainPassword, salt);
    const newUser: UserAccount = {
      id: `usr_${crypto.randomUUID()}`,
      email: email.trim().toLowerCase(),
      name: name.trim() || 'Security Investigator',
      passwordHash: hash,
      passwordSalt: salt,
      role: 'Security Analyst',
      settings: {
        autoSaveReports: true,
        defaultInputTab: 'message',
        theme: 'dark',
      },
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDb(db);
    return newUser;
  },

  verifyUser: (email: string, plainPassword: string): UserAccount | null => {
    const db = ensureDbExists();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;

    const hash = hashPassword(plainPassword, user.passwordSalt);
    if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash))) {
      return user;
    }
    return null;
  },

  createSession: (userId: string): string => {
    const db = ensureDbExists();
    const token = `tz_sess_${crypto.randomBytes(32).toString('hex')}`;
    db.sessions.push({
      token,
      userId,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    return token;
  },

  getUserBySession: (token: string): UserAccount | null => {
    if (!token) return null;
    const db = ensureDbExists();
    const session = db.sessions.find((s) => s.token === token);
    if (!session) return null;
    const user = db.users.find((u) => u.id === session.userId);
    return user || null;
  },

  removeSession: (token: string) => {
    const db = ensureDbExists();
    db.sessions = db.sessions.filter((s) => s.token !== token);
    saveDb(db);
  },

  updateUserSettings: (userId: string, settings: Partial<UserAccount['settings']>): UserAccount => {
    const db = ensureDbExists();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found.');

    user.settings = { ...user.settings, ...settings };
    saveDb(db);
    return user;
  },

  // Saved Reports
  saveReport: (userId: string, result: InvestigationResult, customTitle?: string, notes?: string, tags: string[] = []): SavedReport => {
    const db = ensureDbExists();
    const derivedTitle = customTitle?.trim() ||
      (result.urlAnalysis?.hostname ? `URL Audit: ${result.urlAnalysis.hostname}` :
       result.summary?.slice(0, 60) || `Investigation ${new Date().toLocaleDateString()}`);

    const report: SavedReport = {
      id: `rep_${crypto.randomUUID()}`,
      userId,
      title: derivedTitle,
      notes: notes?.trim() || '',
      tags: tags.length > 0 ? tags : [result.riskLevel, ...(result.analyzedInputsSummary.hasUrl ? ['URL'] : []), ...(result.analyzedInputsSummary.hasMessage ? ['Message'] : []), ...(result.analyzedInputsSummary.hasQr ? ['QR'] : [])],
      status: 'ACTIVE',
      result,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.reports.unshift(report);
    saveDb(db);
    return report;
  },

  getUserReports: (userId: string): SavedReport[] => {
    const db = ensureDbExists();
    return db.reports.filter((r) => r.userId === userId);
  },

  getReportById: (reportId: string, userId: string): SavedReport | null => {
    const db = ensureDbExists();
    const report = db.reports.find((r) => r.id === reportId && r.userId === userId);
    return report || null;
  },

  updateReport: (reportId: string, userId: string, updates: Partial<Pick<SavedReport, 'title' | 'notes' | 'tags' | 'status'>>): SavedReport => {
    const db = ensureDbExists();
    const report = db.reports.find((r) => r.id === reportId && r.userId === userId);
    if (!report) throw new Error('Report not found or access denied.');

    if (updates.title) report.title = updates.title;
    if (updates.notes !== undefined) report.notes = updates.notes;
    if (updates.tags) report.tags = updates.tags;
    if (updates.status) report.status = updates.status;
    report.updatedAt = new Date().toISOString();

    saveDb(db);
    return report;
  },

  deleteReport: (reportId: string, userId: string) => {
    const db = ensureDbExists();
    db.reports = db.reports.filter((r) => !(r.id === reportId && r.userId === userId));
    saveDb(db);
  },
};
