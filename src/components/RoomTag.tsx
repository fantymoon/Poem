export function RoomTag({ name }: { name: string }) {
  return (
    <h1 className="room-tag paper-surface font-display">
      <span className="room-tag-text">{name}</span>
    </h1>
  )
}