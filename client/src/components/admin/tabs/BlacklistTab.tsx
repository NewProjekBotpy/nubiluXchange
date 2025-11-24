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
import { Ban, Plus, Edit, Trash2, Search, User, Package, Hash, Globe } from "lucide-react";

interface AdminBlacklist {
  id: number;
  type: string;
  targetId?: number;
  value: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
}

interface BlacklistTabProps {
  hasAdminAccess?: boolean;
}

interface BlacklistFormData {
  type: string;
  value: string;
  reason: string;
  isActive: boolean;
}

const TYPE_ICONS = {
  user: User,
  product: Package,
  keyword: Hash,
  ip_address: Globe,
};

const TYPE_LABELS = {
  user: "User",
  product: "Product",
  keyword: "Keyword",
  ip_address: "IP Address",
};

export default function BlacklistTab({ hasAdminAccess = false }: BlacklistTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminBlacklist | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState<BlacklistFormData>({
    type: "user",
    value: "",
    reason: "",
    isActive: true,
  });

  const { data: entries = [], isLoading } = useQuery<AdminBlacklist[]>({
    queryKey: ["/api/admin/blacklist"],
    enabled: hasAdminAccess,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AdminBlacklist>) =>
      apiRequest("/api/admin/blacklist", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Blacklist Entry Created",
        description: "Entry has been added to blacklist successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create blacklist entry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminBlacklist> }) =>
      apiRequest(`/api/admin/blacklist/${id}`, {
        method: "PUT",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Blacklist Entry Updated",
        description: "Entry has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update blacklist entry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/blacklist/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({
        title: "Blacklist Entry Deleted",
        description: "Entry has been removed from blacklist",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete blacklist entry",
        variant: "destructive",
      });
    },
  });

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || entry.type === filterType;
    return matchesSearch && matchesType;
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    setFormData({
      type: "user",
      value: "",
      reason: "",
      isActive: true,
    });
  };

  const handleAddBlacklist = () => {
    setEditingEntry(null);
    setFormData({
      type: "user",
      value: "",
      reason: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditBlacklist = (entry: AdminBlacklist) => {
    setEditingEntry(entry);
    setFormData({
      type: entry.type,
      value: entry.value,
      reason: entry.reason,
      isActive: entry.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteBlacklist = (entryId: number) => {
    setDeleteConfirmId(entryId);
  };

  const handleSubmit = () => {
    const blacklistData = {
      type: formData.type,
      value: formData.value,
      reason: formData.reason,
      isActive: formData.isActive,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: blacklistData });
    } else {
      createMutation.mutate(blacklistData);
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
        <p className="text-gray-400">You don't have access to view blacklist</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search blacklist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-nxe-surface border-nxe-border"
            data-testid="input-search-blacklist"
          />
        </div>
        <Button
          size="sm"
          className="bg-nxe-primary hover:bg-nxe-primary/90 flex items-center gap-2"
          onClick={handleAddBlacklist}
          data-testid="button-add-blacklist"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={filterType === "all" ? "default" : "outline"}
          onClick={() => setFilterType("all")}
          className={filterType === "all" ? "bg-nxe-primary" : "border-nxe-border"}
        >
          All
        </Button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filterType === key ? "default" : "outline"}
            onClick={() => setFilterType(key)}
            className={filterType === key ? "bg-nxe-primary" : "border-nxe-border"}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card className="bg-nxe-card border-nxe-border">
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Ban className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-400 text-center">
              {searchTerm || filterType !== "all" ? "No entries found" : "No blacklist entries yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const Icon = TYPE_ICONS[entry.type as keyof typeof TYPE_ICONS] || Ban;
            return (
              <Card 
                key={entry.id} 
                className="bg-nxe-card border-nxe-border hover:border-nxe-primary/50 transition-colors"
                data-testid={`blacklist-card-${entry.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <Icon className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base text-white truncate">
                            {entry.value}
                          </CardTitle>
                          {!entry.isActive && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">Inactive</Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                          {TYPE_LABELS[entry.type as keyof typeof TYPE_LABELS] || entry.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-nxe-surface/50 p-2 rounded">
                    <p className="text-xs text-gray-400 mb-1">Reason</p>
                    <p className="text-sm text-white">{entry.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-nxe-border hover:bg-nxe-surface"
                      onClick={() => handleEditBlacklist(entry)}
                      data-testid={`button-edit-blacklist-${entry.id}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDeleteBlacklist(entry.id)}
                      data-testid={`button-delete-blacklist-${entry.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Blacklist Entry" : "Add Blacklist Entry"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingEntry ? "Update blacklist entry details" : "Add a new entry to the blacklist"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Entry Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-nxe-dark border-nxe-border" data-testid="select-blacklist-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-nxe-surface border-nxe-border">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="ip_address">IP Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={
                  formData.type === "user" ? "Username or ID" :
                  formData.type === "product" ? "Product ID or name" :
                  formData.type === "keyword" ? "Restricted keyword" :
                  "IP address"
                }
                className="bg-nxe-dark border-nxe-border"
                data-testid="input-blacklist-value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Explain why this entry is being blacklisted..."
                rows={3}
                className="bg-nxe-dark border-nxe-border"
                data-testid="input-blacklist-reason"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-blacklist-active"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active Entry
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              className="border-nxe-border"
              data-testid="button-cancel-blacklist"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.value || !formData.reason || createMutation.isPending || updateMutation.isPending}
              className="bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-save-blacklist"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingEntry ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white">
          <DialogHeader>
            <DialogTitle>Delete Blacklist Entry</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to remove this entry from the blacklist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-nxe-border"
              data-testid="button-cancel-delete-blacklist"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-blacklist"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
