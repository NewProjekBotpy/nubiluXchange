import { useState, useEffect } from "react";
import { ChevronRight, MessageSquare, Star, Send, Bug, Lightbulb, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserFeedback } from "@shared/schema";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface FeedbackForm {
  category: string;
  rating: number;
  message: string;
}

export default function Feedback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRating, setSelectedRating] = useState(0);

  const form = useForm<FeedbackForm>({
    defaultValues: {
      category: '',
      rating: 0,
      message: ''
    }
  });

  // Fetch recent feedback
  const { data: recentFeedback = [], isLoading } = useQuery<UserFeedback[]>({
    queryKey: ['/api/feedback'],
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackForm) => {
      return await apiRequest('/api/feedback', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      toast({
        title: "Feedback terkirim",
        description: "Terima kasih atas masukan Anda! Tim kami akan meninjaunya segera.",
      });
      form.reset();
      setSelectedRating(0);
    },
    onError: () => {
      toast({
        title: "Gagal mengirim feedback",
        description: "Terjadi kesalahan saat mengirim feedback. Silakan coba lagi.",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const onSubmit = (data: FeedbackForm) => {
    if (!data.category || !data.rating || !data.message) {
      toast({
        title: "Data tidak lengkap",
        description: "Silakan isi semua field yang diperlukan.",
        variant: "destructive",
      });
      return;
    }
    submitFeedbackMutation.mutate(data);
  };

  const feedbackCategories = [
    { value: "bug", label: "Bug Report", icon: Bug, description: "Laporkan masalah atau error" },
    { value: "feature", label: "Saran Fitur", icon: Lightbulb, description: "Usulkan fitur baru" },
    { value: "improvement", label: "Perbaikan", icon: ThumbsUp, description: "Saran perbaikan yang ada" },
    { value: "general", label: "Umum", icon: MessageSquare, description: "Feedback umum" }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reviewed':
        return <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">Ditinjau</Badge>;
      case 'fixed':
        return <Badge variant="secondary" className="bg-green-600/20 text-green-400">Diperbaiki</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-600/20 text-gray-400">Menunggu</Badge>;
      default:
        return <Badge variant="secondary">Baru</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = feedbackCategories.find(c => c.value === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: id });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handleBackClick}
          className="text-nxe-text hover:text-nxe-primary transition-colors duration-200"
          data-testid="button-back"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </button>
        <h1 className="text-xl font-semibold text-white">Feedback</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Feedback Form */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-nxe-primary" />
            <CardTitle className="text-white text-lg">Berikan Feedback</CardTitle>
          </div>
          <p className="text-gray-400 text-sm">
            Bantuan Anda sangat berharga untuk meningkatkan aplikasi ini
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Kategori Feedback</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent className="bg-nxe-surface border-nxe-border text-white">
                          {feedbackCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center space-x-2">
                                <category.icon className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{category.label}</div>
                                  <div className="text-sm text-gray-500">{category.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-gray-200">Rating Aplikasi</Label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => {
                        setSelectedRating(rating);
                        form.setValue('rating', rating);
                      }}
                      className="p-1 hover:scale-110 transition-transform"
                      data-testid={`rating-star-${rating}`}
                    >
                      <Star 
                        className={`h-8 w-8 ${
                          rating <= selectedRating 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {selectedRating > 0 && `Anda memberikan ${selectedRating} bintang`}
                </p>
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Pesan</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ceritakan pengalaman Anda atau saran untuk perbaikan..."
                        className="bg-nxe-surface border-nxe-border text-white resize-none"
                        rows={5}
                        data-testid="textarea-feedback-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={submitFeedbackMutation.isPending}
                className="w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white font-medium"
                data-testid="button-submit-feedback"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitFeedbackMutation.isPending ? "Mengirim..." : "Kirim Feedback"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card className="bg-nxe-card border-nxe-surface/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">Feedback Terdahulu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Memuat feedback...</p>
            </div>
          ) : recentFeedback.length > 0 ? (
            recentFeedback.map((feedback) => (
              <div
                key={feedback.id}
                className="p-3 bg-nxe-surface rounded-lg border border-nxe-border"
                data-testid={`feedback-item-${feedback.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="text-nxe-primary">
                      {getCategoryIcon(feedback.category)}
                    </div>
                    <span className="text-white font-medium text-sm">
                      {feedbackCategories.find(c => c.value === feedback.category)?.label}
                    </span>
                  </div>
                  {getStatusBadge(feedback.status || 'pending')}
                </div>
                <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                  {feedback.message}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 text-xs">
                    {formatDate(feedback.createdAt)}
                  </p>
                  <div className="flex items-center space-x-1">
                    {[...Array(feedback.rating)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Belum ada feedback yang dikirim</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="bg-nxe-card border-nxe-surface/30 mt-6">
        <CardContent className="p-4">
          <div className="text-center">
            <h3 className="text-white font-medium mb-2">Perlu bantuan lebih lanjut?</h3>
            <p className="text-gray-400 text-sm mb-3">
              Tim support kami siap membantu Anda 24/7
            </p>
            <Button
              variant="outline"
              className="w-full bg-nxe-surface border-nxe-border text-white hover:bg-nxe-surface/80"
              data-testid="button-contact-support"
            >
              Hubungi Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
