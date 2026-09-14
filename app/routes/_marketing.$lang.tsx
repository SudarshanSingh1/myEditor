/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import type { LoaderFunctionArgs, MetaFunction } from "react-router-dom";

import { useLoaderData, useNavigate } from "react-router-dom";

import { useEffect, useState, useRef } from "react";

import { useEditorStore } from "../stores/useEditorStore";

import { useExecutionStore } from "../stores/useExecutionStore";

import { useUserStore } from "../stores/useUserStore";

import { EditorPane } from "../components/workspace/EditorPane";

import { StatusBar } from "../components/workspace/StatusBar";

import { TerminalPanel } from "../components/workspace/panels/TerminalPanel";

import { PanelErrorBoundary } from "../components/error/ErrorBoundary";

import { cn } from "../lib/utils";

import { Zap, Play, Terminal, Columns, ChevronDown } from "lucide-react";

import { GuestConversionModal } from "../components/auth/GuestConversionModal";

import { Dropdown, DropdownItem } from "../components/ui/Dropdown";

const COMPILER_ROUTES = [
  { path: '/online-c-compiler', label: 'C Compiler' },
  { path: '/online-cpp-compiler', label: 'C++ Compiler' },
  { path: '/online-python-compiler', label: 'Python Compiler' },
  { path: '/online-java-compiler', label: 'Java Compiler' },
  { path: '/online-javascript-editor', label: 'JavaScript Editor' },
  { path: '/online-typescript-playground', label: 'TypeScript Playground' },
  { path: '/online-go-compiler', label: 'Go Compiler' },
  { path: '/online-rust-compiler', label: 'Rust Compiler' },
  { path: '/online-php-compiler', label: 'PHP Compiler' },
  { path: '/online-kotlin-compiler', label: 'Kotlin Compiler' },
  { path: '/online-swift-compiler', label: 'Swift Compiler' }
];

