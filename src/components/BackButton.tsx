import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  onClick: () => void;
  text?: string;
  className?: string;
}

export const BackButton = ({ 
  onClick, 
  text = "Back", 
  className = "" 
}: BackButtonProps) => {
  return (
    <Button 
      variant="outline" 
      onClick={onClick}
      className={`mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {text}
    </Button>
  );
};