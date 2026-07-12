import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";

export default function About() {
  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8">
      <PageHeader 
        title="About Hamara Editor" 
        description="Version 1.0.0 Release Candidate 1"
      />

      <Card>
        <CardHeader>
          <CardTitle>The Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Hamara Editor is an open-source cloud IDE built for speed, simplicity, and a seamless developer experience.
          </p>
          <p className="text-muted-foreground">
            Our mission is to provide an accessible, high-performance workspace that runs entirely in your browser, backed by robust server-side execution.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li><strong>Frontend:</strong> React, TypeScript, Tailwind CSS, Zustand, Monaco Editor</li>
            <li><strong>Backend:</strong> Python, FastAPI, SQLAlchemy, PostgreSQL, Docker</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
