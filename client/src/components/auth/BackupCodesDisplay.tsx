import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Copy, Download, Printer, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackupCodesDisplayProps {
  codes: string[];
  onClose?: () => void;
}

export function BackupCodesDisplay({ codes, onClose }: BackupCodesDisplayProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const codesText = codes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: "Berhasil",
      description: "Semua kode backup telah disalin ke clipboard",
    });
  };

  const handleDownload = () => {
    const codesText = codes.join('\n');
    const blob = new Blob([`NubiluXchange 2FA Backup Codes\n\n${codesText}\n\nSetiap kode hanya bisa digunakan sekali.\nSimpan kode ini di tempat yang aman.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nubiluxchange-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Berhasil",
      description: "Kode backup telah diunduh",
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NubiluXchange 2FA Backup Codes</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #8B5CF6;
              margin-bottom: 10px;
            }
            .warning {
              background: #FEF3C7;
              border-left: 4px solid #F59E0B;
              padding: 16px;
              margin: 20px 0;
            }
            .codes {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin: 20px 0;
            }
            .code {
              background: #F3F4F6;
              padding: 12px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 16px;
              text-align: center;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #6B7280;
            }
          </style>
        </head>
        <body>
          <h1>NubiluXchange 2FA Backup Codes</h1>
          <p>Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
          
          <div class="warning">
            <strong>⚠️ Peringatan Penting:</strong>
            <ul>
              <li>Setiap kode hanya bisa digunakan sekali</li>
              <li>Simpan kode ini di tempat yang aman</li>
              <li>Jangan bagikan kode ini kepada siapa pun</li>
            </ul>
          </div>
          
          <div class="codes">
            ${codes.map(code => `<div class="code">${code}</div>`).join('')}
          </div>
          
          <div class="footer">
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-yellow-500/10 border-yellow-500/50" data-testid="alert-backup-codes-warning">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-yellow-700 dark:text-yellow-400">
          <strong>Peringatan:</strong> Setiap kode hanya bisa digunakan sekali. Simpan kode ini di tempat yang aman dan jangan bagikan kepada siapa pun.
        </AlertDescription>
      </Alert>

      <Card className="p-4 bg-nxe-card border-nxe-surface" data-testid="card-backup-codes">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {codes.map((code, index) => (
            <div
              key={index}
              className="p-3 bg-nxe-surface rounded-lg font-mono text-sm text-center font-semibold text-white"
              data-testid={`text-backup-code-${index}`}
            >
              {code}
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleCopy}
          variant="outline"
          className="flex-1"
          data-testid="button-copy-codes"
        >
          <Copy className="h-4 w-4 mr-2" />
          Salin Semua
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1"
          data-testid="button-download-codes"
        >
          <Download className="h-4 w-4 mr-2" />
          Unduh
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex-1"
          data-testid="button-print-codes"
        >
          <Printer className="h-4 w-4 mr-2" />
          Cetak
        </Button>
      </div>

      {onClose && (
        <Button
          onClick={onClose}
          className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
          data-testid="button-close-backup-codes"
        >
          Saya Sudah Menyimpan Kode
        </Button>
      )}
    </div>
  );
}
