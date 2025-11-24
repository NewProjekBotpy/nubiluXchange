import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Phone, 
  MessageSquare, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Send,
  Users,
  Clock,
  Activity,
  RefreshCw,
  TestTube,
  Bell,
  Zap
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Validation schema
const phoneTestSchema = z.object({
  phoneNumber: z.string().min(10, 'Invalid phone number').max(15, 'Phone number too long'),
  message: z.string().min(5, 'Message too short').max(200, 'Message too long'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

const adminPhoneSchema = z.object({
  phoneNumber: z.string().min(10, 'Invalid phone number').max(15, 'Phone number too long'),
});

type PhoneTestForm = z.infer<typeof phoneTestSchema>;
type AdminPhoneForm = z.infer<typeof adminPhoneSchema>;

interface SMSConfig {
  configured: boolean;
  ready: boolean;
  accountSid?: string;
  fromPhone?: string;
}

interface AdminUser {
  id: number;
  username: string;
  displayName?: string;
  phoneNumber?: string;
  role: string;
  isAdminApproved: boolean;
}

interface SMSLog {
  id: string;
  timestamp: string;
  phoneNumber: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  priority: string;
  alertType?: string;
}

interface PhoneAlertsManagerProps {
  hasAdminAccess?: boolean;
}

export default function PhoneAlertsManager({ hasAdminAccess = false }: PhoneAlertsManagerProps) {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [editAdminDialogOpen, setEditAdminDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  // Forms
  const testForm = useForm<PhoneTestForm>({
    resolver: zodResolver(phoneTestSchema),
    defaultValues: {
      phoneNumber: '',
      message: 'Test message from NXE Marketplace SMS Alert system. If you receive this message, the SMS system is working correctly.',
      priority: 'low'
    }
  });

  const adminForm = useForm<AdminPhoneForm>({
    resolver: zodResolver(adminPhoneSchema),
    defaultValues: {
      phoneNumber: ''
    }
  });

  // Queries
  const { data: smsConfig = { configured: false, ready: false }, isLoading: configLoading } = useQuery<SMSConfig>({
    queryKey: ['/api/admin/sms/config'],
    enabled: hasAdminAccess,
  });

  const { data: adminUsers = [], isLoading: adminsLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/sms/admin-users'],
    enabled: hasAdminAccess,
  });

  const { data: smsLogs = [], isLoading: logsLoading } = useQuery<SMSLog[]>({
    queryKey: ['/api/admin/sms/logs'],
    enabled: hasAdminAccess,
  });

  // Mutations
  const testSmsMutation = useMutation({
    mutationFn: async (data: PhoneTestForm) => {
      return apiRequest('/api/admin/sms/test', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS Test Successful",
        description: "Test message has been sent to the specified number",
      });
      setTestDialogOpen(false);
      testForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sms/logs'] });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Test Failed",
        description: error.message || "Failed to send test message",
        variant: "destructive",
      });
    }
  });

  const updateAdminPhoneMutation = useMutation({
    mutationFn: async ({ userId, phoneNumber }: { userId: number; phoneNumber: string }) => {
      return apiRequest(`/api/admin/sms/admin-users/${userId}/phone`, {
        method: 'PATCH',
        body: { phoneNumber }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin phone number updated successfully",
      });
      setEditAdminDialogOpen(false);
      setSelectedAdmin(null);
      adminForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sms/admin-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed",
        description: error.message || "Failed to update phone number",
        variant: "destructive",
      });
    }
  });

  const triggerTestAlertMutation = useMutation({
    mutationFn: async (alertType: string) => {
      return apiRequest('/api/admin/sms/test-alert', {
        method: 'POST',
        body: { alertType }
      });
    },
    onSuccess: () => {
      toast({
        title: "Test Alert Triggered",
        description: "Test alert successfully triggered and SMS sent to admin",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sms/logs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Trigger Alert",
        description: error.message || "Failed to trigger test alert",
        variant: "destructive",
      });
    }
  });

  const handleEditAdmin = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    adminForm.setValue('phoneNumber', admin.phoneNumber || '');
    setEditAdminDialogOpen(true);
  };

  const onTestSubmit = (data: PhoneTestForm) => {
    testSmsMutation.mutate(data);
  };

  const onAdminSubmit = (data: AdminPhoneForm) => {
    if (selectedAdmin) {
      updateAdminPhoneMutation.mutate({
        userId: selectedAdmin.id,
        phoneNumber: data.phoneNumber
      });
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '-';
    if (phone.startsWith('+62')) {
      return phone.replace('+62', '0');
    }
    return phone;
  };

  return (
    <div className="space-y-6" data-testid="phone-alerts-manager">
      {/* SMS Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            SMS Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-600 rounded animate-pulse w-1/3"></div>
              <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {smsConfig?.configured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    Configuration: {smsConfig?.configured ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <Badge variant={smsConfig?.configured ? 'default' : 'destructive'}>
                  {smsConfig?.ready ? 'Ready' : 'Not Ready'}
                </Badge>
              </div>
              
              {smsConfig?.configured && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Account SID: </span>
                    <span className="font-mono">{smsConfig.accountSid ? `${smsConfig.accountSid.substring(0, 8)}...` : '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">From Phone: </span>
                    <span className="font-mono">{smsConfig.fromPhone || '-'}</span>
                  </div>
                </div>
              )}
              
              {!smsConfig?.configured && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>SMS Alert is not configured yet.</strong> Set environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE to enable SMS features.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="admins" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test SMS
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Test Alerts
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            SMS Logs
          </TabsTrigger>
        </TabsList>

        {/* Admin Phone Numbers */}
        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Phone Numbers</CardTitle>
              <CardDescription>
                Manage admin phone numbers to receive critical SMS alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adminsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-600 rounded animate-pulse w-1/4"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-1/3"></div>
                      </div>
                      <div className="h-8 w-16 bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.displayName || admin.username}</span>
                          <Badge variant={admin.role === 'owner' ? 'default' : 'secondary'}>
                            {admin.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Phone: {formatPhoneNumber(admin.phoneNumber || '')} 
                          {admin.phoneNumber && (
                            <Badge variant="outline" className="ml-2">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Configured
                            </Badge>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAdmin(admin)}
                        data-testid={`button-edit-admin-${admin.id}`}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test SMS */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual SMS Test</CardTitle>
              <CardDescription>
                Send test SMS to a specific phone number to verify configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setTestDialogOpen(true)}
                disabled={!smsConfig?.configured || testSmsMutation.isPending}
                data-testid="button-open-sms-test"
              >
                <Send className="h-4 w-4 mr-2" />
                {testSmsMutation.isPending ? 'Sending...' : 'Send Test SMS'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Security Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Security Alerts</CardTitle>
              <CardDescription>
                Trigger test security alerts to verify SMS notification system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { type: 'suspicious_login', label: 'Suspicious Login', color: 'orange' },
                  { type: 'payment_fraud', label: 'Payment Fraud', color: 'red' },
                  { type: 'unusual_activity', label: 'Unusual Activity', color: 'yellow' },
                  { type: 'blacklist_hit', label: 'Blacklist Hit', color: 'red' },
                ].map((alert) => (
                  <Button
                    key={alert.type}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => triggerTestAlertMutation.mutate(alert.type)}
                    disabled={!smsConfig?.configured || triggerTestAlertMutation.isPending}
                    data-testid={`button-test-${alert.type}`}
                  >
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm text-center">{alert.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SMS Logs</CardTitle>
                <CardDescription>
                  SMS alert delivery history and status
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/sms/logs'] })}
                data-testid="button-refresh-logs"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-600 rounded animate-pulse w-1/4"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : smsLogs.length > 0 ? (
                <div className="space-y-4">
                  {smsLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{formatPhoneNumber(log.phoneNumber)}</span>
                          <Badge variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                            {log.status}
                          </Badge>
                          <Badge variant="outline">
                            {log.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-md">
                          {log.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString('en-US')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No SMS sent yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test SMS Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test SMS</DialogTitle>
            <DialogDescription>
              Enter phone number and message to send test SMS
            </DialogDescription>
          </DialogHeader>
          <Form {...testForm}>
            <form onSubmit={testForm.handleSubmit(onTestSubmit)} className="space-y-4">
              <FormField
                control={testForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="081234567890"
                        {...field}
                        data-testid="input-test-phone"
                      />
                    </FormControl>
                    <FormDescription>
                      Format: 081234567890 or +6281234567890
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={testForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Test SMS message"
                        {...field}
                        data-testid="input-test-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={testForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-test-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTestDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={testSmsMutation.isPending}
                  data-testid="button-send-test-sms"
                >
                  {testSmsMutation.isPending ? 'Sending...' : 'Send SMS'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Phone Dialog */}
      <Dialog open={editAdminDialogOpen} onOpenChange={setEditAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin Phone Number</DialogTitle>
            <DialogDescription>
              Update phone number for {selectedAdmin?.displayName || selectedAdmin?.username}
            </DialogDescription>
          </DialogHeader>
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
              <FormField
                control={adminForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="081234567890"
                        {...field}
                        data-testid="input-admin-phone"
                      />
                    </FormControl>
                    <FormDescription>
                      Format: 081234567890 or +6281234567890. Leave empty to remove.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditAdminDialogOpen(false);
                    setSelectedAdmin(null);
                    adminForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateAdminPhoneMutation.isPending}
                  data-testid="button-save-admin-phone"
                >
                  {updateAdminPhoneMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}