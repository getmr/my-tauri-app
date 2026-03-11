import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/post")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex justify-center rounded-lg">
      <div className="p-[1.5px] rounded-full bg-linear-to-r from-pink-500 via-purple-500 to-cyan-400 shadow-lg">
        <div className="flex gap-6 px-2 py-2 rounded-full bg-gray-900 items-center">
          <h1 className="text-4xl font-bold text-gray-800">Post Layout</h1>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
