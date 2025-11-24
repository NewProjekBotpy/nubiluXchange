import { Bot, Power, PowerOff, Settings, Palette, MessageSquare, Zap, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TouchButton } from "@/components/admin";
import { useAdminPanel } from "@/features/admin";
import { useQuery } from "@tanstack/react-query";

interface AIAdminTabProps {
  hasAdminAccess?: boolean;
}

export default function AIAdminTab({ hasAdminAccess = false }: AIAdminTabProps) {
  const { aiSettings, setAiSettings } = useAdminPanel();

  const { data: activityLogs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/activity-logs'],
    enabled: hasAdminAccess,
  });

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const aiActivityLogs = activityLogs
    .filter(log => log.category === 'ai_action')
    .slice(0, 5)
    .map(log => ({
      ...log,
      statusColor: log.status === 'success' ? 'bg-green-400' : 
                   log.status === 'error' ? 'bg-red-400' : 
                   log.status === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
    }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">AI Admin Settings</h3>
        <div className="flex items-center gap-2">
          <TouchButton
            onClick={() => setAiSettings({ ...aiSettings, isActive: !aiSettings.isActive })}
            variant={aiSettings.isActive ? "default" : "outline"}
            size="sm"
            icon={aiSettings.isActive ? Power : PowerOff}
            className={aiSettings.isActive ? "bg-green-600 hover:bg-green-700 text-white" : "border-nxe-surface text-gray-300"}
            data-testid="button-toggle-ai"
          >
            {aiSettings.isActive ? 'Active' : 'Inactive'}
          </TouchButton>
        </div>
      </div>

      <Card className="bg-nxe-surface border-nxe-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {aiSettings.isActive ? '🟢' : '🔴'}
              </div>
              <p className="text-sm text-gray-400">AI Status</p>
              <p className="text-xs text-gray-500 mt-1">
                {aiSettings.isActive ? 'All AI features operational' : 'AI features disabled'}
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-nxe-primary mb-1">
                {aiSettings.posterGeneration ? '✅' : '❌'}
              </div>
              <p className="text-sm text-gray-400">Poster Generation</p>
              <p className="text-xs text-gray-500 mt-1">
                {aiSettings.posterGeneration ? 'DALL-E enabled' : 'Disabled'}
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {aiSettings.chatModeration ? '🤖' : '💤'}
              </div>
              <p className="text-sm text-gray-400">Chat Moderation</p>
              <p className="text-xs text-gray-500 mt-1">
                {aiSettings.chatModeration ? 'DeepSeek active' : 'Manual only'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-nxe-surface border-nxe-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Poster Generation (OpenAI DALL-E)
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Enable AI Poster Generation</p>
                <p className="text-gray-400 text-xs">Auto-generate promotional posters for gaming accounts</p>
              </div>
              <Switch
                checked={aiSettings.posterGeneration}
                onCheckedChange={(checked) => setAiSettings({ ...aiSettings, posterGeneration: checked })}
                disabled={!aiSettings.isActive}
              />
            </div>
          </div>

          <Separator className="bg-nxe-surface" />

          <div className="space-y-4">
            <h4 className="text-white font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Moderation (DeepSeek)
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Enable Chat Moderation</p>
                  <p className="text-gray-400 text-xs">AI monitors and responds to @admin mentions</p>
                </div>
                <Switch
                  checked={aiSettings.chatModeration}
                  onCheckedChange={(checked) => setAiSettings({ ...aiSettings, chatModeration: checked })}
                  disabled={!aiSettings.isActive}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Auto Response</p>
                  <p className="text-gray-400 text-xs">Automatically respond to common queries</p>
                </div>
                <Switch
                  checked={aiSettings.autoRespond}
                  onCheckedChange={(checked) => setAiSettings({ ...aiSettings, autoRespond: checked })}
                  disabled={!aiSettings.isActive || !aiSettings.chatModeration}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-nxe-surface" />

          <div className="space-y-4">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Advanced Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm mb-2 block">Model</Label>
                <select 
                  value={aiSettings.deepseekModel} 
                  onChange={(e) => setAiSettings({ ...aiSettings, deepseekModel: e.target.value })}
                  className="w-full px-3 py-2 bg-nxe-surface border border-nxe-surface rounded-md text-white"
                  disabled={!aiSettings.isActive}
                  data-testid="select-ai-model"
                >
                  <option value="deepseek-chat">DeepSeek Chat</option>
                  <option value="deepseek-coder">DeepSeek Coder</option>
                </select>
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Response Delay (ms)</Label>
                <Input
                  type="number"
                  value={aiSettings.responseDelay}
                  onChange={(e) => setAiSettings({ ...aiSettings, responseDelay: parseInt(e.target.value) || 1000 })}
                  className="bg-nxe-surface border-nxe-surface text-white"
                  disabled={!aiSettings.isActive}
                  min="500"
                  max="5000"
                  step="100"
                  data-testid="input-response-delay"
                />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Max Tokens</Label>
                <Input
                  type="number"
                  value={aiSettings.maxTokens}
                  onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value) || 1000 })}
                  className="bg-nxe-surface border-nxe-surface text-white"
                  disabled={!aiSettings.isActive}
                  min="100"
                  max="4000"
                  step="100"
                  data-testid="input-max-tokens"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-nxe-surface border-nxe-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent AI Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3 bg-nxe-surface rounded-lg animate-pulse">
                  <div className="h-4 bg-nxe-dark/50 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-nxe-dark/50 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : aiActivityLogs.length > 0 ? (
            <div className="space-y-3">
              {aiActivityLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-nxe-surface rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 ${log.statusColor} rounded-full`}></div>
                    <div>
                      <p className="text-white text-sm">{log.action}</p>
                      <p className="text-gray-400 text-xs">
                        {log.details.description || JSON.stringify(log.details).slice(0, 50)}
                      </p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs">{formatRelativeTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">No AI activity logs found</p>
              <p className="text-gray-500 text-xs mt-1">AI actions will appear here when the AI admin is active</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
