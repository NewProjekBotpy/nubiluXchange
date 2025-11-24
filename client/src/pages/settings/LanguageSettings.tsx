import { useState, useEffect } from "react";
import { ChevronRight, Globe, Check, DollarSign, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RegionalSettings } from "@shared/schema";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isAvailable: boolean;
}

export default function LanguageSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'id';
  });
  const [localSettings, setLocalSettings] = useState({
    language: 'id',
    currencyFormat: 'IDR',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Jakarta',
  });

  // Fetch regional settings
  const { data: regionalSettings, isLoading } = useQuery<RegionalSettings>({
    queryKey: ['/api/regional'],
  });

  // Update regional settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: typeof localSettings) => {
      return await apiRequest('/api/regional', {
        method: 'PUT',
        body: settings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/regional'] });
      toast({
        title: "Pengaturan berhasil disimpan",
        description: "Pengaturan bahasa dan regional telah diperbarui.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan pengaturan.",
        variant: "destructive",
      });
    },
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (regionalSettings) {
      const settings = {
        language: regionalSettings.language || 'id',
        currencyFormat: regionalSettings.currencyFormat || 'IDR',
        dateFormat: regionalSettings.dateFormat || 'DD/MM/YYYY',
        timezone: regionalSettings.timezone || 'Asia/Jakarta',
      };
      setLocalSettings(settings);
      setSelectedLanguage(settings.language);
    }
  }, [regionalSettings]);

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const languages: Language[] = [
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', isAvailable: true },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isAvailable: true },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', isAvailable: true },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', isAvailable: true },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', isAvailable: true },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', isAvailable: false },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', isAvailable: false },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', isAvailable: false }
  ];

  const currencies = [
    { code: 'IDR', name: 'Rupiah Indonesia', symbol: 'Rp' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'MYR', name: 'Ringgit Malaysia', symbol: 'RM' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  ];

  const dateFormats = [
    { code: 'DD/MM/YYYY', example: '31/12/2024' },
    { code: 'MM/DD/YYYY', example: '12/31/2024' },
    { code: 'YYYY-MM-DD', example: '2024-12-31' },
  ];

  const timezones = [
    { code: 'Asia/Jakarta', name: 'WIB (GMT+7)' },
    { code: 'Asia/Makassar', name: 'WITA (GMT+8)' },
    { code: 'Asia/Jayapura', name: 'WIT (GMT+9)' },
    { code: 'Asia/Singapore', name: 'Singapore (GMT+8)' },
    { code: 'Asia/Bangkok', name: 'Bangkok (GMT+7)' },
  ];

  const handleLanguageSelect = (languageCode: string) => {
    const language = languages.find(l => l.code === languageCode);
    if (!language?.isAvailable) {
      toast({
        title: "Bahasa belum tersedia",
        description: "Bahasa ini sedang dalam pengembangan dan akan tersedia segera.",
        variant: "destructive"
      });
      return;
    }

    setSelectedLanguage(languageCode);
    setLocalSettings(prev => ({ ...prev, language: languageCode }));
    localStorage.setItem('selectedLanguage', languageCode);
  };

  const handleApplyLanguage = () => {
    updateSettingsMutation.mutate(localSettings);
  };

  const availableLanguages = languages.filter(lang => lang.isAvailable);
  const upcomingLanguages = languages.filter(lang => !lang.isAvailable);

  if (isLoading) {
    return (
      <div className="mobile-viewport-fix keyboard-smooth bg-white dark:bg-nxe-dark text-gray-900 dark:text-white px-4 py-6 pb-24">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Memuat pengaturan bahasa...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-viewport-fix keyboard-smooth bg-white dark:bg-nxe-dark text-gray-900 dark:text-white px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handleBackClick}
          className="text-nxe-text hover:text-nxe-primary transition-colors duration-200"
          data-testid="button-back"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Bahasa</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Language Selection */}
      <Card className="bg-white dark:bg-nxe-card border-gray-200 dark:border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <Globe className="h-6 w-6 text-nxe-primary" />
            <CardTitle className="text-gray-900 dark:text-white text-lg">Pilih Bahasa</CardTitle>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Bahasa yang tersedia untuk aplikasi
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {availableLanguages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedLanguage === language.code
                  ? 'border-nxe-primary bg-nxe-primary/10'
                  : 'border-gray-200 dark:border-nxe-border bg-gray-50 dark:bg-nxe-surface hover:border-nxe-primary/50'
              }`}
              data-testid={`language-${language.code}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{language.flag}</span>
                  <div className="text-left">
                    <div className="text-gray-900 dark:text-white font-medium">{language.nativeName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{language.name}</div>
                  </div>
                </div>
                {selectedLanguage === language.code && (
                  <Check className="h-6 w-6 text-nxe-primary" />
                )}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="bg-white dark:bg-nxe-card border-gray-200 dark:border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900 dark:text-white text-lg">Pengaturan Regional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Currency Format */}
          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Format Mata Uang</span>
            </Label>
            <Select
              value={localSettings.currencyFormat}
              onValueChange={(value) => setLocalSettings(prev => ({ ...prev, currencyFormat: value }))}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-nxe-surface border-gray-200 dark:border-nxe-border text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-nxe-surface border-gray-200 dark:border-nxe-border text-gray-900 dark:text-white">
                {currencies.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Format */}
          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Format Tanggal</span>
            </Label>
            <Select
              value={localSettings.dateFormat}
              onValueChange={(value) => setLocalSettings(prev => ({ ...prev, dateFormat: value }))}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-nxe-surface border-gray-200 dark:border-nxe-border text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-nxe-surface border-gray-200 dark:border-nxe-border text-gray-900 dark:text-white">
                {dateFormats.map(format => (
                  <SelectItem key={format.code} value={format.code}>
                    {format.code} ({format.example})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Zona Waktu</span>
            </Label>
            <Select
              value={localSettings.timezone}
              onValueChange={(value) => setLocalSettings(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-nxe-surface border-gray-200 dark:border-nxe-border text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-nxe-surface border-gray-200 dark:border-nxe-border text-gray-900 dark:text-white">
                {timezones.map(tz => (
                  <SelectItem key={tz.code} value={tz.code}>
                    {tz.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Languages */}
      {upcomingLanguages.length > 0 && (
        <Card className="bg-white dark:bg-nxe-card border-gray-200 dark:border-nxe-surface/30 mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-lg">Bahasa yang Akan Datang</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Bahasa dalam pengembangan
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingLanguages.map((language) => (
              <div
                key={language.code}
                className="p-4 rounded-lg border border-gray-200 dark:border-nxe-border bg-gray-50 dark:bg-nxe-surface/50 opacity-60"
                data-testid={`language-upcoming-${language.code}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{language.flag}</span>
                  <div>
                    <div className="text-gray-900 dark:text-white font-medium">{language.nativeName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{language.name} - Segera hadir</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Apply Button */}
      <Button
        onClick={handleApplyLanguage}
        disabled={updateSettingsMutation.isPending}
        className="w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white font-medium py-3"
        data-testid="button-apply-language"
      >
        {updateSettingsMutation.isPending ? "Menyimpan..." : "Terapkan Bahasa"}
      </Button>
    </div>
  );
}
