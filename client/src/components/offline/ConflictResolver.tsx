import { useState, useEffect } from 'react';
import { logError } from '@/lib/logger';
import { conflictResolution, ConflictData } from '@/lib/conflict-resolution';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Server, Smartphone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConflictResolverProps {
  open: boolean;
  onClose: () => void;
}

export function ConflictResolver({ open, onClose }: ConflictResolverProps) {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (open) {
      loadConflicts();
    }
  }, [open]);

  const loadConflicts = () => {
    const pending = conflictResolution.getPendingConflicts();
    setConflicts(pending);
    if (pending.length > 0 && !selectedConflict) {
      setSelectedConflict(pending[0]);
    }
  };

  const handleResolve = async (resolution: 'local' | 'server') => {
    if (!selectedConflict) return;

    setResolving(true);
    try {
      conflictResolution.manualResolve(selectedConflict.id, resolution);
      
      // Reload conflicts
      const remaining = conflictResolution.getPendingConflicts();
      setConflicts(remaining);
      
      if (remaining.length > 0) {
        setSelectedConflict(remaining[0]);
      } else {
        setSelectedConflict(null);
        onClose();
      }
    } catch (error) {
      logError('[ConflictResolver] Resolution failed', error as Error);
    } finally {
      setResolving(false);
    }
  };

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-conflict-resolver">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-conflict-title">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Resolusi Konflik
          </DialogTitle>
          <DialogDescription data-testid="text-conflict-description">
            {conflicts.length} konflik memerlukan perhatian Anda
          </DialogDescription>
        </DialogHeader>

        {conflicts.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium" data-testid="text-no-conflicts">
              Tidak ada konflik
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-no-conflicts-subtitle">
              Semua data telah disinkronkan dengan sukses
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* Conflict List */}
            <div className="col-span-1 border-r pr-4">
              <h3 className="text-sm font-semibold mb-2" data-testid="text-conflicts-list-title">
                Daftar Konflik
              </h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <button
                      key={conflict.id}
                      onClick={() => setSelectedConflict(conflict)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        selectedConflict?.id === conflict.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent"
                      )}
                      data-testid={`button-conflict-${conflict.id}`}
                    >
                      <p className="text-sm font-medium" data-testid={`text-conflict-type-${conflict.id}`}>
                        {conflict.entityType}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-conflict-fields-${conflict.id}`}>
                        {conflict.conflictedFields.length} field(s)
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Conflict Details */}
            <div className="col-span-2">
              {selectedConflict ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2" data-testid="text-selected-conflict-title">
                      {selectedConflict.entityType}
                    </h3>
                    <div className="flex gap-2">
                      {selectedConflict.conflictedFields.map((field) => (
                        <Badge key={field} variant="outline" data-testid={`badge-field-${field}`}>
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Local Version */}
                    <Card className="border-blue-200" data-testid="card-local-version">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Versi Lokal
                        </CardTitle>
                        <CardDescription className="text-xs" data-testid="text-local-timestamp">
                          {new Date(selectedConflict.localTimestamp).toLocaleString('id-ID')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[250px]">
                          <div className="space-y-2">
                            {selectedConflict.conflictedFields.map((field) => (
                              <div key={field} className="p-2 bg-blue-50 dark:bg-blue-950 rounded" data-testid={`local-field-${field}`}>
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{field}</p>
                                <p className="text-xs mt-1 font-mono break-all" data-testid={`local-value-${field}`}>
                                  {renderValue(selectedConflict.localVersion[field])}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Server Version */}
                    <Card className="border-green-200" data-testid="card-server-version">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Versi Server
                        </CardTitle>
                        <CardDescription className="text-xs" data-testid="text-server-timestamp">
                          {new Date(selectedConflict.serverTimestamp).toLocaleString('id-ID')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[250px]">
                          <div className="space-y-2">
                            {selectedConflict.conflictedFields.map((field) => (
                              <div key={field} className="p-2 bg-green-50 dark:bg-green-950 rounded" data-testid={`server-field-${field}`}>
                                <p className="text-xs font-semibold text-green-700 dark:text-green-300">{field}</p>
                                <p className="text-xs mt-1 font-mono break-all" data-testid={`server-value-${field}`}>
                                  {renderValue(selectedConflict.serverVersion[field])}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Resolution Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => handleResolve('local')}
                      disabled={resolving}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-resolve-local"
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Gunakan Lokal
                    </Button>
                    <Button
                      onClick={() => handleResolve('server')}
                      disabled={resolving}
                      className="flex-1"
                      data-testid="button-resolve-server"
                    >
                      <Server className="h-4 w-4 mr-2" />
                      Gunakan Server
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground" data-testid="text-select-conflict">
                    Pilih konflik untuk melihat detail
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} variant="outline" data-testid="button-close-resolver">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Audit Trail Component
export function ConflictAuditTrail() {
  const [history, setHistory] = useState<ConflictData[]>([]);

  useEffect(() => {
    const conflictHistory = conflictResolution.getConflictHistory();
    setHistory(conflictHistory);
  }, []);

  return (
    <Card data-testid="card-conflict-audit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Riwayat Konflik
        </CardTitle>
        <CardDescription data-testid="text-audit-description">
          Catatan konflik yang telah diselesaikan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-history">
              Belum ada riwayat konflik
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((conflict) => (
                <div
                  key={conflict.id}
                  className="p-3 border rounded-lg"
                  data-testid={`history-item-${conflict.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium" data-testid={`history-type-${conflict.id}`}>
                        {conflict.entityType}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`history-time-${conflict.id}`}>
                        {new Date(conflict.localTimestamp).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Badge variant="secondary" data-testid={`history-fields-${conflict.id}`}>
                      {conflict.conflictedFields.length} field(s)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
