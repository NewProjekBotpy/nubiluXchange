import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Flag, Shield, User, Package, MessageSquare } from "lucide-react";
import { insertUserReportSchema } from "@shared/schema";

// Frontend form schema that matches backend expectations
const reportFormSchema = z.object({
  reportType: z.string().min(1, "Please select a report type"),
  reportedUserId: z.number().int().positive().optional(),
  reportedProductId: z.number().int().positive().optional(),
  reason: z.string().min(1, "Please select a category"),
  description: z.string().min(10, "Please provide at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  evidence: z.string().optional(),
  gameData: z.record(z.any()).optional(),
  // Frontend-specific helper fields
  reportedUsername: z.string().optional(),
  reportedProductTitle: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportFormSchema>;

const reportCategories = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Fraud/Scam' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'harassment', label: 'Harassment/Bullying' },
  { value: 'fake_account', label: 'Fake Account' },
  { value: 'scam', label: 'Gaming Account Scam' },
  { value: 'copyright_violation', label: 'Copyright Violation' },
  { value: 'other', label: 'Other' },
];

const reportTypes = [
  { value: 'user', label: 'Report User', icon: User, description: 'Report a user for violations' },
  { value: 'product', label: 'Report Product', icon: Package, description: 'Report a gaming account or product listing' },
  { value: 'chat', label: 'Report Chat/Message', icon: MessageSquare, description: 'Report inappropriate chat messages' },
  { value: 'other', label: 'Other Issue', icon: AlertCircle, description: 'Report other platform issues' },
];

export default function UserReporting() {
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reportType: "",
      reason: "",
      description: "",
      evidence: "",
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      // Map frontend form data to backend schema
      const reportData = {
        reportType: data.reportType,
        reportedUserId: data.reportedUserId,
        reportedProductId: data.reportedProductId,
        reason: data.reason,
        description: data.description,
        evidence: data.evidence ? [data.evidence] : [],
        gameData: data.gameData || {},
      };
      
      const response = await apiRequest('/api/reports', {
        method: 'POST',
        body: reportData,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted Successfully",
        description: "Thank you for your report. Our moderation team will review it shortly.",
      });
      form.reset();
      setSelectedReportType("");
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit Report",
        description: error?.message || "An error occurred while submitting your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ReportFormData) => {
    submitReportMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl" data-testid="reporting-page">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Flag className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold">Report Issues</h1>
        </div>
        <p className="text-muted-foreground">
          Help keep our gaming marketplace safe by reporting problematic users, accounts, or content.
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          All reports are reviewed by our moderation team. False reports may result in account restrictions.
          For urgent safety issues, please contact support directly.
        </AlertDescription>
      </Alert>

      {/* Report Type Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What would you like to report?</CardTitle>
          <CardDescription>Select the type of issue you want to report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedReportType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedReportType(type.value);
                    form.setValue('reportType', type.value);
                  }}
                  data-testid={`report-type-${type.value}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Report Form */}
      {selectedReportType && (
        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help our moderation team review this issue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                
                {/* Conditional Fields Based on Report Type */}
                {selectedReportType === 'user' && (
                  <>
                    <FormField
                      control={form.control}
                      name="reportedUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username to Report</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter username" 
                              {...field} 
                              data-testid="input-username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reportedUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User ID (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter user ID if known" 
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-user-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {selectedReportType === 'product' && (
                  <>
                    <FormField
                      control={form.control}
                      name="reportedProductId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product ID (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter product ID if known" 
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-product-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reportedProductTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter product title or gaming account details" 
                              {...field} 
                              data-testid="input-product-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Reason Selection */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select issue category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reportCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please describe the issue in detail. Include what happened, when it occurred, and any relevant context..."
                          className="min-h-[120px]"
                          {...field} 
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <div className="text-sm text-muted-foreground">
                        {field.value?.length || 0}/1000 characters
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Evidence */}
                <FormField
                  control={form.control}
                  name="evidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Evidence (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional information, links, or evidence that might help with the investigation..."
                          className="min-h-[80px]"
                          {...field} 
                          data-testid="textarea-evidence"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setSelectedReportType("");
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitReportMutation.isPending}
                    data-testid="button-submit"
                  >
                    {submitReportMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="mt-6 text-sm text-muted-foreground">
        <p className="mb-2">
          <strong>What happens next?</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Our moderation team will review your report within 24-48 hours</li>
          <li>If violations are found, appropriate action will be taken</li>
          <li>You may receive a notification about the outcome of your report</li>
          <li>Repeated false reports may result in restrictions on your reporting ability</li>
        </ul>
      </div>
    </div>
  );
}