import { useNavigate } from "react-router-dom";
import { UserX } from "lucide-react";

export default function Deleted() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-4">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <UserX className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-white">Account Deleted</h1>
        <p className="mb-8 text-zinc-400">
          This Hamara Editor account no longer exists.
        </p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
