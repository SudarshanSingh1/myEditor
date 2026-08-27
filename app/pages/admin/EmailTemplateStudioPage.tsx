/**
 * Email Template Studio
 * =====================
 * Three-panel layout:
 *   Left  : Template Library (list, search, filter)
 *   Center: Editor (name, type, subject, Monaco HTML editor, design config)
 *   Right : Live Preview (iframe, debounced render from API)
 *
 * Uses existing patterns:
 *  - fetchApi() from app/lib/api
 *  - toast from sonner
 *  - PageHeader component
 *  - Enterprise CSS variables
 *  - lucide-react icons
 *  - Monaco Editor (@monaco-editor/react)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PenSquare, Plus, Search, Copy, Trash2, Check, X, Send, Eye, ChevronDown, ChevronUp, RefreshCw, Loader2, LayoutTemplate, Zap } from "lucide-react";
import Editor from "@monaco-editor/react";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { fetchApi } from "../../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateType =
  | "VERIFICATION"
  | "PASSWORD_RESET"
  | "WELCOME"
  | "LOGIN_ALERT"
  | "CUSTOM"
  | "BROADCAST"
  | "SMTP_TEST";

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  template_type: TemplateType;
  description: string | null;
  subject_template: string;
  html_content: string;
  text_content: string | null;
  design_config: Record<string, any> | null;
  variables: string[] | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
}

interface VariableInfo {
  template_type: TemplateType;
  variables: string[];
  variable_names: string[];
  sample_values: Record<string, string>;
}

const TYPE_LABELS: Record<TemplateType, string> = {
  VERIFICATION: "Email Verification",
  PASSWORD_RESET: "Password Reset",
  WELCOME: "Welcome Email",
  LOGIN_ALERT: "Login Alert",
  CUSTOM: "Custom Email",
  BROADCAST: "Broadcast",
  SMTP_TEST: "SMTP Test",
};

const TYPE_COLORS: Record<TemplateType, string> = {
  VERIFICATION: "#22c55e",
  PASSWORD_RESET: "#f59e0b",
  WELCOME: "#8b5cf6",
  LOGIN_ALERT: "#ef4444",
  CUSTOM: "#3b82f6",
  BROADCAST: "#06b6d4",
  SMTP_TEST: "#a1a1aa",
};

const ALL_TYPES: TemplateType[] = [
  "VERIFICATION",
  "PASSWORD_RESET",
  "WELCOME",
  "LOGIN_ALERT",
  "CUSTOM",
  "BROADCAST",
  "SMTP_TEST",
];

const DEFAULT_DESIGN = {
  theme: "dark",
  backgroundColor: "#09090b",
  cardColor: "#18181b",
  textColor: "#ffffff",
  mutedTextColor: "#a1a1aa",
  primaryColor: "#8b5cf6",
  secondaryColor: "#5b21b6",
  borderColor: "#27272a",
  borderRadius: 16,
  logoUrl: "",
  headerStyle: "gradient",
  buttonStyle: "rounded",
  footerEnabled: true,
  footerText: "",
};

const BASE_PATH = "/admin/email-templates-studio";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: TemplateType }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 4,
        background: TYPE_COLORS[type] + "22",
        color: TYPE_COLORS[type],
        border: `1px solid ${TYPE_COLORS[type]}44`,
        whiteSpace: "nowrap",
      }}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      title={active ? "Active" : "Inactive"}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active ? "#22c55e" : "#52525b",
        flexShrink: 0,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function EmailTemplateStudioPage() {
  // --- Library state ---
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<TemplateType | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- Editor state ---
  const [editorMode, setEditorMode] = useState<"edit" | "new">("edit");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("VERIFICATION");
  const [description, setDescription] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [designConfig, setDesignConfig] = useState<Record<string, any>>(DEFAULT_DESIGN);
  const [isActive, setIsActive] = useState(false);
  const [showDesignConfig, setShowDesignConfig] = useState(false);

  // --- Variables state ---
  const [variableInfo, setVariableInfo] = useState<VariableInfo | null>(null);

  // --- Preview state ---
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");

  // --- Test email modal ---
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // --- Activation state ---
  const [activating, setActivating] = useState(false);

  // Debounced values for live preview
  const debouncedHtml = useDebounce(htmlContent, 800);
  const debouncedSubject = useDebounce(subjectTemplate, 800);
  const debouncedConfig = useDebounce(designConfig, 800);

  // ---------------------------------------------------------------------------
  // Fetch templates list
  // ---------------------------------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ limit: "100", skip: "0" });
      if (filterType) params.set("template_type", filterType);
      const res = await fetchApi(`${BASE_PATH}?${params}`);
      if (res.success) {
        setTemplates(res.data.items);
        setTotalTemplates(res.data.total);
      }
    } catch (err) {
      toast.error("Failed to load templates");
    } finally {
      setLoadingList(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ---------------------------------------------------------------------------
  // Fetch variables for current type
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchApi(`${BASE_PATH}/variables/${templateType}`)
      .then((res) => {
        if (res.success) setVariableInfo(res.data);
      })
      .catch(() => {});
  }, [templateType]);

  // ---------------------------------------------------------------------------
  // Live preview rendering
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!debouncedHtml || !debouncedSubject) return;
    setRenderingPreview(true);
    fetchApi(`${BASE_PATH}/render`, {
      method: "POST",
      body: JSON.stringify({
        subject_template: debouncedSubject,
        html_content: debouncedHtml,
        design_config: debouncedConfig,
        variables: null, // use server-side sample values
      }),
    })
      .then((res) => {
        if (res.success) {
          setPreviewHtml(res.data.rendered_html);
          setPreviewSubject(res.data.rendered_subject);
        }
      })
      .catch(() => {})
      .finally(() => setRenderingPreview(false));
  }, [debouncedHtml, debouncedSubject, debouncedConfig]);

  // ---------------------------------------------------------------------------
  // Select a template to edit
  // ---------------------------------------------------------------------------

  const selectTemplate = (tmpl: EmailTemplate) => {
    setSelectedId(tmpl.id);
    setEditorMode("edit");
    setName(tmpl.name);
    setSlug(tmpl.slug);
    setTemplateType(tmpl.template_type);
    setDescription(tmpl.description || "");
    setSubjectTemplate(tmpl.subject_template);
    setHtmlContent(tmpl.html_content);
    setDesignConfig(tmpl.design_config || DEFAULT_DESIGN);
    setIsActive(tmpl.is_active);
    setIsDirty(false);
  };

  const startNew = () => {
    setSelectedId(null);
    setEditorMode("new");
    setName("");
    setSlug("");
    setTemplateType("VERIFICATION");
    setDescription("");
    setSubjectTemplate("");
    setHtmlContent(
      `<div style="font-size: 19px; font-weight: 600; color: #ffffff; margin-bottom: 24px;">\n  Hello {{user_name}},\n</div>\n<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">\n  Welcome to <strong>{{app_name}}</strong>!\n</div>`
    );
    setDesignConfig(DEFAULT_DESIGN);
    setIsActive(false);
    setIsDirty(true);
  };

  // Auto-slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (editorMode === "new") {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
    setIsDirty(true);
  };

  // ---------------------------------------------------------------------------
  // Save (create or update)
  // ---------------------------------------------------------------------------

  const save = async () => {
    if (!name || !subjectTemplate || !htmlContent) {
      toast.error("Name, subject, and HTML content are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        template_type: templateType,
        description: description || null,
        subject_template: subjectTemplate,
        html_content: htmlContent,
        design_config: designConfig,
        is_active: isActive,
        is_default: false,
      };

      let res;
      if (editorMode === "new") {
        res = await fetchApi(BASE_PATH, { method: "POST", body: JSON.stringify(payload) });
      } else {
        res = await fetchApi(`${BASE_PATH}/${selectedId}`, { method: "PUT", body: JSON.stringify(payload) });
      }

      if (res.success) {
        toast.success(editorMode === "new" ? "Template created!" : "Template saved!");
        setIsDirty(false);
        await fetchTemplates();
        if (editorMode === "new" && res.data?.id) {
          setSelectedId(res.data.id);
          setEditorMode("edit");
        }
      } else {
        toast.error(res.detail || "Save failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Activate / Deactivate
  // ---------------------------------------------------------------------------

  const toggleActivate = async () => {
    if (!selectedId) return;
    setActivating(true);
    try {
      const endpoint = isActive
        ? `${BASE_PATH}/${selectedId}/deactivate`
        : `${BASE_PATH}/${selectedId}/activate`;
      const res = await fetchApi(endpoint, { method: "POST" });
      if (res.success) {
        toast.success(isActive ? "Template deactivated" : "Template activated and set as default!");
        setIsActive(!isActive);
        await fetchTemplates();
      } else {
        toast.error(res.detail || "Action failed");
      }
    } catch {
      toast.error("Failed to toggle activation");
    } finally {
      setActivating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Duplicate
  // ---------------------------------------------------------------------------

  const duplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetchApi(`${BASE_PATH}/${id}/duplicate`, { method: "POST" });
      if (res.success) {
        toast.success("Template duplicated");
        await fetchTemplates();
      }
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      const res = await fetchApi(`${BASE_PATH}/${id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("Template deleted");
        if (selectedId === id) {
          setSelectedId(null);
          setEditorMode("new");
        }
        await fetchTemplates();
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ---------------------------------------------------------------------------
  // Send test email
  // ---------------------------------------------------------------------------

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Enter recipient email");
      return;
    }
    if (!selectedId) {
      toast.error("Save template first before sending a test");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetchApi(`${BASE_PATH}/${selectedId}/test`, {
        method: "POST",
        body: JSON.stringify({ recipient_email: testEmail }),
      });
      if (res.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setShowTestModal(false);
        setTestEmail("");
      } else {
        toast.error(res.detail || "Failed to send test email");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  // Insert variable at cursor in Monaco
  const monacoRef = useRef<any>(null);
  const insertVariable = (variable: string) => {
    if (monacoRef.current) {
      const editor = monacoRef.current;
      const selection = editor.getSelection();
      editor.executeEdits("insert-variable", [
        { range: selection, text: variable, forceMoveMarkers: true },
      ]);
      editor.focus();
    } else {
      // fallback: append to end
      setHtmlContent((prev) => prev + variable);
    }
    setIsDirty(true);
  };

  // ---------------------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------------------

  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.template_type.toLowerCase().includes(q)
    );
  });

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0" }}>
        <PageHeader
          title="Email Template Studio"
          subtitle="Design and manage email templates with live preview"
          icon={PenSquare}
          iconColor="#8b5cf6"
          actions={
            <button
              className="e-btn e-btn-primary"
              onClick={startNew}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Plus size={16} />
              New Template
            </button>
          }
        />
      </div>

      {/* Three-panel body */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 0,
          padding: "16px 24px 24px",
          minHeight: 0,
          height: "calc(100vh - 160px)",
        }}
      >
        {/* ====== LEFT PANEL: Template Library ====== */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--e-bg-elevated, #18181b)",
            borderRadius: "var(--e-radius-md, 12px)",
            border: "1px solid var(--e-border, #27272a)",
            marginRight: 12,
            overflow: "hidden",
          }}
        >
          {/* Library header */}
          <div style={{ padding: "14px 14px 8px", borderBottom: "1px solid var(--e-border, #27272a)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              Templates ({totalTemplates})
            </div>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--e-text-faint, #71717a)" }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={{
                  width: "100%",
                  background: "var(--e-bg-base, #09090b)",
                  border: "1px solid var(--e-border, #27272a)",
                  borderRadius: 8,
                  padding: "7px 10px 7px 32px",
                  fontSize: 13,
                  color: "var(--e-text-primary, #fff)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TemplateType | "")}
              style={{
                width: "100%",
                background: "var(--e-bg-base, #09090b)",
                border: "1px solid var(--e-border, #27272a)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 13,
                color: "var(--e-text-primary, #fff)",
                outline: "none",
              }}
            >
              <option value="">All types</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Template list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {loadingList ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <Loader2 size={20} style={{ color: "#8b5cf6", animation: "spin 1s linear infinite" }} />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--e-text-faint, #71717a)", fontSize: 13 }}>
                {searchQuery ? "No matching templates" : "No templates yet"}
              </div>
            ) : (
              filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => selectTemplate(tmpl)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    background: selectedId === tmpl.id ? "rgba(139, 92, 246, 0.12)" : "transparent",
                    borderLeft: selectedId === tmpl.id ? "3px solid #8b5cf6" : "3px solid transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== tmpl.id) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== tmpl.id) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <StatusDot active={tmpl.is_active} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--e-text-primary, #fff)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tmpl.name}
                    </span>
                    {/* Actions on hover */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        title="Duplicate"
                        onClick={(e) => duplicate(tmpl.id, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--e-text-faint, #71717a)", padding: 2, borderRadius: 4 }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#8b5cf6")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--e-text-faint, #71717a)")}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        title="Delete"
                        onClick={(e) => deleteTemplate(tmpl.id, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--e-text-faint, #71717a)", padding: 2, borderRadius: 4 }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#ef4444")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--e-text-faint, #71717a)")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <TypeBadge type={tmpl.template_type} />
                  {tmpl.is_default && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      DEFAULT
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* New template button */}
          <div style={{ padding: 12, borderTop: "1px solid var(--e-border, #27272a)" }}>
            <button
              onClick={startNew}
              style={{
                width: "100%",
                padding: "9px",
                background: "rgba(139, 92, 246, 0.1)",
                border: "1px dashed rgba(139, 92, 246, 0.4)",
                borderRadius: 8,
                color: "#a78bfa",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 92, 246, 0.18)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 92, 246, 0.1)"; }}
            >
              <Plus size={14} /> New Template
            </button>
          </div>
        </div>

        {/* ====== CENTER PANEL: Editor ====== */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--e-bg-elevated, #18181b)",
            borderRadius: "var(--e-radius-md, 12px)",
            border: "1px solid var(--e-border, #27272a)",
            marginRight: 12,
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Editor toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--e-border, #27272a)",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LayoutTemplate size={16} style={{ color: "#8b5cf6" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--e-text-primary, #fff)" }}>
                {editorMode === "new" ? "New Template" : (name || "Editor")}
              </span>
              {isDirty && (
                <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>● Unsaved</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {selectedId && (
                <>
                  <button
                    onClick={() => setShowTestModal(true)}
                    className="e-btn e-btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                  >
                    <Send size={13} /> Test
                  </button>
                  <button
                    onClick={toggleActivate}
                    disabled={activating || isDirty}
                    title={isDirty ? "Save first" : ""}
                    className="e-btn e-btn-secondary"
                    style={{
                      display: "flex", alignItems: "center", gap: 6, fontSize: 13,
                      color: isActive ? "#ef4444" : "#22c55e",
                      borderColor: isActive ? "#ef444444" : "#22c55e44",
                      opacity: isDirty ? 0.5 : 1,
                    }}
                  >
                    {activating ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : (isActive ? <X size={13} /> : <Zap size={13} />)}
                    {isActive ? "Deactivate" : "Activate"}
                  </button>
                </>
              )}
              <button
                onClick={save}
                disabled={saving || !isDirty}
                className="e-btn e-btn-primary"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: !isDirty ? 0.5 : 1 }}
              >
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
                Save
              </button>
            </div>
          </div>

          {/* Editor form */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {/* Row 1: Name + Type */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Template Name</label>
                <input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="E.g. Email Verification"
                  style={{
                    width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)",
                    borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "var(--e-text-primary, #fff)",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ width: 200 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Type</label>
                <select
                  value={templateType}
                  onChange={(e) => { setTemplateType(e.target.value as TemplateType); setIsDirty(true); }}
                  style={{
                    width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)",
                    borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "var(--e-text-primary, #fff)",
                    outline: "none",
                  }}
                >
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
            </div>

            {/* Slug + Description */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 200 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Slug</label>
                <input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setIsDirty(true); }}
                  placeholder="my-template"
                  style={{
                    width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)",
                    borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--e-text-primary, #fff)",
                    outline: "none", boxSizing: "border-box", fontFamily: "monospace",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Description</label>
                <input
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                  placeholder="What is this template used for?"
                  style={{
                    width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)",
                    borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "var(--e-text-primary, #fff)",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Subject Line</label>
              <input
                value={subjectTemplate}
                onChange={(e) => { setSubjectTemplate(e.target.value); setIsDirty(true); }}
                placeholder='E.g. "Verify Your Email - {{app_name}}"'
                style={{
                  width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)",
                  borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "var(--e-text-primary, #fff)",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Variable Picker */}
            {variableInfo && variableInfo.variables.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Insert Variable
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {variableInfo.variables.map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVariable(v)}
                      title={`Insert ${v}`}
                      style={{
                        padding: "4px 10px", background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)",
                        borderRadius: 6, fontSize: 12, color: "#a78bfa", cursor: "pointer", fontFamily: "monospace",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 92, 246, 0.2)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 92, 246, 0.1)")}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Monaco HTML Editor */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--e-text-faint, #71717a)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                HTML Content
              </label>
              <div style={{ border: "1px solid var(--e-border, #27272a)", borderRadius: 8, overflow: "hidden", height: 300 }}>
                <Editor
                  height="300px"
                  language="html"
                  theme="vs-dark"
                  value={htmlContent}
                  onChange={(val) => { setHtmlContent(val || ""); setIsDirty(true); }}
                  onMount={(editor) => { monacoRef.current = editor; }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 12, bottom: 12 },
                    scrollbar: { vertical: "auto", horizontal: "auto" },
                  }}
                />
              </div>
            </div>

            {/* Design Config (collapsible) */}
            <div style={{ border: "1px solid var(--e-border, #27272a)", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
              <button
                onClick={() => setShowDesignConfig((p) => !p)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "var(--e-bg-base, #09090b)", border: "none", cursor: "pointer",
                  color: "var(--e-text-primary, #fff)", fontSize: 13, fontWeight: 600,
                }}
              >
                <span>Design Configuration</span>
                {showDesignConfig ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {showDesignConfig && (
                <div style={{ padding: "12px 14px", background: "rgba(9,9,11,0.5)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    ["backgroundColor", "Background Color"],
                    ["cardColor", "Card Color"],
                    ["textColor", "Text Color"],
                    ["primaryColor", "Primary Color"],
                    ["secondaryColor", "Secondary Color"],
                    ["borderColor", "Border Color"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: "var(--e-text-faint, #71717a)", display: "block", marginBottom: 4 }}>{label}</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="color"
                          value={(designConfig as any)[key] || "#000000"}
                          onChange={(e) => { setDesignConfig((p) => ({ ...p, [key]: e.target.value })); setIsDirty(true); }}
                          style={{ width: 36, height: 28, border: "1px solid var(--e-border)", borderRadius: 4, padding: 2, cursor: "pointer", background: "none" }}
                        />
                        <input
                          type="text"
                          value={(designConfig as any)[key] || ""}
                          onChange={(e) => { setDesignConfig((p) => ({ ...p, [key]: e.target.value })); setIsDirty(true); }}
                          style={{ flex: 1, background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--e-text-primary, #fff)", outline: "none", fontFamily: "monospace" }}
                        />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: "var(--e-text-faint, #71717a)", display: "block", marginBottom: 4 }}>Border Radius (px)</label>
                    <input
                      type="number"
                      value={designConfig.borderRadius || 16}
                      onChange={(e) => { setDesignConfig((p) => ({ ...p, borderRadius: parseInt(e.target.value) })); setIsDirty(true); }}
                      style={{ width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--e-text-primary, #fff)", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--e-text-faint, #71717a)", display: "block", marginBottom: 4 }}>Header Style</label>
                    <select
                      value={designConfig.headerStyle || "gradient"}
                      onChange={(e) => { setDesignConfig((p) => ({ ...p, headerStyle: e.target.value })); setIsDirty(true); }}
                      style={{ width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--e-text-primary, #fff)", outline: "none" }}
                    >
                      <option value="gradient">Gradient</option>
                      <option value="solid">Solid</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 11, color: "var(--e-text-faint, #71717a)", display: "block", marginBottom: 4 }}>Logo URL (optional)</label>
                    <input
                      type="text"
                      value={designConfig.logoUrl || ""}
                      onChange={(e) => { setDesignConfig((p) => ({ ...p, logoUrl: e.target.value })); setIsDirty(true); }}
                      placeholder="https://your-domain.com/logo.png"
                      style={{ width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--e-text-primary, #fff)", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 11, color: "var(--e-text-faint, #71717a)", display: "block", marginBottom: 4 }}>Footer Text (leave blank for auto copyright)</label>
                    <input
                      type="text"
                      value={designConfig.footerText || ""}
                      onChange={(e) => { setDesignConfig((p) => ({ ...p, footerText: e.target.value })); setIsDirty(true); }}
                      placeholder="© 2026 Your Company. All rights reserved."
                      style={{ width: "100%", background: "var(--e-bg-base, #09090b)", border: "1px solid var(--e-border, #27272a)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--e-text-primary, #fff)", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====== RIGHT PANEL: Live Preview ====== */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--e-bg-elevated, #18181b)",
            borderRadius: "var(--e-radius-md, 12px)",
            border: "1px solid var(--e-border, #27272a)",
            overflow: "hidden",
          }}
        >
          {/* Preview toolbar */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--e-border, #27272a)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 0, background: "var(--e-bg-base, #09090b)", borderRadius: 8, padding: 3 }}>
              {(["desktop", "mobile"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPreviewTab(tab)}
                  style={{
                    padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: previewTab === tab ? "#8b5cf6" : "transparent",
                    color: previewTab === tab ? "#fff" : "var(--e-text-faint, #71717a)",
                    transition: "all 0.15s",
                  }}
                >
                  {tab === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {renderingPreview && <Loader2 size={14} style={{ color: "#8b5cf6", animation: "spin 1s linear infinite" }} />}
              <span style={{ fontSize: 11, color: "var(--e-text-faint, #71717a)", fontWeight: 500 }}>Live Preview</span>
            </div>
          </div>

          {/* Subject bar */}
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--e-border, #27272a)", fontSize: 12, color: "var(--e-text-faint, #71717a)" }}>
            <span style={{ fontWeight: 600, marginRight: 6 }}>Subject:</span>
            <span style={{ color: "var(--e-text-primary, #fff)" }}>{previewSubject || "—"}</span>
          </div>

          {/* Preview iframe */}
          <div style={{ flex: 1, overflow: "auto", background: "#09090b", display: "flex", justifyContent: "center", padding: 12 }}>
            {previewHtml ? (
              <div
                style={{
                  width: previewTab === "desktop" ? "100%" : 375,
                  maxWidth: previewTab === "desktop" ? 560 : 375,
                  minHeight: 400,
                  transition: "all 0.3s",
                }}
              >
                <iframe
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  srcDoc={previewHtml}
                  style={{
                    width: "100%",
                    minHeight: 500,
                    border: "none",
                    borderRadius: 8,
                    background: "#09090b",
                  }}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, color: "var(--e-text-faint, #71717a)" }}>
                <Eye size={40} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: 13 }}>
                  {!subjectTemplate && !htmlContent ? "Select or create a template to preview" : "Generating preview…"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== Test Email Modal ====== */}
      {showTestModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTestModal(false); }}
        >
          <div
            style={{
              background: "#18181b", border: "1px solid #27272a", borderRadius: 16,
              padding: 28, width: 420, maxWidth: "90vw",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Send size={18} style={{ color: "#8b5cf6" }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Send Test Email</span>
              </div>
              <button onClick={() => setShowTestModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 8, fontSize: 13, color: "#a1a1aa" }}>
              A test email will be sent with <code style={{ color: "#a78bfa", background: "rgba(139,92,246,0.1)", padding: "2px 6px", borderRadius: 4 }}>[TEST]</code> prefixed to the subject, using sample variable values.
            </div>

            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(9,9,11,0.8)", border: "1px solid #27272a", borderRadius: 8, fontSize: 13, color: "#71717a" }}>
              <span style={{ color: "#a1a1aa" }}>Subject preview: </span>
              <span style={{ color: "#e4e4e7" }}>[TEST] {previewSubject || subjectTemplate}</span>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Recipient Email
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === "Enter" && sendTestEmail()}
              style={{
                width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 8,
                padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none",
                boxSizing: "border-box", marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowTestModal(false)}
                className="e-btn e-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={sendTestEmail}
                disabled={sendingTest || !testEmail}
                className="e-btn e-btn-primary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {sendingTest ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
