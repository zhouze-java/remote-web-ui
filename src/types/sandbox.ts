export enum SessionStatus {
  PROVISIONING = 'PROVISIONING',
  READY = 'READY',
  FAILED = 'FAILED',
  DESTROYING = 'DESTROYING',
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum ProvisionStep {
  FETCHING = 'FETCHING',
  EXTRACTING = 'EXTRACTING',
  ROUTING = 'ROUTING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export interface SandboxUser {
  username: string;
  password: string;
  displayName: string;
  roleTitle: string;
  maxSessions: number;
  authorizedHospitalIds: string[];
}

export interface HospitalExpiryRow {
  id: number;
  materialName: string;
  spec: string;
  unitPrice: string;
  alertQty: number;
  amount: string;
  batchNo: string;
  expiryDate: string;
  supplier: string;
  manufacturer: string;
  bucket: '12m' | '6m' | '3m' | '1m' | 'expired';
}

export interface HospitalBusinessSeed {
  inboundAmountWan: number;
  outboundAmountWan: number;
  inventoryAmountWan: number;
  hotline: string;
  warehousePhone: string;
  warehouseAddress: string;
  defaultHisAccount: string;
  expiryCounts: {
    '12m': number;
    '6m': number;
    '3m': number;
    '1m': number;
    expired: number;
  };
  certAlerts: {
    enterprise: number;
    registration: number;
    manufacturer: number;
    authorization: number;
    legalProxy: number;
  };
  stockAlerts: {
    shortage: number;
    safety: number;
    overstock: number;
  };
  rows: HospitalExpiryRow[];
}

export interface HospitalNode {
  id: string;
  code: string;
  name: string;
  systemTitle: string;
  region: string;
  packageName: string;
  packageSizeMb: number;
  mqRoute: string;
  tunnelGateway: string;
  businessSeed: HospitalBusinessSeed;
}

export interface SandboxSession {
  id: string;
  ownerUsername: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  status: SessionStatus;
  provisionStep: ProvisionStep;
  provisionProgress: number;
  errorMessage?: string;
  createdAt: number;
  lastActiveAt: number;
  idleTtlMs: number;
  maxTtlMs: number;
  cookieNamespace: string;
  mqChannelId: string;
  logs: string[];
}

export interface HospitalBusinessState {
  isHospitalLoggedIn: boolean;
  hospitalUsername: string | null;
  activeNav: string;
  period: 'month' | 'lastMonth';
  expiryBucket: '12m' | '6m' | '3m' | '1m' | 'expired';
  searchKeyword: string;
}
