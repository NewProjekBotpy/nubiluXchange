import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User as UserIcon, 
  Mail, 
  Wallet, 
  Calendar, 
  Shield, 
  CheckCircle, 
  XCircle,
  Clock,
  Activity,
  CreditCard
} from "lucide-react";
import type { User } from "../types";

interface UserDetailDialogProps {
  user: User | null;
  onClose: () => void;
  onAction?: (type: 'promote' | 'revoke' | 'verify' | 'delete', user: User) => void;
}

export function UserDetailDialog({ user, onClose, onAction }: UserDetailDialogProps) {
  if (!user) return null;

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseInt(amount || '0') || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      admin: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      user: 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    };
    return colors[role as keyof typeof colors] || colors.user;
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="bg-nxe-surface border-nxe-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profilePicture} alt={user.username} />
              <AvatarFallback className="bg-nxe-primary text-white text-2xl">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white">{user.username}</h3>
              {user.displayName && (
                <p className="text-gray-400">{user.displayName}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRoleBadge(user.role)}>
                  {user.role.toUpperCase()}
                </Badge>
                {user.isVerified ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Verified
                  </Badge>
                )}
                {user.twoFactorEnabled && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    <Shield className="h-3 w-3 mr-1" />
                    2FA
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-nxe-border" />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-400 uppercase">Contact Information</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 bg-nxe-card rounded-lg">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-nxe-card rounded-lg">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Username</p>
                  <p className="text-white">{user.username}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-400 uppercase">Account Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-nxe-card rounded-lg">
                <Wallet className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">Wallet Balance</p>
                  <p className="text-white font-semibold">{formatCurrency(user.walletBalance)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-nxe-card rounded-lg">
                <Calendar className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">Joined</p>
                  <p className="text-white">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Request Info */}
          {user.adminRequestPending && (
            <>
              <Separator className="bg-nxe-border" />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-400 uppercase">Admin Request</h4>
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-400 font-medium">Pending Admin Request</span>
                  </div>
                  {user.adminRequestReason && (
                    <p className="text-gray-300 text-sm mt-2">
                      <span className="text-gray-400">Reason:</span> {user.adminRequestReason}
                    </p>
                  )}
                  {user.adminRequestAt && (
                    <p className="text-gray-400 text-xs mt-1">
                      Requested: {formatDate(user.adminRequestAt)}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <Separator className="bg-nxe-border" />
          <div className="flex flex-wrap gap-2">
            {onAction && (
              <>
                {!user.isVerified && (
                  <Button
                    onClick={() => onAction('verify', user)}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-verify-user"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify User
                  </Button>
                )}
                {user.role !== 'admin' && user.role !== 'owner' && (
                  <Button
                    onClick={() => onAction('promote', user)}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-promote-user"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Promote to Admin
                  </Button>
                )}
                {user.role === 'admin' && (
                  <Button
                    onClick={() => onAction('revoke', user)}
                    variant="destructive"
                    data-testid="button-revoke-user"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Revoke Admin
                  </Button>
                )}
                <Button
                  onClick={() => onAction('delete', user)}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-delete-user"
                >
                  Delete User
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
