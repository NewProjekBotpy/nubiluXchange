import type { User, AdminStats } from "../types";
import { EXPORT_HEADERS } from "../config/adminPanelConfig";

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(data: any[], headers: string[], filename: string) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => Object.values(row).map(val => 
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(','))
  ].join('\n');
  
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

export function exportToJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalRecords: data.length,
    data
  }, null, 2);
  
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

export function exportUsersToCSV(users: User[]) {
  const exportData = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || '',
    role: user.role,
    isVerified: user.isVerified ? 'Yes' : 'No',
    isAdminApproved: user.isAdminApproved ? 'Yes' : 'No',
    adminRequestPending: user.adminRequestPending ? 'Yes' : 'No',
    adminRequestReason: user.adminRequestReason || '',
    walletBalance: user.walletBalance,
    createdAt: user.createdAt
  }));
  
  const timestamp = new Date().toISOString().split('T')[0];
  exportToCSV(exportData, [...EXPORT_HEADERS.users], `users_export_${timestamp}`);
}

export function exportUsersToJSON(users: User[]) {
  const exportData = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || '',
    role: user.role,
    isVerified: user.isVerified,
    isAdminApproved: user.isAdminApproved,
    adminRequestPending: user.adminRequestPending,
    adminRequestReason: user.adminRequestReason || '',
    walletBalance: user.walletBalance,
    createdAt: user.createdAt
  }));
  
  const timestamp = new Date().toISOString().split('T')[0];
  exportToJSON(exportData, `users_export_${timestamp}`);
}

export function exportStatsToCSV(stats: AdminStats) {
  const exportData = [{
    totalUsers: stats.totalUsers,
    totalAdmins: stats.totalAdmins,
    totalOwners: stats.totalOwners,
    pendingAdminRequests: stats.pendingAdminRequests,
    totalProducts: stats.totalProducts,
    activeProducts: stats.activeProducts,
    pendingEscrows: stats.pendingEscrows,
    activeEscrows: stats.activeEscrows,
    completedEscrows: stats.completedEscrows
  }];
  
  const timestamp = new Date().toISOString().split('T')[0];
  exportToCSV(exportData, [...EXPORT_HEADERS.stats], `admin_stats_${timestamp}`);
}

export function exportStatsToJSON(stats: AdminStats) {
  const timestamp = new Date().toISOString().split('T')[0];
  exportToJSON([stats], `admin_stats_${timestamp}`);
}
