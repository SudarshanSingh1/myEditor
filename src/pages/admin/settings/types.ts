export interface Settings {
  maintenance_mode: boolean;
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
}

export const defaultSettings: Settings = {
  maintenance_mode: false,
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
};
