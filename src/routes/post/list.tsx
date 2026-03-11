import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/post/list')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="text-gray-500">Hello "/post/list"!</div>
}
