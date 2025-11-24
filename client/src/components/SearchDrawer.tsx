import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { logError } from '@/lib/logger';
import { Search, X, Filter, Calendar, User, MessageSquare, ArrowUpRight, Clock, ChevronDown, ChevronUp, Hash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { format } from "date-fns";
import DOMPurify from 'dompurify';
import type { MessageSearchFilters } from "@shared/schema";

interface SearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJumpToMessage?: (chatId: number, messageId: number) => void;
  currentChatId?: number;
}

interface SearchFilters extends MessageSearchFilters {
  query: string;
  messageType?: string;
}

interface SearchResult {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  messageType: string;
  createdAt: string;
  snippet?: string;
  highlight?: string;
  sender: {
    id: number;
    username: string;
    displayName: string | null;
    profilePicture: string | null;
  };
  chat: {
    id: number;
    productId: number | null;
    buyerId: number;
    sellerId: number;
  };
}

interface ChatListItem {
  id: number;
  productId: number | null;
  buyerId: number;
  sellerId: number;
  status: string;
  createdAt: string;
  otherUser: {
    id: number;
    username: string;
    displayName: string | null;
    profilePicture: string | null;
  };
  product?: {
    id: number;
    title: string;
    thumbnail: string | null;
  };
}

interface SearchHistoryItem {
  query: string;
  filters: MessageSearchFilters;
  timestamp: number;
}

const SEARCH_HISTORY_KEY = 'nxe-search-history';
const MAX_HISTORY_ITEMS = 10;

