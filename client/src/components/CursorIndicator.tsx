import { useMemo, memo } from "react";

interface CursorIndicatorProps {
  userId: string;
  position: number;
}

const CursorIndicator = memo(function CursorIndicator({
  userId,
  position,
}: CursorIndicatorProps) {
  // Generate a consistent color based on the user ID
  const color = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = hash % 360;
    return `hsl(${hue}, 80%, 60%)`;
  }, [userId]);

  return (
    <div
      className="cursor-indicator"
      style={{
        left: `${position * 8}px`, // Approximate character width
        backgroundColor: color,
      }}
    >
      <div className="cursor-line" style={{ backgroundColor: color }}></div>
      <div className="cursor-tooltip" style={{ backgroundColor: color }}>
        {userId.substring(0, 6)}
      </div>
    </div>
  );
});

export default CursorIndicator;
