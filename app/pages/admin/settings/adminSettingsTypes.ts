export interface Settings {
  app_name: string;
  default_timezone: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_end_time: string | null;
  maintenance_allow_admin_access: boolean;
  maintenance_show_countdown: boolean;
  registration_enabled: boolean;
  login_enabled: boolean;
  read_only_mode: boolean;
  max_execution_time_seconds: number;
  max_memory_mb: number;
  max_file_size_mb: number;
  max_projects_per_user: number;
  rate_limit_per_minute: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_tls: boolean;
  smtp_ssl: boolean;
  queue_limits: number;
  worker_limits: number;
  retention_days: number;
  feature_flags: Record<string, any>;
  oauth_google_enabled: boolean;
  oauth_google_client_id: string;
  oauth_google_client_secret: string;
  oauth_github_enabled: boolean;
  oauth_github_client_id: string;
  oauth_github_client_secret: string;
}

export const defaultSettings: Settings = {
  app_name: "Hamara Editor",
  default_timezone: "UTC",
  maintenance_mode: false,
  maintenance_message: "System is under maintenance.",
  maintenance_end_time: null,
  maintenance_allow_admin_access: true,
  maintenance_show_countdown: true,
  registration_enabled: true,
  login_enabled: true,
  read_only_mode: false,
  max_execution_time_seconds: 30,
  max_memory_mb: 256,
  max_file_size_mb: 10,
  max_projects_per_user: 20,
  rate_limit_per_minute: 60,
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_pass: "",
  smtp_from_name: "Hamara Editor",
  smtp_from_email: "noreply@example.com",
  smtp_tls: true,
  smtp_ssl: false,
  queue_limits: 1000,
  worker_limits: 10,
  retention_days: 30,
  feature_flags: {},
  oauth_google_enabled: false,
  oauth_google_client_id: "",
  oauth_google_client_secret: "",
  oauth_github_enabled: false,
  oauth_github_client_id: "",
  oauth_github_client_secret: "",
};
