import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Hamara Editor - Free Online IDE & Compiler" },
    { name: "description", content: "Write, run, and share code in 20+ languages directly in your browser. A lightning fast online IDE built for modern developers." },
  ];
};

export default function Index() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-zinc-950 text-white">
      <h1 className="text-5xl font-extrabold tracking-tight mb-6">
        Code from anywhere.<br/> Compile in milliseconds.
      </h1>
      <p className="text-xl text-zinc-400 max-w-2xl mb-10">
        Hamara Editor is the ultimate cloud IDE. Access a powerful, collaborative development environment right from your browser.
      </p>
      <div className="flex gap-4">
        <a href="/online-python-compiler" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-semibold transition-colors">
          Start Coding Python
        </a>
        <a href="/online-cpp-compiler" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-md font-semibold transition-colors border border-zinc-700">
          C++ Compiler
        </a>
      </div>
    </div>
  );
}
