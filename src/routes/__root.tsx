import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="flex justify-center pt-5 px-4">
        {/* 设置边框 */}
        {/* <div className="p-[1.5px] rounded-full bg-linear-to-r from-pink-500 via-purple-500 to-cyan-400 shadow-lg"> */}
        {/* // 渐变环绕效果 */}
        <div className="nav-gradient-border">
          <nav className="flex gap-1 px-2 py-2 rounded-full bg-gray-900">
            <Link
              to="/"
              className="px-5 py-1.5 rounded-full text-sm font-medium text-gray-400 transition-all hover:text-white hover:bg-gray-700 [&.active]:text-white [&.active]:bg-gray-700"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="px-5 py-1.5 rounded-full text-sm font-medium text-gray-400 transition-all hover:text-white hover:bg-gray-700 [&.active]:text-white [&.active]:bg-gray-700"
            >
              About
            </Link>
            <Link
              to="/collect"
              className="px-5 py-1.5 rounded-full text-sm font-medium text-gray-400 transition-all hover:text-white hover:bg-gray-700 [&.active]:text-white [&.active]:bg-gray-700"
            >
              采集视频
            </Link>
            <Link
              to="/post"
              className="px-5 py-1.5 rounded-full text-sm font-medium text-gray-400 transition-all hover:text-white hover:bg-gray-700 [&.active]:text-white [&.active]:bg-gray-700"
            >
              Post
            </Link>
          </nav>
        </div>
      </div>
      <main className="p-4">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  ),
});
