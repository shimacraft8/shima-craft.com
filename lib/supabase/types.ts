/** 会員制サービスのDB型定義（supabase/migrations/20260702000001_member_service.sql と一致させる）。 */

export type UserRole = "admin" | "user";
export type AccountStatus = "active" | "suspended" | "deleted";
export type ContractStatus = "active" | "payment_pending" | "unpaid" | "cancelled";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  account_status: AccountStatus;
  contract_status: ContractStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export const COLORIZE_LOG_EVENT_TYPES = [
  "colorize_started",
  "model_download_started",
  "model_download_completed",
  "colorize_succeeded",
  "colorize_failed",
  "colorize_cancelled",
  "download_clicked",
] as const;
export type ColorizeLogEventType = (typeof COLORIZE_LOG_EVENT_TYPES)[number];

export type ColorizationLog = {
  id: string;
  user_id: string | null;
  event_type: ColorizeLogEventType;
  status: string;
  image_width: number | null;
  image_height: number | null;
  input_file_size: number | null;
  output_width: number | null;
  output_height: number | null;
  processing_mode: "webgpu" | "wasm" | null;
  duration_ms: number | null;
  error_code: string | null;
  browser_name: string | null;
  device_type: "mobile" | "tablet" | "desktop" | "unknown" | null;
  created_at: string;
};

export type AdminAuditLog = {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_user_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  request_id: string;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
};

export const TRIAL_EVENT_TYPES = [
  "trial_started",
  "trial_succeeded",
  "trial_failed",
  "trial_cancelled",
  "trial_download_clicked",
] as const;
export type TrialEventType = (typeof TRIAL_EVENT_TYPES)[number];

/** カラー化ツールを利用できる契約状態。 */
export const CONTRACT_STATUSES_ALLOWED_TO_COLORIZE: readonly ContractStatus[] = [
  "active",
  "payment_pending",
];

export function canUseColorize(profile: Pick<Profile, "account_status" | "contract_status">): boolean {
  return (
    profile.account_status === "active" &&
    CONTRACT_STATUSES_ALLOWED_TO_COLORIZE.includes(profile.contract_status)
  );
}
