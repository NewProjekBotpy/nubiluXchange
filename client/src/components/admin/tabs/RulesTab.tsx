import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Lock, Plus, Edit, Trash2, Search, ArrowUp, ArrowDown } from "lucide-react";

interface AdminRule {
  id: number;
  name: string;
  ruleType: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

interface RulesTabProps {
  hasAdminAccess?: boolean;
}

interface RuleFormData {
  name: string;
  ruleType: string;
  conditions: string;
  actions: string;
  priority: number;
  isActive: boolean;
}

export default function RulesTab({ hasAdminAccess = false }: RulesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AdminRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    ruleType: "security",
    conditions: "{}",
    actions: "{}",
    priority: 1,
    isActive: true,
  });

  const { data: rules = [], isLoading } = useQuery<AdminRule[]>({
    queryKey: ["/api/admin/rules"],
    enabled: hasAdminAccess,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AdminRule>) =>
      apiRequest("/api/admin/rules", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Rule Created",
        description: "Rule has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminRule> }) =>
      apiRequest(`/api/admin/rules/${id}`, {
        method: "PUT",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Rule Updated",
        description: "Rule has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({
        title: "Rule Deleted",
        description: "Rule has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: number; priority: number }) =>
      apiRequest(`/api/admin/rules/${id}/priority`, {
        method: "PATCH",
        body: { priority },
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Priority Updated",
        description: "Rule priority has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update priority",
        variant: "destructive",
      });
    },
  });

  const filteredRules = rules
    .filter(rule =>
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.ruleType.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.priority - a.priority);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRule(null);
    setFormData({
      name: "",
      ruleType: "security",
      conditions: "{}",
      actions: "{}",
      priority: 1,
      isActive: true,
    });
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setFormData({
      name: "",
      ruleType: "security",
      conditions: "{}",
      actions: "{}",
      priority: 1,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditRule = (rule: AdminRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      conditions: JSON.stringify(rule.conditions, null, 2),
      actions: JSON.stringify(rule.actions, null, 2),
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRule = (ruleId: number) => {
    setDeleteConfirmId(ruleId);
  };

  const handlePriorityChange = (ruleId: number, direction: 'up' | 'down') => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    const newPriority = direction === 'up' ? rule.priority + 1 : rule.priority - 1;
    priorityMutation.mutate({ id: ruleId, priority: newPriority });
  };

  const handleSubmit = () => {
    try {
      const conditions = JSON.parse(formData.conditions);
      const actions = JSON.parse(formData.actions);

      const ruleData = {
        name: formData.name,
        ruleType: formData.ruleType,
        conditions,
        actions,
        priority: formData.priority,
        isActive: formData.isActive,
      };

      if (editingRule) {
        updateMutation.mutate({ id: editingRule.id, data: ruleData });
      } else {
        createMutation.mutate(ruleData);
      }
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your conditions and actions JSON format",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">You don't have access to view rules</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-nxe-surface border-nxe-border"
            data-testid="input-search-rules"
          />
        </div>
        <Button
          size="sm"
          className="bg-nxe-primary hover:bg-nxe-primary/90 flex items-center gap-2"
          onClick={handleAddRule}
          data-testid="button-add-rule"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary" />
        </div>
      ) : filteredRules.length === 0 ? (
        <Card className="bg-nxe-card border-nxe-border">
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Lock className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-400 text-center">
              {searchTerm ? "No rules found" : "No rules configured yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule, index) => (
            <Card 
              key={rule.id} 
              className="bg-nxe-card border-nxe-border hover:border-nxe-primary/50 transition-colors"
              data-testid={`rule-card-${rule.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base text-white">
                        {rule.name}
                      </CardTitle>
                      {!rule.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      <Badge variant="outline" className="text-xs border-nxe-primary/30 text-nxe-primary">
                        Priority: {rule.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{rule.ruleType}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-nxe-surface/50 p-2 rounded">
                    <p className="text-xs text-gray-400 mb-1">Conditions</p>
                    <p className="text-white text-xs">
                      {Object.keys(rule.conditions || {}).length} configured
                    </p>
                  </div>
                  <div className="bg-nxe-surface/50 p-2 rounded">
                    <p className="text-xs text-gray-400 mb-1">Actions</p>
                    <p className="text-white text-xs">
                      {Object.keys(rule.actions || {}).length} configured
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-nxe-border hover:bg-nxe-surface"
                    disabled={index === 0 || priorityMutation.isPending}
                    onClick={() => handlePriorityChange(rule.id, 'up')}
                    data-testid={`button-priority-up-${rule.id}`}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-nxe-border hover:bg-nxe-surface"
                    disabled={index === filteredRules.length - 1 || priorityMutation.isPending}
                    onClick={() => handlePriorityChange(rule.id, 'down')}
                    data-testid={`button-priority-down-${rule.id}`}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-nxe-border hover:bg-nxe-surface"
                    onClick={() => handleEditRule(rule)}
                    data-testid={`button-edit-rule-${rule.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDeleteRule(rule.id)}
                    data-testid={`button-delete-rule-${rule.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingRule ? "Update rule configuration" : "Create a new automation rule"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Auto-ban suspicious users"
                className="bg-nxe-dark border-nxe-border"
                data-testid="input-rule-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleType">Rule Type</Label>
              <Select
                value={formData.ruleType}
                onValueChange={(value) => setFormData({ ...formData, ruleType: value })}
              >
                <SelectTrigger className="bg-nxe-dark border-nxe-border" data-testid="select-rule-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-border">
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="moderation">Moderation</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (higher = runs first)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                className="bg-nxe-dark border-nxe-border"
                data-testid="input-rule-priority"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conditions">Conditions (JSON)</Label>
              <Textarea
                id="conditions"
                value={formData.conditions}
                onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                placeholder='{"field": "value", "operator": "equals"}'
                rows={4}
                className="bg-nxe-dark border-nxe-border font-mono text-sm"
                data-testid="input-rule-conditions"
              />
              <p className="text-xs text-gray-400">
                Define conditions that trigger this rule in JSON format
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actions">Actions (JSON)</Label>
              <Textarea
                id="actions"
                value={formData.actions}
                onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                placeholder='{"action": "ban", "duration": "24h"}'
                rows={4}
                className="bg-nxe-dark border-nxe-border font-mono text-sm"
                data-testid="input-rule-actions"
              />
              <p className="text-xs text-gray-400">
                Define actions to execute when conditions are met
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-rule-active"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active Rule
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              className="border-nxe-border"
              data-testid="button-cancel-rule"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              className="bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-save-rule"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-nxe-border"
              data-testid="button-cancel-delete-rule"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-rule"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
