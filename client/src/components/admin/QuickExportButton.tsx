import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Download, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useDataExport } from '@/hooks/useDataExport';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@shared/auth-utils';

interface QuickExportButtonProps {
  data?: any[];
  reportName?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showDropdown?: boolean;
}

export function QuickExportButton({
  data,
  reportName = 'data',
  className,
  variant = 'outline',
  size = 'sm',
  showDropdown = true
}: QuickExportButtonProps) {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { 
    exportUsers, 
    exportActivityLogs, 
    exportSystemStats, 
    exportCustomData,
    downloadFile,
    generateCSV,
    generateFilename
  } = useDataExport();

  const handleQuickExport = async (format: 'csv' | 'pdf' = 'csv') => {
    if (data && data.length > 0) {
      // Export provided data
      setIsExporting(true);
      try {
        await exportCustomData(data, reportName, { format });
      } finally {
        setIsExporting(false);
      }
    } else {
      // Quick export of current page data
      setIsExporting(true);
      try {
        await exportSystemStats({ format });
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handleSpecificExport = async (type: string, format: 'csv' | 'pdf' = 'csv') => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'users':
          await exportUsers({ format });
          break;
        case 'activities':
          await exportActivityLogs({ format });
          break;
        case 'stats':
          await exportSystemStats({ format });
          break;
        default:
          await handleQuickExport(format);
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!showDropdown) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleQuickExport('csv')}
        disabled={isExporting}
        className={cn('transition-modern', className)}
        data-testid="quick-export-button"
      >
        {isExporting ? (
          <Download className="h-4 w-4 animate-bounce" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {size !== 'sm' && (
          <span className="ml-2">
            {isExporting ? 'Exporting...' : 'Export'}
          </span>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isExporting}
          className={cn('transition-modern', className)}
          data-testid="export-dropdown-trigger"
        >
          {isExporting ? (
            <Download className="h-4 w-4 animate-bounce" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {size !== 'sm' && (
            <>
              <span className="ml-2">Export</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </>
          )}
          {size === 'sm' && <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="modern-glass w-48">
        {/* Quick Exports */}
        {data && data.length > 0 ? (
          <>
            <DropdownMenuItem 
              onClick={() => handleQuickExport('csv')}
              data-testid="export-current-csv"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Current (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleQuickExport('pdf')}
              data-testid="export-current-pdf"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Current (PDF)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}

        {/* Admin-specific exports */}
        {hasAdminAccess(user) && (
          <>
            <DropdownMenuItem 
              onClick={() => handleSpecificExport('users', 'csv')}
              data-testid="export-users-csv"
            >
              <FileText className="h-4 w-4 mr-2" />
              User Report (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleSpecificExport('activities', 'csv')}
              data-testid="export-activities-csv"
            >
              <FileText className="h-4 w-4 mr-2" />
              Activity Logs (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleSpecificExport('stats', 'csv')}
              data-testid="export-stats-csv"
            >
              <FileText className="h-4 w-4 mr-2" />
              System Stats (CSV)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for toolbars
export function CompactExportButton(props: Omit<QuickExportButtonProps, 'size' | 'showDropdown'>) {
  return (
    <QuickExportButton
      {...props}
      size="sm"
      showDropdown={false}
    />
  );
}

// Enhanced version with more options
export function EnhancedExportButton(props: Omit<QuickExportButtonProps, 'size' | 'variant'>) {
  return (
    <QuickExportButton
      {...props}
      size="default"
      variant="outline"
      showDropdown={true}
    />
  );
}