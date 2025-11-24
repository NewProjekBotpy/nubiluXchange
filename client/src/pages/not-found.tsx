import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-nxe-dark">
      <Card className="w-full max-w-md mx-4 bg-nxe-card border-nxe-surface">
        <CardContent className="pt-6">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white text-center mb-2">404 - Halaman Tidak Ditemukan</h1>

          <p className="mt-4 text-sm text-gray-400 text-center mb-6">
            Halaman yang Anda cari tidak ditemukan atau mungkin telah dipindahkan.
          </p>

          <Button 
            onClick={() => setLocation("/")}
            className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
