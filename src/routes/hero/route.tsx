import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@heroui/react';


export const Route = createFileRoute('/hero')({
  component: RouteComponent,
})

function RouteComponent() {
  const handleClick = () => {
    console.log('Button clicked')
    // 可改为 alert('已点击') 或其它逻辑
  }
  return (
    <div>
      <Button className="bg-green-700 hover:bg-red-600" variant="outline" onPress={handleClick}>Click me</Button>
    </div>
)
}
