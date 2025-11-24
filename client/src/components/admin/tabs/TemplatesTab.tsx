import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Palette, Plus, Edit, Trash2, Search } from "lucide-react";

interface AdminTemplate {
  id: number;
  name: string;
  type: string;
  template: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
}

interface TemplatesTabProps {
  hasAdminAccess?: boolean;
}

interface TemplateFormData {
  name: string;
  type: string;
  template: string;
  variables: string;
  isActive: boolean;
}

export default function TemplatesTab({ hasAdminAccess = false }: TemplatesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    type: "notification",
    template: "",
    variables: "",
    isActive: true,
  });

  const { data: templates = [], isLoading } = useQuery<AdminTemplate[]>({
    queryKey: ["/api/admin/templates"],
    enabled: hasAdminAccess,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AdminTemplate>) =>
      apiRequest("/api/admin/templates", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Template has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminTemplate> }) =>
      apiRequest(`/api/admin/templates/${id}`, {
        method: "PUT",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Template Updated",
        description: "Template has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: "notification",
      template: "",
      variables: "",
      isActive: true,
    });
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: "notification",
      template: "",
      variables: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: AdminTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      template: template.template,
      variables: template.variables.join(", "),
      isActive: template.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = (templateId: number) => {
    setDeleteConfirmId(templateId);
  };

  const handleSubmit = () => {
    const variables = formData.variables
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const templateData = {
      name: formData.name,
      type: formData.type,
      template: formData.template,
      variables,
      isActive: formData.isActive,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: templateData });
    } else {
      createMutation.mutate(templateData);
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
        <p className="text-gray-400">You don't have access to view templates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-nxe-surface border-nxe-border"
            data-testid="input-search-templates"
          />
        </div>
        <Button
          size="sm"
          className="bg-nxe-primary hover:bg-nxe-primary/90 flex items-center gap-2"
          onClick={handleAddTemplate}
          data-testid="button-add-template"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="bg-nxe-card border-nxe-border">
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Palette className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-400 text-center">
              {searchTerm ? "No templates found" : "No templates yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="bg-nxe-card border-nxe-border hover:border-nxe-primary/50 transition-colors"
              data-testid={`template-card-${template.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      {template.name}
                      {!template.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-1">{template.type}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-300 line-clamp-2 bg-nxe-surface/50 p-2 rounded">
                  {template.template}
                </div>
                {template.variables && template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.slice(0, 3).map((variable, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-xs border-nxe-primary/30 text-nxe-primary"
                      >
                        {variable}
                      </Badge>
                    ))}
                    {template.variables.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.variables.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-nxe-border hover:bg-nxe-surface"
                    onClick={() => handleEditTemplate(template)}
                    data-testid={`button-edit-template-${template.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDeleteTemplate(template.id)}
                    data-testid={`button-delete-template-${template.id}`}
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
        <DialogContent className="bg-nxe-surface border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingTemplate ? "Update template details" : "Create a new template"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Welcome Message"
                className="bg-nxe-dark border-nxe-border"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Template Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-nxe-dark border-nxe-border" data-testid="select-template-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-border">
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template Content</Label>
              <Textarea
                id="template"
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                placeholder="Hello {{name}}, welcome to {{platform}}!"
                rows={4}
                className="bg-nxe-dark border-nxe-border"
                data-testid="input-template-content"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variables">Variables (comma-separated)</Label>
              <Input
                id="variables"
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                placeholder="name, platform, date"
                className="bg-nxe-dark border-nxe-border"
                data-testid="input-template-variables"
              />
              <p className="text-xs text-gray-400">
                These variables can be used in your template with {"{{"} and {"}}"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-template-active"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active Template
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              className="border-nxe-border"
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.template || createMutation.isPending || updateMutation.isPending}
              className="bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-save-template"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-nxe-border"
              data-testid="button-cancel-delete-template"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-template"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
