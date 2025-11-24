import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Calendar, 
  Trophy, 
  Users, 
  Gift, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Play, 
  Pause, 
  Archive, 
  Star,
  Target,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Medal,
  Crown,
  Zap,
  Settings,
  Download,
  Upload,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ResponsiveDataList, 
  TouchButton, 
  AdminActionButton, 
  AdminPrimaryButton, 
  AdminDangerButton,
  KPIGrid,
  type DataListItem,
  type KPIItem
} from "@/components/admin";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Season Management Types
interface Season {
  id: number;
  name: string;
  description?: string;
  type: 'regular' | 'event' | 'tournament' | 'special';
  status: 'upcoming' | 'active' | 'ended' | 'archived';
  startDate: string;
  endDate: string;
  rewards: Record<string, any>;
  settings: Record<string, any>;
  bannerImage?: string;
  categories: string[];
  maxParticipants?: number;
  currentParticipants: number;
  registrationFee: string;
  prizePool: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface SeasonParticipant {
  id: number;
  seasonId: number;
  userId: number;
  registeredAt: string;
  rank?: number;
  score: string;
  rewards: Record<string, any>;
  isActive: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    profilePicture?: string;
  };
}

interface SeasonReward {
  id: number;
  seasonId: number;
  name: string;
  description?: string;
  rewardType: 'currency' | 'item' | 'badge' | 'title' | 'special';
  rewardValue: Record<string, any>;
  criteria: Record<string, any>;
  maxClaims?: number;
  currentClaims: number;
  isActive: boolean;
  createdAt: string;
}

