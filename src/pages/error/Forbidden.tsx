import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";

export default function Forbidden() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-12 w-12" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">403</h1>
      <h2 className="text-2xl font-semibold mb-6">Access Denied</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        You do not have permission to access this page. Please contact your administrator if you believe this is a mistake.
      </p>
      <Button asChild size="lg">
        <Link to="/">Return to Home</Link>
      </Button>
    </div>
  );
}
