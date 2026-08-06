import type { BallState } from "../Types";
export function Ball({ ball }: { ball: BallState }) {
  return <div className={`ball-stack-ball ball-${ball.color} ${ball.falling ? "is-falling" : ""}`} style={{ width: ball.radius * 2, height: ball.radius * 2, transform: `translate3d(${ball.x - ball.radius}px, ${ball.y - ball.radius}px, 0)` }} />;
}
