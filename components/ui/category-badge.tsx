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
  className,
}: {
  category: string;
  iconName?: string;
  className?: string;
}) {
  const pascalName = iconName ? kebabToPascal(iconName) : null;
  const Icon =
    pascalName && pascalName in icons
      ? icons[pascalName as keyof typeof icons]
      : null;

  return (
    <Badge variant="secondary" className={cn(className)}>
      {Icon && <Icon data-icon="inline-start" />}
      {category}
    </Badge>
  );
}
