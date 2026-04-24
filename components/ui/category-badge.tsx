import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { icons } from "lucide-react";

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function CategoryBadge({
  category,
  iconName,
  size = "default",
  className,
}: {
  category: string;
  iconName?: string;
  size?: "default" | "xs";
  className?: string;
}) {
  const pascalName = iconName ? kebabToPascal(iconName) : null;
  const Icon =
    pascalName && pascalName in icons
      ? icons[pascalName as keyof typeof icons]
      : null;

  const sizeClasses =
    size === "xs"
      ? "h-5 px-2 py-0 text-xs gap-1 has-data-[icon=inline-start]:pl-1.5 has-data-[icon=inline-end]:pr-1.5 [&>svg]:size-3!"
      : "";

  return (
    <Badge variant="secondary" className={cn(sizeClasses, className)}>
      {Icon && <Icon data-icon="inline-start" />}
      {category}
    </Badge>
  );
}
