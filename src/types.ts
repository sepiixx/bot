// ==========================================
// MODULE: CORE TYPES
// PURPOSE: Global type definitions for Bot CMS
// ==========================================

export interface User {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  points: number;
  referralsCount: number;
  referredBy?: string;
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'banned';
}

export type ButtonType = 'content' | 'link' | 'submenu' | 'input' | 'input_form';

export interface BotButton {
  id: string;
  name: string;
  parentId?: string | null;
  requiredPoints: number;
  buttonType: ButtonType;
  content: string; // Dynamic text pages or media descriptions
  status: 'enabled' | 'disabled';
  visibility: 'public' | 'restricted';
  order: number;
  linkUrl?: string;
  mediaType?: 'text' | 'photo' | 'video' | 'document';
  mediaUrl?: string; // Cache or link to media library
  inputPrompt?: string;
  inputTarget?: string;
  formTitle?: string;
  formPrompt?: string;
  formSubmitText?: string;
  formStepsCount?: number; // 1 to 4 steps
  step1Title?: string;
  step1Prompt?: string;
  step2Title?: string;
  step2Prompt?: string;
  step3Title?: string;
  step3Prompt?: string;
  step4Title?: string;
  step4Prompt?: string;
}

export interface ForcedJoinChannel {
  id: string;
  type: 'channel' | 'group';
  title: string;
  chatId: string;
  inviteLink: string;
  addAfterHours?: number | null;
  removeAfterHours?: number | null;
  activateAt?: string | null;
  deactivateAt?: string | null;
  status: 'active' | 'scheduled_add' | 'scheduled_remove' | 'inactive';
  createdAt: string;
}

export interface SupportMessage {
  sender: 'user' | 'admin';
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  status: 'open' | 'resolved' | 'archived';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastLog {
  id: string;
  type: 'text' | 'photo' | 'video' | 'document';
  content: string;
  mediaUrl?: string;
  target: 'all' | 'active' | 'selected';
  successCount: number;
  failureCount: number;
  sentAt: string;
}

export interface SchedulerTask {
  id: string;
  name: string;
  triggerAt: string;
  action: string; // e.g. "add_channel", "remove_channel", "enable_button", "disable_button"
  payload: any;
  status: 'pending' | 'completed' | 'failed';
}

export interface MediaAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  url: string;
  createdAt: string;
}

export interface SystemSettings {
  telegramToken: string;
  pointsPerReferral: number;
  maxReferrals: number;
  referralRewardThreshold: number;
  welcomeMessage: string;
  unauthorizedPointsMessage: string;
  forcedJoinMessage: string;
  dailyRewardEnabled?: boolean;
  dailyRewardPoints?: number;
}

export interface PrivateMessageLog {
  id: string;
  targetType: 'telegramId' | 'username';
  targetValue: string;
  resolvedTelegramId: string;
  type: 'text' | 'photo' | 'video' | 'document';
  content: string;
  mediaUrl?: string;
  status: 'Sent' | 'Not Sent';
  error?: string;
  sentAt: string;
}

export interface DailyClaim {
  id: string;
  telegramId: string;
  username: string;
  pointsClaimed: number;
  claimedAt: string;
}

export interface UserRequest {
  id: string;
  telegramId: string;
  username: string;
  buttonId: string;
  buttonName: string;
  content: string;
  status: 'new' | 'processing' | 'completed';
  createdAt: string;
}

export interface PointSpendLog {
  id: string;
  type: 'POINT_SPEND_SUCCESS' | 'POINT_SPEND_FAILED';
  telegramId: string;
  username: string;
  pointsSpent: number;
  buttonId: string;
  buttonName: string;
  timestamp: string;
  error?: string;
}

export interface InputFormSubmission {
  id: string;
  userId: string;
  username: string;
  buttonId: string;
  buttonName: string;
  formTitle: string;
  submittedText: string; // compatibility
  step1Value?: string;
  step2Value?: string;
  step3Value?: string;
  step4Value?: string;
  fullText?: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
}

