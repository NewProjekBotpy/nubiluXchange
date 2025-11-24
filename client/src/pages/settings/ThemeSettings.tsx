import { useState, useEffect } from "react";
import { ChevronRight, Palette, Sun, Moon, Monitor, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/App";

export default function ThemeSettings() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [accentColor, setAccentColor] = useState('#134D37');
  const [fontSize, setFontSize] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const themeOptions = [
    {
      id: 'light',
      name: 'Terang',
      description: 'Tampilan terang untuk siang hari',
      icon: <Sun className="h-5 w-5" />,
      preview: 'from-gray-100 to-white'
    },
    {
      id: 'dark',
      name: 'Gelap',
      description: 'Tampilan gelap untuk mata yang nyaman',
      icon: <Moon className="h-5 w-5" />,
      preview: 'from-gray-800 to-black'
    },
    {
      id: 'auto',
      name: 'Otomatis',
      description: 'Mengikuti pengaturan sistem',
      icon: <Monitor className="h-5 w-5" />,
      preview: 'from-blue-400 to-purple-500'
    }
  ];

  const accentColors = [
    { name: 'Hijau (Default)', value: '#134D37', class: 'bg-nxe-primary' },
    { name: 'Biru', value: '#1E40AF', class: 'bg-blue-600' },
    { name: 'Ungu', value: '#7C3AED', class: 'bg-purple-600' },
    { name: 'Pink', value: '#DB2777', class: 'bg-pink-600' },
    { name: 'Orange', value: '#EA580C', class: 'bg-orange-600' },
    { name: 'Merah', value: '#DC2626', class: 'bg-red-600' },
  ];

  const fontSizes = [
    { id: 'small', name: 'Kecil', class: 'text-sm' },
    { id: 'medium', name: 'Sedang', class: 'text-base' },
    { id: 'large', name: 'Besar', class: 'text-lg' },
  ];

  // Load additional settings from localStorage on component mount
  useEffect(() => {
    const savedAccentColor = localStorage.getItem('accentColor') || '#134D37';
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    const savedCompactMode = localStorage.getItem('compactMode') === 'true';
    const savedAnimationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';

    setAccentColor(savedAccentColor);
    setFontSize(savedFontSize);
    setCompactMode(savedCompactMode);
    setAnimationsEnabled(savedAnimationsEnabled);
  }, []);

  const handleSaveSettings = () => {
    // Save additional settings to localStorage
    localStorage.setItem('accentColor', accentColor);
    localStorage.setItem('fontSize', fontSize);
    localStorage.setItem('compactMode', compactMode.toString());
    localStorage.setItem('animationsEnabled', animationsEnabled.toString());

    // Apply CSS custom properties for accent color
    document.documentElement.style.setProperty('--accent-color', accentColor);
    
    toast({
      title: "Pengaturan tema tersimpan",
      description: "Perubahan tema telah diterapkan dan tersimpan.",
    });
  };

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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tema</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      <div className="space-y-6">
        {/* Theme Selection */}
        <Card className="bg-nxe-card border-nxe-surface/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg flex items-center space-x-2">
              <div className="text-nxe-primary">
                <Palette className="h-5 w-5" />
              </div>
              <span>Mode Tampilan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {themeOptions.map(option => (
              <button
                key={option.id}
                onClick={() => {
                  setTheme(option.id as 'light' | 'dark' | 'auto');
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center space-x-4 ${
                  option.id === theme
                    ? 'border-nxe-primary bg-nxe-primary/10' 
                    : 'border-nxe-border bg-nxe-surface/50 hover:border-nxe-primary/50'
                }`}
                data-testid={`theme-option-${option.id}`}
              >
                <div className="flex-shrink-0">
                  <div className={`w-12 h-8 rounded-md bg-gradient-to-br ${option.preview} border border-white/20`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="text-nxe-primary">{option.icon}</div>
                    <h3 className="text-white font-medium">{option.name}</h3>
                  </div>
                  <p className="text-gray-400 text-sm">{option.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  option.id === theme
                    ? 'border-nxe-primary bg-nxe-primary' 
                    : 'border-gray-400'
                }`} />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Accent Color */}
        <Card className="bg-nxe-card border-nxe-surface/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg flex items-center space-x-2">
              <div className="text-nxe-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <span>Warna Aksen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {accentColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accentColor === color.value
                      ? 'border-white bg-gray-700/50' 
                      : 'border-nxe-border hover:border-gray-500'
                  }`}
                  data-testid={`accent-color-${color.value}`}
                >
                  <div className={`w-8 h-8 rounded-full ${color.class} mx-auto mb-2`} />
                  <p className="text-white text-xs text-center">{color.name}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Font Size */}
        <Card className="bg-nxe-card border-nxe-surface/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Ukuran Font</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fontSizes.map(size => (
              <button
                key={size.id}
                onClick={() => setFontSize(size.id)}
                className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                  fontSize === size.id
                    ? 'border-nxe-primary bg-nxe-primary/10' 
                    : 'border-nxe-border bg-nxe-surface/50 hover:border-nxe-primary/50'
                }`}
                data-testid={`font-size-${size.id}`}
              >
                <span className={`text-white font-medium ${size.class}`}>{size.name}</span>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  fontSize === size.id
                    ? 'border-nxe-primary bg-nxe-primary' 
                    : 'border-gray-400'
                }`} />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Additional Options */}
        <Card className="bg-nxe-card border-nxe-surface/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Pengaturan Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-white font-medium">Mode Kompak</Label>
                <p className="text-sm text-gray-400 mt-1">Tampilkan lebih banyak konten dalam layar</p>
              </div>
              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${
                  compactMode ? 'bg-nxe-primary' : 'bg-gray-600'
                }`}
                data-testid="toggle-compact-mode"
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  compactMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-white font-medium">Animasi</Label>
                <p className="text-sm text-gray-400 mt-1">Aktifkan animasi transisi dan efek visual</p>
              </div>
              <button
                onClick={() => setAnimationsEnabled(!animationsEnabled)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${
                  animationsEnabled ? 'bg-nxe-primary' : 'bg-gray-600'
                }`}
                data-testid="toggle-animations"
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSaveSettings}
          className="w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white py-3 font-semibold"
          data-testid="button-save-theme"
        >
          Terapkan Pengaturan Tema
        </Button>
      </div>
    </div>
  );
}