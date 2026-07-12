import { HelpCircle, Book, MessageSquare, Keyboard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { FeedbackModal } from "../../components/feedback/FeedbackModal";

export default function Help() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8">
      <PageHeader 
        title="Help & Support" 
        description="Find answers to your questions and learn how to use Hamara Editor."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => toast.info("Documentation coming soon")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" /> Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Read comprehensive guides on how to setup projects, configure the editor, and deploy your code.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => toast.info("Keyboard shortcuts guide coming soon")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" /> Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Master the editor with our comprehensive list of keyboard shortcuts for macOS and Windows.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => toast.info("FAQ coming soon")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> FAQ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Browse frequently asked questions about billing, account management, and editor features.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setIsFeedbackOpen(true)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Can't find what you're looking for? Reach out to our support team and we'll help you out.
            </p>
          </CardContent>
        </Card>
      </div>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}
