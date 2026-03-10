import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
      <h1 className="text-4xl font-bold text-gray-800">Welcome to Tauri + React</h1>
      <p className="text-gray-500 text-lg">
        Built with Vite · TailwindCSS · TanStack Router · TypeScript
      </p>
    </div>
  );
}
