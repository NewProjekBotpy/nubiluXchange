import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Palette, 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  EyeOff,
  Save,
  X,
  Search,
  Filter
} from "lucide-react";
import { TouchButton, MobileBottomNav } from "@/components/admin";
import { AdminPanelProvider } from "@/features/admin";

interface AdminTemplate {
  id: number;
  name: string;
  type: string;
  template: string;
  variables: string[];
  isActive: boolean;
  createdBy: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_TYPES = [
  { value: "auto_reply", label: "Auto Reply" },
  { value: "welcome", label: "Welcome Message" },
  { value: "conflict_resolution", label: "Conflict Resolution" },
  { value: "notification", label: "Notification" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "other", label: "Other" },
];

const COMMON_VARIABLES = [
  "{{username}}",
  "{{email}}",
  "{{amount}}",
  "{{product_name}}",
  "{{transaction_id}}",
  "{{date}}",
  "{{time}}",
  "{{status}}",
  "{{link}}",
  "{{platform_name}}",
];

function AdminTemplatesContent() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "auto_reply",
    template: "",
    variables: [] as string[],
    isActive: true,
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<AdminTemplate[]>({
    queryKey: ["/api/admin/templates"],
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/admin/templates", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Template created",
        description: "The template has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return await apiRequest(`/api/admin/templates/${id}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Template updated",
        description: "The template has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest(`/api/admin/templates/${id}`, {
        method: "PUT",
        body: { isActive },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      toast({
        title: "Status updated",
        description: "Template status has been updated",
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
      type: "auto_reply",
      template: "",
      variables: [],
      isActive: true,
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (template: AdminTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      template: template.template,
      variables: template.variables || [],
      isActive: template.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (template: AdminTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handlePreview = (template: AdminTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const handleDuplicate = (template: AdminTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      type: template.type,
      template: template.template,
      variables: template.variables || [],
      isActive: false,
    });
    setIsCreateDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.template;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setFormData({ ...formData, template: newText });
      
      // Update variables array if not already included
      if (!formData.variables.includes(variable)) {
        setFormData(prev => ({
          ...prev,
          variables: [...prev.variables, variable]
        }));
      }
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = text.matchAll(regex);
    return Array.from(new Set(Array.from(matches).map(match => `{{${match[1]}}}`)));
  };

  const handleTemplateChange = (value: string) => {
    const extractedVars = extractVariables(value);
    setFormData({
      ...formData,
      template: value,
      variables: extractedVars,
    });
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || template.type === filterType;
    return matchesSearch && matchesType;
  });

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
              <Palette className="h-6 w-6 text-nxe-primary" />
              Template Management
            </h1>
          </div>
          <TouchButton
            onClick={handleCreate}
            icon={Plus}
            className="bg-nxe-primary hover:bg-nxe-primary/90"
            data-testid="button-create-template"
          >
            Create Template
          </TouchButton>
        </div>

        {/* Search and Filters */}
        <Card className="bg-nxe-card border-nxe-surface">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-surface border-nxe-surface text-white"
                  data-testid="input-search-templates"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-nxe-surface border-nxe-surface text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-surface">
                  <SelectItem value="all">All Types</SelectItem>
                  {TEMPLATE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <Card className="bg-nxe-card border-nxe-surface">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary mx-auto" />
                  <p className="text-gray-400 mt-4">Loading templates...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card className="bg-nxe-card border-nxe-surface">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Palette className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No templates found</p>
                  <Button
                    onClick={handleCreate}
                    className="mt-4 bg-nxe-primary hover:bg-nxe-primary/90"
                    data-testid="button-create-first-template"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="bg-nxe-card border-nxe-surface hover:border-nxe-primary transition-all"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {template.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={
                            template.type === "auto_reply"
                              ? "bg-blue-500/20 text-blue-300"
                              : template.type === "welcome"
                              ? "bg-green-500/20 text-green-300"
                              : template.type === "conflict_resolution"
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-purple-500/20 text-purple-300"
                          }
                        >
                          {TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            template.isActive
                              ? "bg-green-500/20 text-green-300"
                              : "bg-gray-500/20 text-gray-400"
                          }
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {template.template}
                      </p>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {template.variables.map((variable, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="bg-nxe-surface border-nxe-border text-xs"
                            >
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-preview-${template.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(template)}
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-duplicate-${template.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: template.id,
                            isActive: !template.isActive,
                          })
                        }
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-toggle-${template.id}`}
                      >
                        {template.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        className="text-blue-400 hover:text-blue-300"
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                        className="text-red-400 hover:text-red-300"
                        data-testid={`button-delete-${template.id}`}
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
          <DialogContent className="bg-nxe-surface border-nxe-surface max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {isEditDialogOpen ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {isEditDialogOpen
                  ? "Update the template details below"
                  : "Create a new message template with variables"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white">Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-nxe-card border-nxe-border text-white"
                  placeholder="e.g., Welcome Message"
                  data-testid="input-template-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Template Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="bg-nxe-card border-nxe-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-nxe-surface border-nxe-surface">
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Template Content</Label>
                <Textarea
                  id="template-textarea"
                  value={formData.template}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="bg-nxe-card border-nxe-border text-white min-h-[150px]"
                  placeholder="Enter your template content here. Use {{variable}} for dynamic content."
                  data-testid="textarea-template-content"
                />
                <p className="text-xs text-gray-400">
                  Use double curly braces for variables: {"{{variable}"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Quick Insert Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_VARIABLES.map((variable) => (
                    <Button
                      key={variable}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(variable)}
                      className="bg-nxe-card border-nxe-border text-gray-300 hover:text-white text-xs"
                      data-testid={`button-insert-${variable}`}
                    >
                      {variable}
                    </Button>
                  ))}
                </div>
              </div>

              {formData.variables.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-white">Detected Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable, idx) => (
                      <Badge
                        key={idx}
                        className="bg-blue-500/20 text-blue-300"
                      >
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
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

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
                className="bg-nxe-card border-nxe-border text-white"
                data-testid="button-cancel-template"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (isEditDialogOpen && selectedTemplate) {
                    updateMutation.mutate({
                      id: selectedTemplate.id,
                      data: formData,
                    });
                  } else {
                    createMutation.mutate(formData);
                  }
                }}
                disabled={
                  !formData.name ||
                  !formData.template ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="bg-nxe-primary hover:bg-nxe-primary/90"
                data-testid="button-save-template"
              >
                <Save className="h-4 w-4 mr-2" />
                {isEditDialogOpen ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="bg-nxe-surface border-nxe-surface max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Template Preview</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedTemplate?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-white">Type</Label>
                  <Badge className="bg-blue-500/20 text-blue-300">
                    {TEMPLATE_TYPES.find(t => t.value === selectedTemplate.type)?.label || selectedTemplate.type}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Content</Label>
                  <div className="bg-nxe-card border-nxe-border rounded-lg p-4">
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedTemplate.template}
                    </p>
                  </div>
                </div>

                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white">Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable, idx) => (
                        <Badge
                          key={idx}
                          className="bg-purple-500/20 text-purple-300"
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsPreviewDialogOpen(false)}
                className="bg-nxe-card border-nxe-border text-white"
                data-testid="button-close-preview"
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
              <AlertDialogTitle className="text-white">Delete Template</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-nxe-card border-nxe-border text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete-template"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <MobileBottomNav activeTab="templates" onTabChange={() => {}} />
    </div>
  );
}

export default function AdminTemplates() {
  return (
    <AdminPanelProvider>
      <AdminTemplatesContent />
    </AdminPanelProvider>
  );
}
