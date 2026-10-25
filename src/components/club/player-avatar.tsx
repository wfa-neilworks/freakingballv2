interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
};

export function PlayerAvatar({ name, photoUrl, size = "md", className = "" }: PlayerAvatarProps) {
  const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const sz = sizeClasses[size];

  if (photoUrl) {
    return (
      <div className={`${sz} shrink-0 overflow-hidden rounded-full ${className}`}>
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${sz} shrink-0 flex items-center justify-center rounded-full font-bold ${className}`}>
      {initials}
    </div>
  );
}
