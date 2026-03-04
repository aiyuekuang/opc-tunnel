export interface SkillConfig {
  opcId: string;
  opcName: string;
  secretKey: string;
  localPort: number;
  openclawPort: number;
  apiBase: string;
}

export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export interface QrSessionResponse {
  sessionId: string;
  qrUrl: string;
}

export interface QrPollResponse {
  status: 'pending' | 'approved' | 'expired';
  data?: {
    opcId: string;
    opcName: string;
    secretKey: string;
  };
}

export interface SkillStatusResponse {
  online: boolean;
  opcName: string;
  localPort: number;
}
