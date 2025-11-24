import { Shield, Crown, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { hasAdminAccess, hasOwnerAccess } from '@shared/auth-utils';

export default function AdminQuickAccess() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Only show for admin or owner roles
  if (!hasAdminAccess(user)) {
    return null;
  }

  const accessItems = [
    ...(hasAdminAccess(user) ? [{
      id: 'admin',
      title: 'Admin Panel',
      description: 'Kelola pengguna dan moderasi',
      icon: Shield,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      action: () => setLocation('/admin')
    }] : []),
    ...(hasOwnerAccess(user) ? [{
      id: 'owner',
      title: 'Owner Dashboard',
      description: 'Analytics & kontrol sistem',
      icon: Crown,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      action: () => setLocation('/owner')
    }] : [])
  ];

  if (accessItems.length === 0) return null;

  return (
    <section className="px-4 py-2">
      <div className="bg-nxe-surface/40 rounded-xl border border-nxe-surface/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Akses Cepat</h3>
          <div className="w-2 h-2 bg-nxe-primary rounded-full animate-pulse"></div>
        </div>
        
        <div className="space-y-3">
          {accessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full ${item.bgColor} ${item.borderColor} border rounded-lg p-3 transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99] group`}
                data-testid={`quick-access-${item.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 p-2.5 bg-nxe-surface/50 rounded-lg group-hover:bg-nxe-surface/70 transition-colors">
                      <Icon className={`h-4 w-4 ${item.iconColor}`} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-white font-medium text-sm leading-tight">{item.title}</p>
                      <p className="text-gray-400 text-xs leading-tight mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}