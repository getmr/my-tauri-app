import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <h1 className="text-3xl font-bold text-gray-800">About</h1>
      <p className="text-gray-500">This is a Tauri desktop app.</p>
    </div>
  );
}
