import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  X,
  UserPlus,
  Package,
  MessageSquare,
  FileText,
  Bell,
  Settings,
  Zap
} from "lucide-react";
import { TouchButton } from "./TouchButton";

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  position?: "bottom-right" | "bottom-left" | "bottom-center";
}

export default function FloatingActionButton({ 
  actions = [],
  position = "bottom-right" 
}: FloatingActionButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const defaultActions: FABAction[] = [
    {
      id: "add-user",
      label: "Add User",
      icon: UserPlus,
      color: "bg-blue-500",
      onClick: () => {
        toast({
          title: "Add User",
          description: "User creation feature coming soon",
        });
        setIsOpen(false);
      }
    },
    {
      id: "add-product",
      label: "Add Product",
      icon: Package,
      color: "bg-green-500",
      onClick: () => {
        toast({
          title: "Add Product",
          description: "Product creation feature coming soon",
        });
        setIsOpen(false);
      }
    },
    {
      id: "send-message",
      label: "Send Message",
      icon: MessageSquare,
      color: "bg-purple-500",
      onClick: () => {
        toast({
          title: "Send Message",
          description: "Messaging feature coming soon",
        });
        setIsOpen(false);
      }
    },
    {
      id: "create-report",
      label: "Create Report",
      icon: FileText,
      color: "bg-orange-500",
      onClick: () => {
        toast({
          title: "Create Report",
          description: "Report creation feature coming soon",
        });
        setIsOpen(false);
      }
    },
    {
      id: "send-notification",
      label: "Send Notification",
      icon: Bell,
      color: "bg-red-500",
      onClick: () => {
        toast({
          title: "Send Notification",
          description: "Notification feature coming soon",
        });
        setIsOpen(false);
      }
    }
  ];

  const finalActions = actions.length > 0 ? actions : defaultActions;

  const positionClasses = {
    "bottom-right": "bottom-24 right-4 md:bottom-6 md:right-6",
    "bottom-left": "bottom-24 left-4 md:bottom-6 md:left-6",
    "bottom-center": "bottom-24 left-1/2 -translate-x-1/2 md:bottom-6"
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in-0 duration-200"
          onClick={() => setIsOpen(false)}
          data-testid="fab-backdrop"
        />
      )}

      {/* FAB Container */}
      <div className={cn("fixed z-[60] md:hidden", positionClasses[position])}>
        {/* Action Buttons */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 animate-in slide-in-from-bottom-5 duration-300">
            {finalActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 animate-in slide-in-from-right-5 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Label */}
                  <div className="bg-nxe-card/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-nxe-border">
                    <span className="text-white text-sm font-medium whitespace-nowrap">
                      {action.label}
                    </span>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={action.onClick}
                    className={cn(
                      "w-12 h-12 rounded-full shadow-xl flex items-center justify-center",
                      "transform transition-all duration-300 ease-out",
                      "hover:scale-110 active:scale-95",
                      action.color,
                      "text-white"
                    )}
                    data-testid={`fab-action-${action.id}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center",
            "transform transition-all duration-300 ease-out",
            "hover:scale-110 active:scale-95",
            isOpen 
              ? "bg-red-500 rotate-45 scale-110" 
              : "bg-gradient-to-br from-nxe-primary to-purple-600 hover:shadow-nxe-primary/50"
          )}
          data-testid="fab-main"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Plus className="h-6 w-6 text-white" />
          )}
          
          {/* Pulse animation when closed */}
          {!isOpen && (
            <>
              <div className="absolute inset-0 rounded-full bg-nxe-primary/30 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-nxe-primary to-purple-600 blur-md opacity-50" />
            </>
          )}
        </button>

        {/* Quick action indicator */}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-nxe-background animate-pulse" />
        )}
      </div>
    </>
  );
}
