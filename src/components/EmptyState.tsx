import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = ""
}: EmptyStateProps) => {
  return (
    <Card className={`text-center py-12 ${className}`}>
      <CardContent className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
        </div>
        {actionText && onAction && (
          <Button onClick={onAction} className="mt-4">
            {actionText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};