import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  Lock, 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Play,
  Eye,
  EyeOff,
  Save,
  X,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Code
} from "lucide-react";
import { TouchButton, MobileBottomNav } from "@/components/admin";
import { AdminPanelProvider } from "@/features/admin";

interface AdminRule {
  id: number;
  name: string;
  ruleType: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  isActive: boolean;
  createdBy: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  params: Record<string, any>;
}

const RULE_TYPES = [
  { value: "auto_approval", label: "Auto Approval" },
  { value: "conflict_resolution", label: "Conflict Resolution" },
  { value: "payment_timeout", label: "Payment Timeout" },
  { value: "fraud_detection", label: "Fraud Detection" },
  { value: "user_verification", label: "User Verification" },
  { value: "transaction_limit", label: "Transaction Limit" },
  { value: "notification", label: "Notification" },
  { value: "other", label: "Other" },
];

const CONDITION_FIELDS = [
  { value: "amount", label: "Transaction Amount" },
  { value: "user_verified", label: "User Verified" },
  { value: "user_role", label: "User Role" },
  { value: "product_category", label: "Product Category" },
  { value: "transaction_count", label: "Transaction Count" },
  { value: "account_age_days", label: "Account Age (Days)" },
  { value: "dispute_count", label: "Dispute Count" },
  { value: "time_of_day", label: "Time of Day" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "greater_or_equal", label: "Greater or Equal" },
  { value: "less_or_equal", label: "Less or Equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
];

const ACTION_TYPES = [
  { value: "approve", label: "Approve Automatically" },
  { value: "reject", label: "Reject Automatically" },
  { value: "flag_review", label: "Flag for Review" },
  { value: "send_notification", label: "Send Notification" },
  { value: "require_verification", label: "Require Verification" },
  { value: "apply_limit", label: "Apply Transaction Limit" },
  { value: "block_user", label: "Block User" },
  { value: "escalate", label: "Escalate to Admin" },
];

function AdminRulesContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedRule, setSelectedRule] = useState<AdminRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    ruleType: "auto_approval",
    conditions: [] as Condition[],
    actions: [] as Action[],
    priority: 0,
    isActive: true,
  });

  // Fetch rules
  const { data: rules = [], isLoading } = useQuery<AdminRule[]>({
    queryKey: ["/api/admin/rules"],
  });

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        conditions: { conditions: data.conditions },
        actions: { actions: data.actions },
      };
      return await apiRequest("/api/admin/rules", {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Rule created",
        description: "The rule has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const payload = {
        ...data,
        conditions: { conditions: data.conditions },
        actions: { actions: data.actions },
      };
      return await apiRequest(`/api/admin/rules/${id}`, {
        method: "PUT",
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Rule updated",
        description: "The rule has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/rules/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
      setIsDeleteDialogOpen(false);
      setSelectedRule(null);
      toast({
        title: "Rule deleted",
        description: "The rule has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest(`/api/admin/rules/${id}`, {
        method: "PUT",
        body: { isActive },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
      toast({
        title: "Status updated",
        description: "Rule status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      ruleType: "auto_approval",
      conditions: [],
      actions: [],
      priority: 0,
      isActive: true,
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (rule: AdminRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      conditions: rule.conditions?.conditions || [],
      actions: rule.actions?.actions || [],
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (rule: AdminRule) => {
    setSelectedRule(rule);
    setIsDeleteDialogOpen(true);
  };

  const handleView = (rule: AdminRule) => {
    setSelectedRule(rule);
    setIsViewDialogOpen(true);
  };

  // Condition management
  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: "amount", operator: "greater_than", value: "" },
      ],
    });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setFormData({ ...formData, conditions: newConditions });
  };

  // Action management
  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { type: "approve", params: {} },
      ],
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
  };

  const updateAction = (index: number, type: string, params: Record<string, any> = {}) => {
    const newActions = [...formData.actions];
    newActions[index] = { type, params };
    setFormData({ ...formData, actions: newActions });
  };

  // Filter rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch = 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.ruleType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || rule.ruleType === filterType;
    return matchesSearch && matchesType;
  }).sort((a, b) => b.priority - a.priority);

  return (
    <div className="min-h-screen bg-nxe-dark p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TouchButton
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin")}
              icon={ArrowLeft}
              data-testid="button-back-admin"
            >
              Back
            </TouchButton>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Lock className="h-6 w-6 text-nxe-primary" />
              Rules Management
            </h1>
          </div>
          <TouchButton
            onClick={handleCreate}
            icon={Plus}
            className="bg-nxe-primary hover:bg-nxe-primary/90"
            data-testid="button-create-rule"
          >
            Create Rule
          </TouchButton>
        </div>

        {/* Search and Filters */}
        <Card className="bg-nxe-card border-nxe-surface">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-surface border-nxe-surface text-white"
                  data-testid="input-search-rules"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-nxe-surface border-nxe-surface text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-surface">
                  <SelectItem value="all">All Types</SelectItem>
                  {RULE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <Card className="bg-nxe-card border-nxe-surface">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary mx-auto" />
                  <p className="text-gray-400 mt-4">Loading rules...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredRules.length === 0 ? (
            <Card className="bg-nxe-card border-nxe-surface">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No rules found</p>
                  <Button
                    onClick={handleCreate}
                    className="mt-4 bg-nxe-primary hover:bg-nxe-primary/90"
                    data-testid="button-create-first-rule"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredRules.map((rule) => (
              <Card
                key={rule.id}
                className="bg-nxe-card border-nxe-surface hover:border-nxe-primary transition-all"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant="secondary"
                          className="bg-blue-500/20 text-blue-300"
                        >
                          Priority: {rule.priority}
                        </Badge>
                        <h3 className="text-lg font-semibold text-white">
                          {rule.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={
                            rule.ruleType === "auto_approval"
                              ? "bg-green-500/20 text-green-300"
                              : rule.ruleType === "fraud_detection"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-purple-500/20 text-purple-300"
                          }
                        >
                          {RULE_TYPES.find(t => t.value === rule.ruleType)?.label || rule.ruleType}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            rule.isActive
                              ? "bg-green-500/20 text-green-300"
                              : "bg-gray-500/20 text-gray-400"
                          }
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-gray-400 text-sm space-y-1">
                        <p>
                          <span className="font-semibold">Conditions:</span>{" "}
                          {rule.conditions?.conditions?.length || 0} defined
                        </p>
                        <p>
                          <span className="font-semibold">Actions:</span>{" "}
                          {rule.actions?.actions?.length || 0} defined
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(rule)}
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-view-${rule.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: rule.id,
                            isActive: !rule.isActive,
                          })
                        }
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-toggle-${rule.id}`}
                      >
                        {rule.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                        className="text-blue-400 hover:text-blue-300"
                        data-testid={`button-edit-${rule.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule)}
                        className="text-red-400 hover:text-red-300"
                        data-testid={`button-delete-${rule.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              resetForm();
            }
          }}
        >
          <DialogContent className="bg-nxe-surface border-nxe-surface max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {isEditDialogOpen ? "Edit Rule" : "Create Rule"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {isEditDialogOpen
                  ? "Update the rule configuration"
                  : "Build automation rules with IF-THEN logic"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Rule Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-nxe-card border-nxe-border text-white"
                    placeholder="e.g., Auto-approve small transactions"
                    data-testid="input-rule-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Rule Type</Label>
                  <Select
                    value={formData.ruleType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, ruleType: value })
                    }
                  >
                    <SelectTrigger className="bg-nxe-card border-nxe-border text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-surface">
                      {RULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                    }
                    className="bg-nxe-card border-nxe-border text-white"
                    placeholder="0"
                    data-testid="input-rule-priority"
                  />
                  <p className="text-xs text-gray-400">Higher priority rules execute first</p>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="active" className="text-white">
                    Active
                  </Label>
                </div>
              </div>

              {/* Conditions Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white text-lg">IF Conditions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCondition}
                    className="bg-nxe-card border-nxe-border text-white"
                    data-testid="button-add-condition"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>

                {formData.conditions.length === 0 ? (
                  <Card className="bg-nxe-card border-nxe-border">
                    <CardContent className="pt-6">
                      <p className="text-gray-400 text-center">
                        No conditions defined. Click "Add Condition" to start building your rule.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {formData.conditions.map((condition, index) => (
                      <Card key={index} className="bg-nxe-card border-nxe-border">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr_auto] gap-3 items-end">
                            <div className="space-y-2">
                              <Label className="text-white text-sm">Field</Label>
                              <Select
                                value={condition.field}
                                onValueChange={(value) =>
                                  updateCondition(index, "field", value)
                                }
                              >
                                <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-nxe-surface border-nxe-surface">
                                  {CONDITION_FIELDS.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white text-sm">Operator</Label>
                              <Select
                                value={condition.operator}
                                onValueChange={(value) =>
                                  updateCondition(index, "operator", value)
                                }
                              >
                                <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-nxe-surface border-nxe-surface">
                                  {OPERATORS.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white text-sm">Value</Label>
                              <Input
                                value={condition.value}
                                onChange={(e) =>
                                  updateCondition(index, "value", e.target.value)
                                }
                                className="bg-nxe-surface border-nxe-border text-white"
                                placeholder="Enter value"
                                data-testid={`input-condition-value-${index}`}
                              />
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(index)}
                              className="text-red-400 hover:text-red-300"
                              data-testid={`button-remove-condition-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white text-lg">THEN Actions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAction}
                    className="bg-nxe-card border-nxe-border text-white"
                    data-testid="button-add-action"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Action
                  </Button>
                </div>

                {formData.actions.length === 0 ? (
                  <Card className="bg-nxe-card border-nxe-border">
                    <CardContent className="pt-6">
                      <p className="text-gray-400 text-center">
                        No actions defined. Click "Add Action" to specify what happens when conditions match.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {formData.actions.map((action, index) => (
                      <Card key={index} className="bg-nxe-card border-nxe-border">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-[3fr_auto] gap-3 items-end">
                            <div className="space-y-2">
                              <Label className="text-white text-sm">Action Type</Label>
                              <Select
                                value={action.type}
                                onValueChange={(value) =>
                                  updateAction(index, value, action.params)
                                }
                              >
                                <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-nxe-surface border-nxe-surface">
                                  {ACTION_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAction(index)}
                              className="text-red-400 hover:text-red-300"
                              data-testid={`button-remove-action-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
                className="bg-nxe-card border-nxe-border text-white"
                data-testid="button-cancel-rule"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (isEditDialogOpen && selectedRule) {
                    updateMutation.mutate({
                      id: selectedRule.id,
                      data: formData,
                    });
                  } else {
                    createMutation.mutate(formData);
                  }
                }}
                disabled={
                  !formData.name ||
                  formData.conditions.length === 0 ||
                  formData.actions.length === 0 ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="bg-nxe-primary hover:bg-nxe-primary/90"
                data-testid="button-save-rule"
              >
                <Save className="h-4 w-4 mr-2" />
                {isEditDialogOpen ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-nxe-surface border-nxe-surface max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Rule Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedRule?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedRule && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Type</Label>
                    <Badge className="bg-purple-500/20 text-purple-300 mt-2">
                      {RULE_TYPES.find(t => t.value === selectedRule.ruleType)?.label || selectedRule.ruleType}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-white">Priority</Label>
                    <Badge className="bg-blue-500/20 text-blue-300 mt-2">
                      {selectedRule.priority}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Conditions</Label>
                  <Card className="bg-nxe-card border-nxe-border">
                    <CardContent className="pt-6">
                      {selectedRule.conditions?.conditions?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRule.conditions.conditions.map((condition: Condition, idx: number) => (
                            <div key={idx} className="text-gray-300 text-sm">
                              IF <span className="font-semibold">{condition.field}</span>{" "}
                              <span className="text-nxe-primary">{condition.operator}</span>{" "}
                              <span className="font-semibold">{condition.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400">No conditions defined</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Actions</Label>
                  <Card className="bg-nxe-card border-nxe-border">
                    <CardContent className="pt-6">
                      {selectedRule.actions?.actions?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRule.actions.actions.map((action: Action, idx: number) => (
                            <div key={idx} className="text-gray-300 text-sm">
                              THEN <span className="font-semibold text-green-400">{action.type}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400">No actions defined</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsViewDialogOpen(false)}
                className="bg-nxe-card border-nxe-border text-white"
                data-testid="button-close-view"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-nxe-surface border-nxe-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Rule</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete "{selectedRule?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-nxe-card border-nxe-border text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedRule && deleteMutation.mutate(selectedRule.id)}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete-rule"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <MobileBottomNav activeTab="rules" onTabChange={() => {}} />
    </div>
  );
}

export default function AdminRules() {
  return (
    <AdminPanelProvider>
      <AdminRulesContent />
    </AdminPanelProvider>
  );
}