const BOILERPLATES: Record<string, string> = {
  python: `print("Hello from Hamara Editor!")\nprint("Start coding your Python script here.")\n`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello from Hamara Editor!" << std::endl;\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello from Hamara Editor!\\n");\n    return 0;\n}\n`,
  javascript: `console.log("Hello from Hamara Editor!");\n`,
  typescript: `const greeting: string = "Hello from Hamara Editor!";\nconsole.log(greeting);\n`,
  rust: `fn main() {\n    println!("Hello from Hamara Editor!");\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Hamara Editor!")\n}\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Hamara Editor!");\n    }\n}\n`,
  php: `<?php\n\necho "Hello from Hamara Editor!";\n?>\n`,
  kotlin: `fun main() {\n    println("Hello from Hamara Editor!")\n}\n`,
  swift: `print("Hello from Hamara Editor!")\n`,
};

const FILE_EXTS: Record<string, string> = {
  python: "py",
  cpp: "cpp",
  c: "c",
  javascript: "js",
  typescript: "ts",
  rust: "rs",
  go: "go",
  java: "java",
  php: "php",
  kotlin: "kt",
  swift: "swift",
};

async function getLanguageSEOData(slug: string) {
  const langs: Record<string, any> = {
    "cpp": { title: "Online C++ Compiler", desc: "Run C++ online instantly.", langName: "C++", languageId: "cpp" },
    "python": { title: "Online Python Compiler", desc: "Run Python online instantly.", langName: "Python", languageId: "python" },
    "javascript": { title: "Online JavaScript Editor", desc: "Run JS online instantly.", langName: "JavaScript", languageId: "javascript" },
    "typescript": { title: "Online TypeScript Playground", desc: "Run TS online instantly.", langName: "TypeScript", languageId: "typescript" },
    "rust": { title: "Online Rust Compiler", desc: "Run Rust online instantly.", langName: "Rust", languageId: "rust" },
    "go": { title: "Online Go Compiler", desc: "Run Go online instantly.", langName: "Go", languageId: "go" },
    "c": { title: "Online C Compiler", desc: "Run C online instantly.", langName: "C", languageId: "c" },
    "java": { title: "Online Java Compiler", desc: "Run Java online instantly.", langName: "Java", languageId: "java" },
    "php": { title: "Online PHP Compiler", desc: "Run PHP online instantly.", langName: "PHP", languageId: "php" },
    "kotlin": { title: "Online Kotlin Compiler", desc: "Run Kotlin online instantly.", langName: "Kotlin", languageId: "kotlin" },
    "swift": { title: "Online Swift Compiler", desc: "Run Swift online instantly.", langName: "Swift", languageId: "swift" },
    "cloud-ide": { title: "Cloud IDE", desc: "Code in the cloud.", langName: "JavaScript", languageId: "javascript" },
    "browser-ide": { title: "Browser IDE", desc: "Code in the browser.", langName: "JavaScript", languageId: "javascript" },
    "online-code-editor": { title: "Online Code Editor", desc: "Code online.", langName: "JavaScript", languageId: "javascript" },
  };
  
  if (langs[slug]) return langs[slug];

  const langMatch = slug.match(/online-(.*?)-(compiler|editor|playground)/);
  const key = langMatch ? langMatch[1] : "cpp";
  
  return langs[key] || langs["cpp"];
}

// oxlint-disable-next-line react/only-export-components
// eslint-disable-next-line react-refresh/only-export-components
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\//, '');
  const slug = path || "online-cpp-compiler";
  const seoData = await getLanguageSEOData(slug);
  return { seoData, slug };
};

// oxlint-disable-next-line react/only-export-components
// eslint-disable-next-line react-refresh/only-export-components
export const meta: MetaFunction<typeof loader> = ({ data }: any) => {
  if (!data) return [{ title: "Online Compiler" }];
  return [
    { title: `${data.seoData.title} - Hamara Editor` },
    { name: "description", content: data.seoData.desc },
  ];
};

export default function LanguageCompiler() {
  const { seoData, slug } = useLoaderData<typeof loader>();
  const _navigate = useNavigate();
  
  const [layout, setLayout] = useState<'stacked' | 'split'>('stacked');
  const [sidebarWidth, setSidebarWidthState] = useState(320); // default w-80 is 320px
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('marketingSidebarWidth');
    if (saved) setSidebarWidthState(parseInt(saved, 10));
  }, []);

  const setSidebarWidth = (width: number) => {
    setSidebarWidthState(width);
    localStorage.setItem('marketingSidebarWidth', width.toString());
  };
  
  const initGuest = useUserStore(s => s.initGuest);
  const guestQuota = useUserStore(s => s.guestQuota);
  const isAuthenticated = useUserStore(s => s.isAuthenticated);
  
  const setProjectLanguage = useEditorStore(s => s.setProjectLanguage);
  const setFileContent = useEditorStore((state) => state.setFileContent);
  const openTab = useEditorStore((state) => state.openTab);
  const setActiveFile = useEditorStore(s => s.setActiveFile);
  const localContents = useEditorStore(s => s.localContents);
  
  const runCode = useExecutionStore(s => s.runCode);
  const isRunning = useExecutionStore(s => s.isRunning);

  const [isReady, setIsReady] = useState(false);
  const [_activePanelTab, setActivePanelTab] = useState<'TERMINAL' | 'OUTPUT'>('TERMINAL');
  const fileIdRef = useRef<string>(`guest-${seoData.languageId}-file`);
  const projectId = `guest-${seoData.languageId}-project`;

  // Initialize Guest Quota
  useEffect(() => {
    if (!isAuthenticated) {
      initGuest();
    }
  }, [isAuthenticated, initGuest]);

  // Setup the local file
  useEffect(() => {
    const fileId = fileIdRef.current;
    setProjectLanguage(seoData.languageId);
    
    // Only inject boilerplate if it doesn't exist locally
    if (localContents[fileId] === undefined) {
      const ext = FILE_EXTS[seoData.languageId] || "txt";
      const content = BOILERPLATES[seoData.languageId] || "";
      openTab({
        id: fileId,
        name: `main.${ext}`,
        path: `/main.${ext}`,
        language: seoData.languageId
      });
      setFileContent(fileId, content, false);
    }
    
    setActiveFile(fileId);
    setIsReady(true);
  }, [seoData.languageId]);

  useEffect(() => {
    if (!isSidebarDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      // Calculate width based on pointer X position. Constrain it between 200px and 600px.
      const newWidth = Math.max(200, Math.min(e.clientX, 600));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsSidebarDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSidebarDragging]);
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <header className="h-14 border-b border-border bg-[#1e1e1e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
             <img src="/images/hamara-editor-icon.svg" alt="Hamara Editor" className="w-8 h-8 rounded-lg" />
             <span className="font-semibold text-lg hidden sm:block text-white">Hamara Editor</span>
          </div>
          <div className="h-6 w-px border-l border-white/20 mx-2"></div>
          <Dropdown
            align="left"
            trigger={
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded-md transition-colors group hidden md:flex">
                <h1 className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{seoData.title}</h1>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            }
          >
            <div className="max-h-96 overflow-y-auto py-1">
              {COMPILER_ROUTES.map((route) => (
                <DropdownItem 
                  key={route.path} 
                  onClick={() => window.location.href = route.path}
                  className={slug === route.path.replace(/^\//, '') ? "bg-primary/20 text-primary hover:bg-primary/30" : ""}
                >
                  {route.label}
                </DropdownItem>
              ))}
            </div>
          </Dropdown>
        </div>
        
        <div className="flex items-center space-x-4">
          {!isAuthenticated && guestQuota && (
            <div className="hidden md:flex items-center space-x-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-amber-500/20 transition-colors" title="Guest execution limit">
              <Zap className="w-3 h-3" />
              <span>{guestQuota.executions_used} / {guestQuota.executions_max} Free Runs Used</span>
            </div>
          )}
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            Sign Up Free
          </button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Marketing Info Sidebar */}
        <div 
          style={{ width: sidebarWidth, display: sidebarWidth === 0 ? 'none' : undefined }}
          className={cn(
             "bg-muted/30 border-r border-border hidden lg:flex flex-col overflow-y-auto shrink-0",
             isSidebarDragging && "select-none"
          )}
        >
           <div className="p-6">
             <h2 className="text-2xl font-bold mb-3">{seoData.title}</h2>
             <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
               {seoData.desc} Write, compile, and run {seoData.langName} code directly in your browser without installing anything.
             </p>
             <div className="space-y-4">
               <div className="bg-[#1e1e1e] border border-border rounded-lg p-4 shadow-sm text-gray-100">
                 <h3 className="font-semibold text-sm mb-2 flex items-center text-white"><Zap className="w-4 h-4 text-amber-500 mr-2"/> Lightning Fast</h3>
                 <p className="text-xs text-gray-400">Executes instantly in a secure container environment.</p>
               </div>
               <div className="bg-[#1e1e1e] border border-border rounded-lg p-4 shadow-sm text-gray-100">
                 <h3 className="font-semibold text-sm mb-2 flex items-center text-white"><Terminal className="w-4 h-4 text-blue-500 mr-2"/> Full Terminal</h3>
                 <p className="text-xs text-gray-400">Interactive terminal support for standard input and output streams.</p>
               </div>
             </div>
           </div>
        </div>

        {/* Resizer Divider */}
        <div 
          className={cn(
            "hidden lg:block w-1 z-10 cursor-col-resize hover:bg-primary/50 transition-colors flex-shrink-0",
            isSidebarDragging ? "bg-primary" : "bg-gray-200 dark:bg-[#2d2d2d]"
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsSidebarDragging(true);
          }}
          onDoubleClick={() => {
            setSidebarWidth(sidebarWidth === 320 ? 0 : 320);
          }}
        />

        {/* Editor Area */}
        <div className="flex-1 h-full flex flex-col relative bg-background min-w-0">
          <div className="h-10 bg-[#1e1e1e] border-b border-border flex items-center pr-4 justify-between shrink-0">
            <div className="flex items-center h-full">
               <div className="flex items-center space-x-2 h-full px-4 bg-[#1e1e1e] border-t-2 border-t-primary text-gray-300 text-sm cursor-default select-none border-r border-border">
                  <span className="italic">main.{FILE_EXTS[seoData.languageId] || "txt"}</span>
               </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLayout(l => l === 'stacked' ? 'split' : 'stacked')}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                title="Toggle Layout"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated && guestQuota && guestQuota.executions_used >= guestQuota.executions_max) {
                    window.location.href = '/login';
                    return;
                  }
                  setActivePanelTab('TERMINAL');
                  runCode(projectId, fileIdRef.current, seoData.languageId);
                }}
                disabled={isRunning || !isReady}
                className={cn(
                  "flex items-center space-x-1.5 px-3 py-1 text-sm font-medium rounded transition-colors",
                  isRunning 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "bg-[#2ea043] hover:bg-[#2c974b] text-white shadow-sm"
                )}
              >
                <Play className="w-4 h-4" />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
              </button>
            </div>
          </div>

          <div className={cn("flex-1 min-h-0 flex", layout === 'stacked' ? "flex-col" : "flex-row")}>
            <div className="flex-1 overflow-hidden relative">
              {isReady && <EditorPane fileId={fileIdRef.current} />}
            </div>

            {/* Terminal / Output Split */}
            <div className={cn(
              "flex flex-col bg-[#1e1e1e] shrink-0",
              layout === 'stacked' ? "h-1/3 min-h-[250px] border-t border-border" : "w-1/2 min-w-[300px] border-l border-border"
            )}>
              <div className="flex items-center px-4 border-b border-border h-9">
                <button className="flex items-center space-x-2 text-sm text-gray-200 border-b border-primary h-full px-2">
                  <Terminal className="w-4 h-4" />
                  <span>Terminal Output</span>
                </button>
              </div>
              <div className="flex-1 relative overflow-hidden">
                <PanelErrorBoundary panelName="Terminal">
                  <TerminalPanel projectId={projectId} />
                </PanelErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </main>
      <StatusBar />
      <GuestConversionModal />
    </div>
  );
}