// Form Schemas
const seasonFormSchema = z.object({
  name: z.string().min(3, 'Season name must be at least 3 characters'),
  description: z.string().optional(),
  type: z.enum(['regular', 'event', 'tournament', 'special']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  maxParticipants: z.number().optional(),
  registrationFee: z.string().default('0'),
  prizePool: z.string().default('0'),
  bannerImage: z.string().optional(),
});

const rewardFormSchema = z.object({
  name: z.string().min(3, 'Reward name must be at least 3 characters'),
  description: z.string().optional(),
  rewardType: z.enum(['currency', 'item', 'badge', 'title', 'special']),
  rewardValue: z.string().min(1, 'Reward value is required'),
  criteria: z.string().min(1, 'Criteria is required'),
  maxClaims: z.number().optional(),
});

type SeasonFormData = z.infer<typeof seasonFormSchema>;
type RewardFormData = z.infer<typeof rewardFormSchema>;

const gameCategories = [
  'Mobile Legends',
  'PUBG Mobile',
  'Free Fire',
  'Valorant',
  'Call of Duty Mobile',
  'Genshin Impact',
  'Honkai Star Rail',
  'League of Legends',
  'Dota 2',
  'CS:GO',
  'FIFA',
  'eFootball'
];

export default function SeasonManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [seasonDialog, setSeasonDialog] = useState<{ season: Season | null }>({ season: null });
  const [rewardDialog, setRewardDialog] = useState<{ reward: SeasonReward | null; seasonId?: number }>({ reward: null });
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'season' | 'reward'; id: number; name: string } | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });

  // Season form
  const seasonForm = useForm<SeasonFormData>({
    resolver: zodResolver(seasonFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'regular',
      startDate: '',
      endDate: '',
      categories: [],
      registrationFee: '0',
      prizePool: '0',
    }
  });

  // Reward form
  const rewardForm = useForm<RewardFormData>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      name: '',
      description: '',
      rewardType: 'currency',
      rewardValue: '',
      criteria: '',
    }
  });

  // Queries
  const { data: seasons = [], isLoading: seasonsLoading, error: seasonsError } = useQuery<Season[]>({
    queryKey: ['/api/admin/seasons'],
    staleTime: 30000,
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<SeasonParticipant[]>({
    queryKey: ['/api/admin/seasons', selectedSeason?.id, 'participants'],
    enabled: !!selectedSeason?.id,
    staleTime: 30000,
  });

  const { data: rewards = [], isLoading: rewardsLoading } = useQuery<SeasonReward[]>({
    queryKey: ['/api/admin/seasons', selectedSeason?.id, 'rewards'],
    enabled: !!selectedSeason?.id,
    staleTime: 30000,
  });

  // Mutations
  const createSeasonMutation = useMutation({
    mutationFn: (data: SeasonFormData) => apiRequest('/api/admin/seasons', {
      method: 'POST',
      body: {
        ...data,
        categories: data.categories,
        maxParticipants: data.maxParticipants || null,
        registrationFee: data.registrationFee,
        prizePool: data.prizePool,
        rewards: {},
        settings: {}
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons'] });
      setSeasonDialog({ season: null });
      seasonForm.reset();
      toast({ title: 'Season created successfully', description: 'The new season has been added.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating season', 
        description: error?.message || 'Failed to create season',
        variant: 'destructive' 
      });
    }
  });

  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SeasonFormData> }) => 
      apiRequest(`/api/admin/seasons/${id}`, {
        method: 'PATCH',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons'] });
      setSeasonDialog({ season: null });
      seasonForm.reset();
      toast({ title: 'Season updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating season', 
        description: error?.message || 'Failed to update season',
        variant: 'destructive' 
      });
    }
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/seasons/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons'] });
      setDeleteDialog(null);
      if (selectedSeason?.id === deleteDialog?.id) {
        setSelectedSeason(null);
      }
      toast({ title: 'Season deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting season', 
        description: error?.message || 'Failed to delete season',
        variant: 'destructive' 
      });
    }
  });

  const updateSeasonStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest(`/api/admin/seasons/${id}/status`, {
        method: 'PATCH',
        body: { status }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons'] });
      toast({ title: 'Season status updated successfully' });
    }
  });

  const createRewardMutation = useMutation({
    mutationFn: (data: RewardFormData & { seasonId: number }) => apiRequest('/api/admin/season-rewards', {
      method: 'POST',
      body: {
        ...data,
        rewardValue: JSON.parse(data.rewardValue),
        criteria: JSON.parse(data.criteria),
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons', selectedSeason?.id, 'rewards'] });
      setRewardDialog({ reward: null });
      rewardForm.reset();
      toast({ title: 'Reward created successfully' });
    }
  });

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'ended': return 'bg-gray-500';
      case 'archived': return 'bg-gray-700';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tournament': return Trophy;
      case 'event': return Star;
      case 'special': return Crown;
      default: return Target;
    }
  };

  // Filter seasons
  const filteredSeasons = useMemo(() => seasons.filter(season => {
    if (filters.status !== 'all' && season.status !== filters.status) return false;
    if (filters.type !== 'all' && season.type !== filters.type) return false;
    if (filters.search && !season.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }), [seasons, filters]);

  // KPI data
  const kpiItems: KPIItem[] = [
    {
      title: 'Total Seasons',
      value: seasons.length,
      icon: Calendar,
      iconColor: 'text-blue-400',
      trend: { value: '+2 this month', isPositive: true }
    },
    {
      title: 'Active Seasons',
      value: seasons.filter(s => s.status === 'active').length,
      icon: Play,
      iconColor: 'text-green-400',
    },
    {
      title: 'Total Participants',
      value: seasons.reduce((sum, s) => sum + s.currentParticipants, 0),
      icon: Users,
      iconColor: 'text-purple-400',
      trend: { value: '+156 this week', isPositive: true }
    },
    {
      title: 'Prize Pool Total',
      value: `$${seasons.reduce((sum, s) => sum + parseFloat(s.prizePool || '0'), 0).toLocaleString()}`,
      icon: DollarSign,
      iconColor: 'text-yellow-400',
      trend: { value: '+$12.5K this month', isPositive: true }
    }
  ];

  // Convert seasons to data list items
  const seasonDataItems: DataListItem[] = useMemo(() => filteredSeasons.map(season => {
    const TypeIcon = getTypeIcon(season.type);
    return {
      id: season.id,
      title: season.name,
      subtitle: season.description || `${season.type.charAt(0).toUpperCase() + season.type.slice(1)} Season`,
      badge: {
        text: season.status,
        variant: season.status === 'active' ? 'default' : 
                season.status === 'upcoming' ? 'secondary' : 'outline',
        className: season.status === 'active' ? 'bg-green-500 text-white' : 
                  season.status === 'upcoming' ? 'bg-blue-500 text-white' : ''
      },
      metadata: [
        { label: 'Type', value: season.type },
        { label: 'Participants', value: `${season.currentParticipants}${season.maxParticipants ? `/${season.maxParticipants}` : ''}` },
        { label: 'Start Date', value: formatDate(season.startDate) },
        { label: 'Prize Pool', value: `$${parseFloat(season.prizePool || '0').toLocaleString()}` }
      ],
      actions: [
        {
          label: 'View Details',
          onClick: () => setSelectedSeason(season),
          icon: Eye
        },
        {
          label: 'Edit',
          onClick: () => {
            seasonForm.reset({
              name: season.name,
              description: season.description || '',
              type: season.type,
              startDate: new Date(season.startDate).toISOString().split('T')[0],
              endDate: new Date(season.endDate).toISOString().split('T')[0],
              categories: season.categories,
              maxParticipants: season.maxParticipants || undefined,
              registrationFee: season.registrationFee,
              prizePool: season.prizePool,
              bannerImage: season.bannerImage || '',
            });
            setSeasonDialog({ season });
          },
          icon: Edit2
        },
        {
          label: season.status === 'active' ? 'Pause' : 'Activate',
          onClick: () => updateSeasonStatusMutation.mutate({ 
            id: season.id, 
            status: season.status === 'active' ? 'upcoming' : 'active' 
          }),
          icon: season.status === 'active' ? Pause : Play,
          variant: season.status === 'active' ? 'outline' : 'default'
        },
        {
          label: 'Delete',
          onClick: () => setDeleteDialog({ type: 'season', id: season.id, name: season.name }),
          icon: Trash2,
          variant: 'destructive'
        }
      ]
    };
  }), [filteredSeasons, seasonForm, updateSeasonStatusMutation]);

  return (
    <div className="min-h-screen bg-nxe-dark text-white p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/admin')}
            className="bg-nxe-card border-nxe-surface text-white hover:bg-nxe-surface"
            data-testid="button-back-to-admin"
          >
            ← Back to Admin
          </Button>
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Trophy className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Season Management</h1>
            <p className="text-gray-400">Manage gaming seasons, tournaments, and events</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TouchButton
            onClick={() => {
              seasonForm.reset();
              setSeasonDialog({ season: null });
            }}
            icon={Plus}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-create-season"
          >
            New Season
          </TouchButton>
        </div>
      </div>

      {/* KPI Grid */}
      <KPIGrid 
        items={kpiItems}
        columns={{ mobile: 2, tablet: 2, desktop: 4 }}
      />

      {/* Filters */}
      <Card className="bg-nxe-card border-nxe-surface">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-white mb-2 block">Search</Label>
              <Input
                placeholder="Search seasons..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="bg-nxe-surface border-nxe-border text-white"
                data-testid="input-search-seasons"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white mb-2 block">Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <TouchButton
                onClick={() => setFilters({ status: 'all', type: 'all', search: '' })}
                variant="outline"
                className="w-full"
                data-testid="button-clear-filters"
              >
                Clear Filters
              </TouchButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seasons List */}
      <ResponsiveDataList
        items={seasonDataItems}
        title="Seasons"
        isLoading={seasonsLoading}
        emptyMessage="No seasons found"
        searchable={false}
      />

      {/* Season Dialog */}
      <Dialog open={!!seasonDialog.season !== null || seasonDialog.season === null} onOpenChange={(open) => !open && setSeasonDialog({ season: null })}>
        <DialogContent className="bg-nxe-surface border-nxe-surface max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {seasonDialog.season ? 'Edit Season' : 'Create New Season'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {seasonDialog.season ? 'Update season details and settings' : 'Create a new gaming season or tournament'}
            </DialogDescription>
          </DialogHeader>
          <Form {...seasonForm}>
            <form onSubmit={seasonForm.handleSubmit((data) => {
              if (seasonDialog.season) {
                updateSeasonMutation.mutate({ id: seasonDialog.season.id, data });
              } else {
                createSeasonMutation.mutate(data);
              }
            })} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={seasonForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Season Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Summer Championship 2024"
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-season-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seasonForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Season Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-nxe-card border-nxe-border text-white">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">Regular Season</SelectItem>
                          <SelectItem value="event">Special Event</SelectItem>
                          <SelectItem value="tournament">Tournament</SelectItem>
                          <SelectItem value="special">Special Season</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={seasonForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the season, rules, and objectives..."
                        className="bg-nxe-card border-nxe-border text-white"
                        data-testid="input-season-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={seasonForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-season-start-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seasonForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-season-end-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={seasonForm.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Max Participants</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Leave empty for unlimited"
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-season-max-participants"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seasonForm.control}
                  name="registrationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Registration Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-season-registration-fee"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seasonForm.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Prize Pool ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="bg-nxe-card border-nxe-border text-white"
                          data-testid="input-season-prize-pool"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={seasonForm.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Game Categories</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-nxe-card rounded-lg border border-nxe-border">
                      {gameCategories.map((category) => (
                        <label key={category} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.value.includes(category)}
                            onChange={(e) => {
                              const newCategories = e.target.checked
                                ? [...field.value, category]
                                : field.value.filter(c => c !== category);
                              field.onChange(newCategories);
                            }}
                            className="rounded border-nxe-border"
                            data-testid={`checkbox-category-${category.toLowerCase().replace(' ', '-')}`}
                          />
                          <span className="text-sm text-white">{category}</span>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSeasonDialog({ season: null })}
                  className="bg-nxe-card border-nxe-surface text-white hover:bg-nxe-surface"
                  data-testid="button-cancel-season"
                >
                  Cancel
                </Button>
                <AdminPrimaryButton
                  type="submit"
                  loading={createSeasonMutation.isPending || updateSeasonMutation.isPending}
                  data-testid="button-save-season"
                >
                  {seasonDialog.season ? 'Update Season' : 'Create Season'}
                </AdminPrimaryButton>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent className="bg-nxe-surface border-nxe-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete {deleteDialog.type}</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete "{deleteDialog.name}"? This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-nxe-card border-nxe-surface text-white hover:bg-nxe-surface">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteDialog.type === 'season') {
                    deleteSeasonMutation.mutate(deleteDialog.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}