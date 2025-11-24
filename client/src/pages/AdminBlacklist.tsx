import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  Ban, 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Save,
  X,
  Search,
  Filter,
  AlertTriangle,
  User,
  Package,
  Hash,
  Globe
} from "lucide-react";
import { TouchButton, MobileBottomNav } from "@/components/admin";
import { AdminPanelProvider } from "@/features/admin";

interface AdminBlacklist {
  id: number;
  type: string;
  targetId?: number;
  value: string;
  reason: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

const BLACKLIST_TYPES = [
  { value: "user", label: "User", icon: User, description: "Block users by username or email" },
  { value: "product", label: "Product", icon: Package, description: "Block specific products" },
  { value: "keyword", label: "Keyword", icon: Hash, description: "Block content containing keywords" },
  { value: "ip_address", label: "IP Address", icon: Globe, description: "Block by IP address" },
];

function AdminBlacklistContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<AdminBlacklist | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: "user",
    targetId: null as number | null,
    value: "",
    reason: "",
    isActive: true,
  });

  // Fetch blacklist entries
  const { data: entries = [], isLoading } = useQuery<AdminBlacklist[]>({
    queryKey: ["/api/admin/blacklist"],
  });

  // Create entry mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/admin/blacklist", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Entry created",
        description: "The blacklist entry has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entry",
        variant: "destructive",
      });
    },
  });

  // Update entry mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return await apiRequest(`/api/admin/blacklist/${id}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Entry updated",
        description: "The blacklist entry has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/blacklist/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      setIsDeleteDialogOpen(false);
      setSelectedEntry(null);
      toast({
        title: "Entry deleted",
        description: "The blacklist entry has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest(`/api/admin/blacklist/${id}`, {
        method: "PUT",
        body: { isActive },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      toast({
        title: "Status updated",
        description: "Entry status has been updated",
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
      type: "user",
      targetId: null,
      value: "",
      reason: "",
      isActive: true,
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (entry: AdminBlacklist) => {
    setSelectedEntry(entry);
    setFormData({
      type: entry.type,
      targetId: entry.targetId || null,
      value: entry.value,
      reason: entry.reason,
      isActive: entry.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (entry: AdminBlacklist) => {
    setSelectedEntry(entry);
    setIsDeleteDialogOpen(true);
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || entry.type === filterType;
    const matchesActive = 
      filterActive === "all" || 
      (filterActive === "active" && entry.isActive) ||
      (filterActive === "inactive" && !entry.isActive);
    return matchesSearch && matchesType && matchesActive;
  });

  const getTypeIcon = (type: string) => {
    const typeConfig = BLACKLIST_TYPES.find(t => t.value === type);
    const Icon = typeConfig?.icon || Ban;
    return <Icon className="h-5 w-5" />;
  };

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
              <Ban className="h-6 w-6 text-nxe-primary" />
              Blacklist Management
            </h1>
          </div>
          <TouchButton
            onClick={handleCreate}
            icon={Plus}
            className="bg-nxe-primary hover:bg-nxe-primary/90"
            data-testid="button-create-blacklist"
          >
            Add Entry
          </TouchButton>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {BLACKLIST_TYPES.map((type) => {
            const Icon = type.icon;
            const count = entries.filter(e => e.type === type.value && e.isActive).length;
            return (
              <Card key={type.value} className="bg-nxe-card border-nxe-surface">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">{type.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{count}</p>
                    </div>
                    <div className="p-3 bg-red-500/20 rounded-lg">
                      <Icon className="h-6 w-6 text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filters */}
        <Card className="bg-nxe-card border-nxe-surface">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-surface border-nxe-surface text-white"
                  data-testid="input-search-blacklist"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-nxe-surface border-nxe-surface text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-surface">
                  <SelectItem value="all">All Types</SelectItem>
                  {BLACKLIST_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="bg-nxe-surface border-nxe-surface text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-surface">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <Card className="bg-nxe-card border-nxe-surface">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary mx-auto" />
                  <p className="text-gray-400 mt-4">Loading blacklist...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredEntries.length === 0 ? (
            <Card className="bg-nxe-card border-nxe-surface">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Ban className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No blacklist entries found</p>
                  {searchTerm || filterType !== "all" || filterActive !== "all" ? (
                    <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
                  ) : (
                    <Button
                      onClick={handleCreate}
                      className="mt-4 bg-nxe-primary hover:bg-nxe-primary/90"
                      data-testid="button-create-first-blacklist"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first entry
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredEntries.map((entry) => (
              <Card
                key={entry.id}
                className="bg-nxe-card border-nxe-surface hover:border-nxe-primary transition-all"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-red-500/20 rounded-lg">
                        {getTypeIcon(entry.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {entry.value}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="bg-red-500/20 text-red-300"
                          >
                            {BLACKLIST_TYPES.find(t => t.value === entry.type)?.label || entry.type}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={
                              entry.isActive
                                ? "bg-green-500/20 text-green-300"
                                : "bg-gray-500/20 text-gray-400"
                            }
                          >
                            {entry.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{entry.reason}</p>
                        {entry.targetId && (
                          <p className="text-gray-500 text-xs">
                            Target ID: {entry.targetId}
                          </p>
                        )}
                        <p className="text-gray-500 text-xs">
                          Added: {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: entry.id,
                            isActive: !entry.isActive,
                          })
                        }
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-toggle-${entry.id}`}
                      >
                        {entry.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        className="text-blue-400 hover:text-blue-300"
                        data-testid={`button-edit-${entry.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry)}
                        className="text-red-400 hover:text-red-300"
                        data-testid={`button-delete-${entry.id}`}
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
          <DialogContent className="bg-nxe-surface border-nxe-surface max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {isEditDialogOpen ? "Edit Blacklist Entry" : "Create Blacklist Entry"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {isEditDialogOpen
                  ? "Update the blacklist entry details"
                  : "Block users, products, keywords, or IP addresses"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white">Blacklist Type</Label>
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
                    {BLACKLIST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  {BLACKLIST_TYPES.find(t => t.value === formData.type)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Value</Label>
                <Input
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  className="bg-nxe-card border-nxe-border text-white"
                  placeholder={
                    formData.type === "user" ? "username or email" :
                    formData.type === "product" ? "product name or ID" :
                    formData.type === "keyword" ? "keyword or phrase" :
                    "IP address"
                  }
                  data-testid="input-blacklist-value"
                />
              </div>

              {(formData.type === "user" || formData.type === "product") && (
                <div className="space-y-2">
                  <Label className="text-white">Target ID (Optional)</Label>
                  <Input
                    type="number"
                    value={formData.targetId || ""}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        targetId: e.target.value ? parseInt(e.target.value) : null 
                      })
                    }
                    className="bg-nxe-card border-nxe-border text-white"
                    placeholder="Enter ID if known"
                    data-testid="input-blacklist-target-id"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white">Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="bg-nxe-card border-nxe-border text-white min-h-[100px]"
                  placeholder="Explain why this entry is being blacklisted..."
                  data-testid="textarea-blacklist-reason"
                />
              </div>

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
                data-testid="button-cancel-blacklist"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (isEditDialogOpen && selectedEntry) {
                    updateMutation.mutate({
                      id: selectedEntry.id,
                      data: formData,
                    });
                  } else {
                    createMutation.mutate(formData);
                  }
                }}
                disabled={
                  !formData.value ||
                  !formData.reason ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="bg-nxe-primary hover:bg-nxe-primary/90"
                data-testid="button-save-blacklist"
              >
                <Save className="h-4 w-4 mr-2" />
                {isEditDialogOpen ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-nxe-surface border-nxe-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Blacklist Entry</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete the blacklist entry for "{selectedEntry?.value}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-nxe-card border-nxe-border text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedEntry && deleteMutation.mutate(selectedEntry.id)}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete-blacklist"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <MobileBottomNav activeTab="blacklist" onTabChange={() => {}} />
    </div>
  );
}

export default function AdminBlacklist() {
  return (
    <AdminPanelProvider>
      <AdminBlacklistContent />
    </AdminPanelProvider>
  );
}
