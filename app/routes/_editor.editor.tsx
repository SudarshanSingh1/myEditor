import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Workspace - Hamara Editor" },
  ];
};

export default function Editor() {
  return (
    <div className="h-screen w-full bg-zinc-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Authenticated Workspace</h1>
      <p className="text-zinc-500">
        This is the main editor interface for logged in users or direct /editor routes.
      </p>
    </div>
  );
}
