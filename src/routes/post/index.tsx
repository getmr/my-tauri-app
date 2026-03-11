import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/post/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="text-gray-500">Hello "/post/"!</div>
}
