import { ArrowLeft, Bell, MessageSquare, ShoppingCart, Heart, Trophy } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function NotificationPreferences() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    messages: true,
    orders: true,
    likes: false,
    follows: true,
    achievements: true,
    promotions: false,
    pushNotifications: true,
    emailNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true
  });

  const notificationTypes = [
    {
      id: 'messages',
      title: 'Pesan Baru',
      description: 'Notifikasi saat ada pesan masuk',
      icon: MessageSquare,
      category: 'chat'
    },
    {
      id: 'orders',
      title: 'Pesanan & Transaksi',
      description: 'Update status pesanan dan pembayaran',
      icon: ShoppingCart,
      category: 'transaction'
    },
    {
      id: 'likes',
      title: 'Like & Reaksi',
      description: 'Saat seseorang menyukai produk Anda',
      icon: Heart,
      category: 'social'
    },
    {
      id: 'follows',
      title: 'Pengikut Baru',
      description: 'Notifikasi pengikut dan subscriber baru',
      icon: Trophy,
      category: 'social'
    },
    {
      id: 'achievements',
      title: 'Pencapaian',
      description: 'Badge dan reward yang didapat',
      icon: Trophy,
      category: 'achievement'
    },
    {
      id: 'promotions',
      title: 'Promosi & Penawaran',
      description: 'Diskon dan penawaran khusus',
      icon: Bell,
      category: 'marketing'
    }
  ];

  const togglePreference = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof preferences]
    }));
  };

  const savePreferences = () => {
    // Save to API
    toast({
      title: "Berhasil",
      description: "Preferensi notifikasi tersimpan!",
    });
  };

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Header */}
      <div className="sticky top-0 bg-nxe-surface border-b border-nxe-border z-10">
        <div className="flex items-center px-4 py-4">
          <button 
            onClick={() => setLocation('/settings')}
            className="p-2 hover:bg-nxe-card rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-nxe-text" />
          </button>
          <h1 className="text-lg font-semibold text-nxe-text ml-3">Preferensi Notifikasi</h1>
        </div>
      </div>

      <div className="p-6">
        {/* General Settings - Simplified */}
        <div className="mb-6">
          <h2 className="text-base text-nxe-text mb-3">Pengaturan Umum</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-nxe-text">Push Notifications</span>
              <button
                onClick={() => togglePreference('pushNotifications')}
                className={`w-9 h-5 rounded-full transition-colors ${
                  preferences.pushNotifications ? 'bg-nxe-primary' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.pushNotifications ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-nxe-text">Email Notifications</span>
              <button
                onClick={() => togglePreference('emailNotifications')}
                className={`w-9 h-5 rounded-full transition-colors ${
                  preferences.emailNotifications ? 'bg-nxe-primary' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.emailNotifications ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-nxe-text">Suara</span>
              <button
                onClick={() => togglePreference('soundEnabled')}
                className={`w-9 h-5 rounded-full transition-colors ${
                  preferences.soundEnabled ? 'bg-nxe-primary' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-nxe-text">Getaran</span>
              <button
                onClick={() => togglePreference('vibrationEnabled')}
                className={`w-9 h-5 rounded-full transition-colors ${
                  preferences.vibrationEnabled ? 'bg-nxe-primary' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.vibrationEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Notification Types - Simplified */}
        <div>
          <h2 className="text-base text-nxe-text mb-3">Jenis Notifikasi</h2>
          <div className="space-y-2">
            {notificationTypes.map((type) => {
              const isEnabled = preferences[type.id as keyof typeof preferences];
              
              return (
                <div key={type.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-nxe-text">{type.title}</span>
                  <button
                    onClick={() => togglePreference(type.id)}
                    className={`w-9 h-5 rounded-full transition-colors ${
                      isEnabled ? 'bg-nxe-primary' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={savePreferences}
            className="w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white py-3 px-6 rounded-xl font-medium transition-colors"
          >
            Simpan Preferensi
          </button>
        </div>
      </div>
    </div>
  );
}