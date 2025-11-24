import { Plus, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function QuickActions() {
  const [, setLocation] = useLocation();

  const handleQuickSell = () => {
    setLocation("/upload");
  };

  const handleQuickChat = () => {
    setLocation("/chat");
  };

  return (
    <div className="fixed right-4 bottom-24 space-y-3 z-40">
      <Button
        onClick={handleQuickSell}
        className="nxe-quick-action bg-nxe-primary hover:bg-nxe-primary/80 animate-float"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <Button
        onClick={handleQuickChat}
        className="nxe-quick-action bg-nxe-accent hover:bg-nxe-accent/80"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    </div>
  );
}