export function SearchDrawer({ open, onOpenChange, onJumpToMessage, currentChatId }: SearchDrawerProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    messageType: 'all',
    scope: currentChatId ? 'current' : 'all',
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);
  const [chatSelectorOpen, setChatSelectorOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch (e) {
        logError('Failed to parse search history', e as Error);
      }
    }
  }, []);

  // Fetch user chats for chat filter
  const { data: chatList = [] } = useQuery<ChatListItem[]>({
    queryKey: ["/api/chats"],
    enabled: open,
  });

  // Get unique users from chat list for user filter
  const uniqueUsers = chatList
    .map(chat => chat.otherUser)
    .filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(filters.query);
      
      // Save to search history when user executes a search
      if (filters.query.trim() && filters.query.length >= 2) {
        const historyItem: SearchHistoryItem = {
          query: filters.query,
          filters: {
            datePreset: filters.datePreset,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            senderIds: filters.senderIds,
            chatIds: filters.chatIds,
            scope: filters.scope,
          },
          timestamp: Date.now(),
        };
        
        const updatedHistory = [
          historyItem,
          ...searchHistory.filter(h => h.query !== filters.query),
        ].slice(0, MAX_HISTORY_ITEMS);
        
        setSearchHistory(updatedHistory);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters.query]);

  // Build query params for API
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.append('query', debouncedQuery);
    if (filters.messageType && filters.messageType !== 'all') params.append('messageType', filters.messageType);
    
    // Handle date preset
    if (filters.datePreset) {
      params.append('datePreset', filters.datePreset);
      if (filters.datePreset === 'custom' && filters.dateFrom && filters.dateTo) {
        params.append('dateFrom', filters.dateFrom);
        params.append('dateTo', filters.dateTo);
      }
    }
    
    // Handle scope
    if (filters.scope) {
      params.append('scope', filters.scope);
      if (filters.scope === 'current' && currentChatId) {
        params.append('chatId', currentChatId.toString());
      }
    }
    
    // Handle multiple sender IDs
    if (filters.senderIds && filters.senderIds.length > 0) {
      params.append('senderIds', filters.senderIds.join(','));
    }
    
    // Handle multiple chat IDs
    if (filters.chatIds && filters.chatIds.length > 0) {
      params.append('chatIds', filters.chatIds.join(','));
    }
    
    return params.toString();
  }, [debouncedQuery, filters, currentChatId]);

  // Search query
  const { data: searchResults, isLoading, isFetching } = useQuery<{
    results: SearchResult[];
    total: number;
    hasMore: boolean;
  }>({
    queryKey: ['/api/chats/search/messages', buildQueryParams()],
    queryFn: async () => {
      return apiRequest(`/api/chats/search/messages?${buildQueryParams()}`);
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30000,
  });

  const handleJumpToMessage = useCallback((chatId: number, messageId: number) => {
    if (onJumpToMessage) {
      onJumpToMessage(chatId, messageId);
      onOpenChange(false);
    }
  }, [onJumpToMessage, onOpenChange]);

  const clearSearch = () => {
    setFilters({ 
      query: '', 
      messageType: 'all',
      scope: currentChatId ? 'current' : 'all',
    });
    setDebouncedQuery('');
  };

  const useHistoryItem = (item: SearchHistoryItem) => {
    setFilters({
      query: item.query,
      messageType: 'all',
      ...item.filters,
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const removeFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => {
      const updated = { ...prev };
      delete updated[filterKey];
      return updated;
    });
  };

  const setDatePreset = (preset: 'last7' | 'last30' | 'custom') => {
    if (preset === 'custom') {
      setFilters(prev => ({ ...prev, datePreset: preset }));
    } else {
      setFilters(prev => ({ 
        ...prev, 
        datePreset: preset,
        dateFrom: undefined,
        dateTo: undefined,
      }));
    }
  };

  const toggleUserFilter = (userId: number) => {
    setFilters(prev => {
      const current = prev.senderIds || [];
      const updated = current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId];
      return { ...prev, senderIds: updated.length > 0 ? updated : undefined };
    });
  };

  const toggleChatFilter = (chatId: number) => {
    setFilters(prev => {
      const current = prev.chatIds || [];
      const updated = current.includes(chatId)
        ? current.filter(id => id !== chatId)
        : [...current, chatId];
      return { ...prev, chatIds: updated.length > 0 ? updated : undefined };
    });
  };

  // Get active filter count
  const activeFilterCount = [
    filters.datePreset,
    filters.senderIds?.length,
    filters.chatIds?.length,
    filters.scope && filters.scope !== 'all',
    filters.messageType && filters.messageType !== 'all',
  ].filter(Boolean).length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] px-0">
        <DrawerHeader className="px-4 pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold">Search Messages</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-close-search">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 space-y-3 pb-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Search messages..."
              className="pl-10 pr-10"
              data-testid="input-search-messages"
            />
            {filters.query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={clearSearch}
                data-testid="button-clear-search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full" data-testid="button-toggle-filters">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {activeFilterCount}
                  </Badge>
                )}
                {showFilters ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {/* Date Preset Buttons */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Filter
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.datePreset === 'last7' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDatePreset('last7')}
                    className="flex-1"
                    data-testid="button-date-last7"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant={filters.datePreset === 'last30' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDatePreset('last30')}
                    className="flex-1"
                    data-testid="button-date-last30"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant={filters.datePreset === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDatePreset('custom')}
                    className="flex-1"
                    data-testid="button-date-custom"
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {/* Custom Date Range */}
              {filters.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">From Date</label>
                    <Input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">To Date</label>
                    <Input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                      data-testid="input-date-to"
                    />
                  </div>
                </div>
              )}

              {/* User Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Filter by User
                </label>
                <Popover open={userSelectorOpen} onOpenChange={setUserSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      data-testid="button-user-filter"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {filters.senderIds && filters.senderIds.length > 0 
                        ? `${filters.senderIds.length} user${filters.senderIds.length > 1 ? 's' : ''} selected`
                        : 'Select users...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search users..." data-testid="input-search-users" />
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {uniqueUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => toggleUserFilter(user.id)}
                            className="flex items-center gap-2"
                            data-testid={`user-option-${user.id}`}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.profilePicture || undefined} />
                              <AvatarFallback>
                                {(user.displayName || user.username).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1">{user.displayName || user.username}</span>
                            {filters.senderIds?.includes(user.id) && (
                              <Badge variant="default" className="h-5">✓</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Chat Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Filter by Chat
                </label>
                <Popover open={chatSelectorOpen} onOpenChange={setChatSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      data-testid="button-chat-filter"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {filters.chatIds && filters.chatIds.length > 0 
                        ? `${filters.chatIds.length} chat${filters.chatIds.length > 1 ? 's' : ''} selected`
                        : 'Select chats...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search chats..." data-testid="input-search-chats" />
                      <CommandEmpty>No chats found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {chatList.map((chat) => (
                          <CommandItem
                            key={chat.id}
                            onSelect={() => toggleChatFilter(chat.id)}
                            className="flex items-center gap-2"
                            data-testid={`chat-option-${chat.id}`}
                          >
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">
                              {chat.product?.title || `Chat with ${chat.otherUser.displayName || chat.otherUser.username}`}
                            </span>
                            {filters.chatIds?.includes(chat.id) && (
                              <Badge variant="default" className="h-5">✓</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Scope Toggle - Current Chat Only */}
              {currentChatId && (
                <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
                  <Label htmlFor="scope-toggle" className="flex items-center gap-2 cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Current Chat Only</span>
                  </Label>
                  <Switch
                    id="scope-toggle"
                    checked={filters.scope === 'current'}
                    onCheckedChange={(checked) => setFilters({ ...filters, scope: checked ? 'current' : 'all' })}
                    data-testid="switch-scope-current"
                  />
                </div>
              )}

              {/* Message Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Type</label>
                <Select
                  value={filters.messageType || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, messageType: value })}
                >
                  <SelectTrigger data-testid="select-message-type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={clearSearch}
                data-testid="button-reset-filters"
              >
                Reset All Filters
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Applied Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.datePreset && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => removeFilter('datePreset')}
                  data-testid="chip-date-preset"
                >
                  {filters.datePreset === 'last7' ? 'Last 7 Days' : filters.datePreset === 'last30' ? 'Last 30 Days' : 'Custom Date'}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.senderIds && filters.senderIds.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => removeFilter('senderIds')}
                  data-testid="chip-sender-filter"
                >
                  {filters.senderIds.length} User{filters.senderIds.length > 1 ? 's' : ''}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.chatIds && filters.chatIds.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => removeFilter('chatIds')}
                  data-testid="chip-chat-filter"
                >
                  {filters.chatIds.length} Chat{filters.chatIds.length > 1 ? 's' : ''}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.scope === 'current' && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setFilters({ ...filters, scope: 'all' })}
                  data-testid="chip-scope-current"
                >
                  Current Chat Only
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.messageType && filters.messageType !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setFilters({ ...filters, messageType: 'all' })}
                  data-testid="chip-message-type"
                >
                  {filters.messageType}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Search Results */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {/* Search History */}
            {!debouncedQuery && searchHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearchHistory}
                    className="text-xs h-7"
                    data-testid="button-clear-history"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-2">
                  {searchHistory.map((item) => (
                    <div
                      key={item.timestamp}
                      className="p-2 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => useHistoryItem(item)}
                      data-testid={`history-item-${item.timestamp}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.query}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.timestamp), 'MMM d, HH:mm')}
                        </span>
                      </div>
                      {(item.filters.datePreset || item.filters.senderIds?.length || item.filters.chatIds?.length) && (
                        <div className="flex gap-1 mt-1">
                          {item.filters.datePreset && (
                            <Badge variant="outline" className="text-xs">
                              {item.filters.datePreset}
                            </Badge>
                          )}
                          {item.filters.senderIds && item.filters.senderIds.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {item.filters.senderIds.length} user{item.filters.senderIds.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {item.filters.chatIds && item.filters.chatIds.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {item.filters.chatIds.length} chat{item.filters.chatIds.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {(isLoading || isFetching) && debouncedQuery && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 p-3 border rounded-lg">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Search Results */}
            {!isLoading && searchResults?.results && searchResults.results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Found {searchResults.total} result{searchResults.total !== 1 ? 's' : ''}
                </p>
                {searchResults.results.map((result: SearchResult) => (
                  <div
                    key={result.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer space-y-2"
                    onClick={() => handleJumpToMessage(result.chatId, result.id)}
                    data-testid={`result-${result.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {result.sender.displayName || result.sender.username}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {result.messageType}
                          </Badge>
                        </div>
                        <p
                          className="text-sm text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(result.snippet || result.content, {
                              ALLOWED_TAGS: ['b', 'mark'],
                              ALLOWED_ATTR: []
                            })
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(result.createdAt), 'MMM d, HH:mm')}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}

                {searchResults.hasMore && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Scroll to load more results
                  </p>
                )}
              </div>
            )}

            {/* No Results */}
            {!isLoading && debouncedQuery && searchResults?.results?.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No messages found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </div>
            )}

            {/* Empty State */}
            {!debouncedQuery && searchHistory.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Start typing to search messages</p>
                <p className="text-xs text-muted-foreground mt-1">Search across all your conversations</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
