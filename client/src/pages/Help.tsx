import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  Search,
  Shield,
  CreditCard,
  Gamepad2,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const faqData = [
  {
    category: "Akun & Keamanan",
    icon: Shield,
    questions: [
      {
        q: "Bagaimana cara memverifikasi akun saya?",
        a: "Untuk memverifikasi akun, masuk ke Pengaturan > Verifikasi Akun, lalu upload foto KTP dan selfie dengan KTP. Proses verifikasi biasanya memakan waktu 1-3 hari kerja."
      },
      {
        q: "Apakah aman membeli akun gaming di NubiluXchange?",
        a: "Ya, kami menggunakan sistem escrow untuk melindungi pembeli dan penjual. Dana hanya akan dilepas setelah pembeli mengkonfirmasi akun gaming berfungsi dengan baik."
      },
      {
        q: "Bagaimana jika akun yang saya beli bermasalah?",
        a: "Jika akun bermasalah dalam 24 jam pertama, Anda bisa mengajukan dispute. Tim CS kami akan membantu mediasi dan memberikan solusi terbaik, termasuk refund jika diperlukan."
      }
    ]
  },
  {
    category: "Transaksi & Pembayaran",
    icon: CreditCard,
    questions: [
      {
        q: "Apa saja metode pembayaran yang tersedia?",
        a: "Kami menerima QRIS, transfer bank (BCA, Mandiri, BNI, BRI), e-wallet (GoPay, OVO, DANA), dan pulsa. Semua pembayaran diproses secara real-time."
      },
      {
        q: "Berapa lama proses pencairan dana penjualan?",
        a: "Setelah pembeli mengkonfirmasi akun, dana akan tersedia di wallet Anda. Proses penarikan ke rekening bank memakan waktu 1-2 jam pada jam kerja."
      },
      {
        q: "Apakah ada biaya transaksi?",
        a: "Ya, kami mengenakan fee 5% untuk setiap transaksi berhasil. Fee ini sudah termasuk biaya payment gateway dan escrow protection."
      }
    ]
  },
  {
    category: "Jual Beli Akun Gaming",
    icon: Gamepad2,
    questions: [
      {
        q: "Game apa saja yang bisa dijual di NubiluXchange?",
        a: "Kami mendukung hampir semua game populer seperti Mobile Legends, PUBG Mobile, Free Fire, Valorant, Genshin Impact, dan masih banyak lagi."
      },
      {
        q: "Bagaimana cara menentukan harga akun yang tepat?",
        a: "Gunakan fitur Price Estimator kami yang mempertimbangkan rank, level, skin, dan asset in-game lainnya. Anda juga bisa melihat harga akun serupa di marketplace."
      },
      {
        q: "Bolehkah menjual akun yang masih bind social media?",
        a: "Untuk keamanan, sebaiknya lepas semua social media binding sebelum dijual. Akun yang sudah unbind akan mendapat badge 'Safe Transfer' dan lebih laku."
      }
    ]
  },
  {
    category: "Komunitas & Aturan",
    icon: Users,
    questions: [
      {
        q: "Apa yang terjadi jika saya melanggar aturan komunitas?",
        a: "Pelanggaran ringan akan mendapat peringatan, pelanggaran berat seperti penipuan akan langsung banned permanen. Semua keputusan berdasarkan laporan dan investigasi tim moderator."
      },
      {
        q: "Bagaimana cara melaporkan penjual yang mencurigakan?",
        a: "Gunakan tombol 'Report' di profil penjual atau chat. Tim CS akan menginvestigasi dalam 24 jam dan mengambil tindakan jika terbukti melanggar."
      },
      {
        q: "Bisakah saya menjadi penjual terverifikasi?",
        a: "Ya, setelah 10 transaksi berhasil dengan rating 4.5+ dan verifikasi identitas lengkap, Anda bisa apply untuk status Verified Seller yang memberikan berbagai keuntungan."
      }
    ]
  }
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
    email: "",
    category: "general"
  });
  const { toast } = useToast();

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    toast({
      title: "Pesan berhasil dikirim!",
      description: "Tim customer service kami akan merespons dalam 24 jam.",
    });
    setContactForm({ subject: "", message: "", email: "", category: "general" });
  };

  const filteredFAQ = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(
      item => 
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-nxe-dark p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
          <HelpCircle className="h-8 w-8 mr-3 text-nxe-primary" />
          Pusat Bantuan
        </h1>
        <p className="text-nxe-text max-w-2xl mx-auto">
          Temukan jawaban untuk pertanyaan Anda atau hubungi tim support kami untuk bantuan lebih lanjut
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Cari bantuan, misal 'cara verifikasi akun'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-nxe-surface border-nxe-border text-white placeholder-gray-400 h-12 text-lg"
            data-testid="input-help-search"
          />
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="faq" className="max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 bg-nxe-surface border border-nxe-border mb-8">
          <TabsTrigger 
            value="faq"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            FAQ
          </TabsTrigger>
          <TabsTrigger 
            value="contact"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Hubungi Kami
          </TabsTrigger>
          <TabsTrigger 
            value="guides"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Panduan
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          {searchQuery && (
            <div className="mb-6">
              <p className="text-nxe-text">
                Menampilkan hasil untuk: <span className="text-white font-medium">"{searchQuery}"</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredFAQ.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Tidak ada hasil ditemukan
                </h3>
                <p className="text-nxe-text mb-4">
                  Coba ubah kata kunci pencarian atau hubungi customer service
                </p>
                <Button 
                  onClick={() => setSearchQuery("")}
                  variant="outline"
                  className="border-nxe-primary text-nxe-primary hover:bg-nxe-primary hover:text-white"
                >
                  Reset Pencarian
                </Button>
              </div>
            ) : (
              filteredFAQ.map((category, idx) => {
                const IconComponent = category.icon;
                return (
                  <Card key={idx} className="bg-nxe-surface border-nxe-border">
                    <CardHeader>
                      <CardTitle className="flex items-center text-white">
                        <div className="p-2 bg-nxe-primary/20 rounded-lg mr-3">
                          <IconComponent className="h-5 w-5 text-nxe-primary" />
                        </div>
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.questions.map((faq, faqIdx) => (
                          <AccordionItem key={faqIdx} value={`${idx}-${faqIdx}`} className="border-nxe-border">
                            <AccordionTrigger className="text-left text-white hover:text-nxe-primary">
                              {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-nxe-text">
                              {faq.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-nxe-primary" />
                  Kirim Pesan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="email@domain.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      className="bg-nxe-dark border-nxe-border text-white"
                      required
                      data-testid="input-contact-email"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Kategori
                    </label>
                    <select 
                      value={contactForm.category}
                      onChange={(e) => setContactForm({...contactForm, category: e.target.value})}
                      className="w-full p-2 bg-nxe-dark border border-nxe-border rounded-md text-white"
                      data-testid="select-contact-category"
                    >
                      <option value="general">Pertanyaan Umum</option>
                      <option value="technical">Masalah Teknis</option>
                      <option value="payment">Pembayaran</option>
                      <option value="dispute">Dispute/Keluhan</option>
                      <option value="account">Akun & Verifikasi</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Subjek
                    </label>
                    <Input
                      type="text"
                      placeholder="Ringkasan singkat masalah Anda"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                      className="bg-nxe-dark border-nxe-border text-white"
                      required
                      data-testid="input-contact-subject"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Pesan
                    </label>
                    <Textarea
                      placeholder="Jelaskan masalah Anda secara detail..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      className="bg-nxe-dark border-nxe-border text-white min-h-[120px]"
                      required
                      data-testid="textarea-contact-message"
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    className="w-full bg-nxe-primary hover:bg-nxe-primary/80 text-white"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Pesan
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Methods */}
            <div className="space-y-6">
              <Card className="bg-nxe-surface border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white">Kontak Langsung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-nxe-dark rounded-lg">
                    <Mail className="h-5 w-5 text-nxe-primary" />
                    <div>
                      <p className="text-white font-medium">Email Support</p>
                      <p className="text-nxe-text text-sm">support@nubiluxchange.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-nxe-dark rounded-lg">
                    <Phone className="h-5 w-5 text-nxe-primary" />
                    <div>
                      <p className="text-white font-medium">WhatsApp CS</p>
                      <p className="text-nxe-text text-sm">+62 812-3456-7890</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-nxe-dark rounded-lg">
                    <MessageCircle className="h-5 w-5 text-nxe-primary" />
                    <div>
                      <p className="text-white font-medium">Live Chat</p>
                      <p className="text-nxe-text text-sm">Tersedia 24/7</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card className="bg-nxe-surface border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white">Waktu Respons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-white">Urgent</span>
                    </div>
                    <Badge className="bg-red-600 text-white">&lt; 1 jam</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-white">Normal</span>
                    </div>
                    <Badge className="bg-yellow-600 text-white">&lt; 24 jam</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-white">General</span>
                    </div>
                    <Badge className="bg-green-600 text-white">1-3 hari</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides">
          <div className="space-y-8">
            {/* Panduan Pembeli Pemula */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-blue-600 rounded-lg mr-4">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  Panduan Pembeli Pemula
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Langkah-langkah aman untuk membeli akun gaming pertama kali di NubiluXchange
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🔍 Persiapan Sebelum Membeli</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-nxe-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Verifikasi Akun Anda</p>
                          <p className="text-nxe-text text-sm">Upload KTP dan selfie untuk keamanan transaksi</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-nxe-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Isi Saldo E-Wallet</p>
                          <p className="text-nxe-text text-sm">Top-up minimal sesuai budget akun yang ingin dibeli</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-nxe-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Riset Harga Pasar</p>
                          <p className="text-nxe-text text-sm">Bandingkan harga akun serupa untuk mendapat deal terbaik</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🛒 Proses Pembelian</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">4</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Pilih Penjual Terpercaya</p>
                          <p className="text-nxe-text text-sm">Cek badge verifikasi, rating, dan review pembeli lain</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">5</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Chat & Tanya Detail</p>
                          <p className="text-nxe-text text-sm">Konfirmasi detail akun, skin, rank, dan binding status</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">6</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Gunakan Escrow Protection</p>
                          <p className="text-nxe-text text-sm">Dana akan aman di sistem escrow sampai konfirmasi selesai</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-nxe-dark p-4 rounded-lg border-l-4 border-blue-500">
                  <h5 className="text-white font-semibold mb-2">💡 Tips Pro untuk Pembeli Baru</h5>
                  <ul className="text-nxe-text text-sm space-y-1">
                    <li>• Mulai dengan akun murah (di bawah 100k) untuk belajar prosesnya</li>
                    <li>• Selalu screenshot chat dan detail akun sebelum transaksi</li>
                    <li>• Jangan transfer langsung tanpa sistem escrow</li>
                    <li>• Test login akun dalam 24 jam pertama</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Tips Menjual Efektif */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-green-600 rounded-lg mr-4">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  Tips Menjual Efektif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Strategi terbukti untuk menjual akun gaming dengan harga optimal dan cepat laku
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">📈 Optimasi Listing</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Foto & Video Berkualitas</p>
                          <p className="text-nxe-text text-sm">Upload 5-8 screenshot HD: profile, skin koleksi, rank, inventory</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Judul yang Menarik</p>
                          <p className="text-nxe-text text-sm">Format: "[Game] [Rank] + [Skin Rare] - [Highlight] MURAH!"</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Deskripsi Detail</p>
                          <p className="text-nxe-text text-sm">List semua skin, hero, rank history, dan bonus items</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">💰 Strategi Harga</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">4</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Riset Kompetitor</p>
                          <p className="text-nxe-text text-sm">Cek harga akun serupa, set 5-10% lebih murah untuk fast sell</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">5</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Bundle Deals</p>
                          <p className="text-nxe-text text-sm">Tawarkan 2-3 akun sekaligus dengan diskon 15-20%</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">6</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Flash Sale Strategy</p>
                          <p className="text-nxe-text text-sm">Buat urgency dengan "24 JAM TERAKHIR" atau "STOCK TERBATAS"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-nxe-dark p-4 rounded-lg border-l-4 border-green-500">
                  <h5 className="text-white font-semibold mb-2">🚀 Growth Hacks untuk Seller</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Post di jam prime time (19.00-22.00)</li>
                      <li>• Update listing setiap 2-3 hari untuk boost visibility</li>
                      <li>• Gunakan hashtag trending game events</li>
                      <li>• Offer bonus items (starlight, diamonds) untuk closing deal</li>
                    </ul>
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Build reputation dengan selling murah dulu</li>
                      <li>• Follow up buyer dengan deal terbaru</li>
                      <li>• Cross-promote di social media & grup game</li>
                      <li>• Collab dengan micro-influencer gaming</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keamanan Transaksi */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-red-600 rounded-lg mr-4">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  Keamanan Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Panduan lengkap melindungi diri dari penipuan dan scammer dalam transaksi akun gaming
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🚨 Red Flags yang Harus Diwaspadai</h4>
                    <div className="space-y-3">
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">⚠️ Harga Terlalu Murah</p>
                        <p className="text-nxe-text text-sm">Akun mythic dengan skin mahal dijual 50k? Pasti scam!</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">⚠️ Minta Transfer Langsung</p>
                        <p className="text-nxe-text text-sm">Seller yang menolak escrow system 100% penipu</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">⚠️ Akun Baru Tanpa Rating</p>
                        <p className="text-nxe-text text-sm">Seller akun baru yang langsung jual akun mahal = curiga</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">⚠️ Tidak Mau Video Call</p>
                        <p className="text-nxe-text text-sm">Seller asli pasti mau show akun via live demo</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🛡️ Protokol Keamanan Wajib</h4>
                    <div className="space-y-3">
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">✅ Always Use Escrow</p>
                        <p className="text-nxe-text text-sm">Dana 100% aman sampai konfirmasi akun bekerja</p>
                      </div>
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">✅ Check Seller History</p>
                        <p className="text-nxe-text text-sm">Minimal 5 transaksi sukses dengan rating 4.5+</p>
                      </div>
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">✅ Video Call Demo</p>
                        <p className="text-nxe-text text-sm">Minta seller demo login + show inventory real-time</p>
                      </div>
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">✅ Screenshot Everything</p>
                        <p className="text-nxe-text text-sm">Simpan bukti chat, detail akun, dan proses transaksi</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30">
                  <h5 className="text-yellow-400 font-semibold mb-2">🔥 Emergency Action Plan</h5>
                  <p className="text-nxe-text text-sm mb-3">Jika dicurigai penipuan, langsung lakukan:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <p className="text-white font-medium text-sm">STOP Transaksi</p>
                      <p className="text-nxe-text text-xs">Jangan lanjutkan pembayaran</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <p className="text-white font-medium text-sm">Report Seller</p>
                      <p className="text-nxe-text text-xs">Gunakan tombol Report + CS</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <p className="text-white font-medium text-sm">Document Evidence</p>
                      <p className="text-nxe-text text-xs">Screenshot & kirim ke admin</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panduan Verifikasi Akun Detail */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-purple-600 rounded-lg mr-4">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  Panduan Verifikasi Akun Lengkap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Verifikasi identitas adalah langkah wajib untuk keamanan maksimal dan akses fitur premium platform
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">📄 Dokumen yang Diperlukan</h4>
                    <div className="space-y-3">
                      <div className="bg-nxe-dark p-3 rounded-lg border border-purple-500/30">
                        <p className="text-white font-medium">KTP/SIM/Passport Indonesia</p>
                        <p className="text-nxe-text text-sm">• Foto HD, tidak buram atau terpotong</p>
                        <p className="text-nxe-text text-sm">• Semua text harus terbaca jelas</p>
                        <p className="text-nxe-text text-sm">• Format: JPG, PNG (max 5MB)</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-purple-500/30">
                        <p className="text-white font-medium">Foto Selfie dengan Dokumen</p>
                        <p className="text-nxe-text text-sm">• Wajah dan dokumen terlihat jelas</p>
                        <p className="text-nxe-text text-sm">• Background cukup cahaya</p>
                        <p className="text-nxe-text text-sm">• Tidak ada filter atau edit berlebihan</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🔄 Proses Verifikasi</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Upload Dokumen</p>
                          <p className="text-nxe-text text-sm">Pengaturan {'>'} Verifikasi Akun {'>'} Upload KTP & Selfie</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">AI Validation</p>
                          <p className="text-nxe-text text-sm">Sistem AI verifikasi otomatis dalam 5 menit</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Human Review</p>
                          <p className="text-nxe-text text-sm">Tim expert review manual 1-3 hari kerja</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Verified Badge</p>
                          <p className="text-nxe-text text-sm">Dapatkan badge biru + akses fitur premium</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                  <h5 className="text-purple-400 font-semibold mb-2">🎯 Keuntungan Akun Terverifikasi</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Limit transaksi lebih tinggi (hingga 50 juta)</li>
                      <li>• Prioritas dalam search ranking</li>
                      <li>• Akses fitur AI Escrow premium</li>
                      <li>• Badge verifikasi yang meningkatkan trust</li>
                    </ul>
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Fee transaksi lebih rendah (3% vs 5%)</li>
                      <li>• Customer support prioritas</li>
                      <li>• Akses komunitas VIP seller</li>
                      <li>• Early access ke fitur terbaru</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panduan Sistem Escrow Detail */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-orange-600 rounded-lg mr-4">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  Sistem Escrow & AI Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Memahami bagaimana sistem escrow dan AI melindungi 100% transaksi Anda dari penipuan
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🔄 Alur Escrow System</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Pembeli Transfer</p>
                          <p className="text-nxe-text text-sm">Dana masuk ke escrow wallet, bukan ke seller</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Seller Kirim Akun</p>
                          <p className="text-nxe-text text-sm">Login credentials dikirim via encrypted chat</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">AI Verification</p>
                          <p className="text-nxe-text text-sm">AI cek akun real-time: rank, skin, statistics</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">4</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Release Dana</p>
                          <p className="text-nxe-text text-sm">Setelah konfirmasi buyer, dana dikirim ke seller</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🤖 AI Protection Features</h4>
                    <div className="space-y-3">
                      <div className="bg-nxe-dark p-3 rounded-lg border border-orange-500/30">
                        <p className="text-orange-400 font-medium">🔍 Account Authenticity Check</p>
                        <p className="text-nxe-text text-sm">AI scan akun gaming untuk detect fake/stolen account</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-orange-500/30">
                        <p className="text-orange-400 font-medium">📊 Real-time Statistics</p>
                        <p className="text-nxe-text text-sm">Verifikasi rank, winrate, match history sesuai deskripsi</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-orange-500/30">
                        <p className="text-orange-400 font-medium">💎 Asset Verification</p>
                        <p className="text-nxe-text text-sm">Konfirmasi skin, hero, diamond sesuai yang dijanjikan</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-orange-500/30">
                        <p className="text-orange-400 font-medium">⚡ Instant Dispute Detection</p>
                        <p className="text-nxe-text text-sm">AI otomatis detect anomali dan trigger dispute</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-900/20 p-4 rounded-lg border-l-4 border-orange-500">
                  <h5 className="text-orange-400 font-semibold mb-2">⏱️ Timeline & Guarantee</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">24 Jam</p>
                      <p className="text-nxe-text text-sm">Periode testing akun</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">Auto-Refund</p>
                      <p className="text-nxe-text text-sm">Jika akun bermasalah</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">24/7 Support</p>
                      <p className="text-nxe-text text-sm">Tim mediasi siap membantu</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panduan E-Wallet & Pembayaran */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-emerald-600 rounded-lg mr-4">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  E-Wallet & Sistem Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Panduan lengkap menggunakan e-wallet internal dan berbagai metode pembayaran yang tersedia
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">💰 Top-Up E-Wallet</h4>
                    <div className="space-y-3">
                      <div className="bg-nxe-dark p-3 rounded-lg border border-emerald-500/30">
                        <p className="text-emerald-400 font-medium">🏦 Transfer Bank</p>
                        <p className="text-nxe-text text-sm">BCA, Mandiri, BNI, BRI - Instan 24 jam</p>
                        <p className="text-nxe-text text-sm">Min: 50k | Max: 50 juta/hari</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-emerald-500/30">
                        <p className="text-emerald-400 font-medium">📱 E-Wallet</p>
                        <p className="text-nxe-text text-sm">GoPay, OVO, DANA, ShopeePay</p>
                        <p className="text-nxe-text text-sm">Min: 20k | Max: 10 juta/hari</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-emerald-500/30">
                        <p className="text-emerald-400 font-medium">🎯 QRIS Universal</p>
                        <p className="text-nxe-text text-sm">Scan QR dari aplikasi bank/wallet apapun</p>
                        <p className="text-nxe-text text-sm">Min: 10k | Max: 2 juta/transaksi</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-emerald-500/30">
                        <p className="text-emerald-400 font-medium">📞 Pulsa & Paket Data</p>
                        <p className="text-nxe-text text-sm">Telkomsel, XL, Indosat, 3</p>
                        <p className="text-nxe-text text-sm">Min: 25k | Rate: 0.85x nilai pulsa</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">💸 Withdraw & Pencairan</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Minimal Withdraw</p>
                          <p className="text-nxe-text text-sm">Min 100k untuk bank, 50k untuk e-wallet</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Proses Pencairan</p>
                          <p className="text-nxe-text text-sm">Jam kerja: 1-2 jam | Weekend: 2-6 jam</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Biaya Admin</p>
                          <p className="text-nxe-text text-sm">Bank: 6.500 | E-wallet: 2.500</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">4</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Verifikasi Required</p>
                          <p className="text-nxe-text text-sm">KYC wajib untuk withdraw {'>'} 1 juta</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-900/20 p-4 rounded-lg border-l-4 border-emerald-500">
                  <h5 className="text-emerald-400 font-semibold mb-2">🎁 Bonus & Cashback Program</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Top-up pertama bonus 5% (max 25k)</li>
                      <li>• Cashback 1% setiap transaksi berhasil</li>
                      <li>• Member VIP: Cashback 2%</li>
                      <li>• Referral friend: Bonus 10k per orang</li>
                    </ul>
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Daily check-in: 1k - 5k random</li>
                      <li>• Monthly trader: Bonus 50k - 500k</li>
                      <li>• Special event: Up to 20% extra</li>
                      <li>• Birthday surprise: Triple cashback</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panduan Dispute Resolution */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-red-600 rounded-lg mr-4">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  Panduan Dispute & Penyelesaian Masalah
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Langkah sistematis mengatasi masalah transaksi dan mengajukan dispute dengan tingkat keberhasilan tinggi
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🚨 Kondisi Dispute Valid</h4>
                    <div className="space-y-3">
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">❌ Akun Tidak Sesuai</p>
                        <p className="text-nxe-text text-sm">Rank, skin, atau stats berbeda dari deskripsi</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">🔒 Login Bermasalah</p>
                        <p className="text-nxe-text text-sm">Password salah atau akun sudah di-recover</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">📱 Binding Issues</p>
                        <p className="text-nxe-text text-sm">Akun masih terikat social media seller</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">⛔ Banned Account</p>
                        <p className="text-nxe-text text-sm">Akun kena suspend/ban setelah transfer</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">📝 Cara Mengajukan Dispute</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Kumpulkan Bukti</p>
                          <p className="text-nxe-text text-sm">Screenshot chat, detail akun, dan error yang dialami</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Hubungi Seller Dulu</p>
                          <p className="text-nxe-text text-sm">Coba selesaikan secara kekeluargaan terlebih dahulu</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">File Dispute</p>
                          <p className="text-nxe-text text-sm">Transaksi {'>'} Detail {'>'} "Ajukan Dispute" + upload bukti</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">4</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Tim Mediasi</p>
                          <p className="text-nxe-text text-sm">Admin review dalam 2-24 jam dan buat keputusan</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
                  <h5 className="text-yellow-400 font-semibold mb-2">⚖️ Kemungkinan Hasil Dispute</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">Full Refund</p>
                      <p className="text-nxe-text text-sm">100% uang kembali jika seller bersalah</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">Partial Refund</p>
                      <p className="text-nxe-text text-sm">Kompensasi sesuai tingkat masalah</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <TrendingUp className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">Account Fix</p>
                      <p className="text-nxe-text text-sm">Seller perbaiki issue dan transaksi lanjut</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Optimasi Profil */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-cyan-600 rounded-lg mr-4">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Optimasi Profil & Membangun Trust
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Strategi membangun reputasi dan kepercayaan di platform NubiluXchange untuk meningkatkan penjualan
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">👤 Profil Yang Menarik</h4>
                    <div className="space-y-3">
                      <div className="bg-nxe-dark p-3 rounded-lg border border-cyan-500/30">
                        <p className="text-cyan-400 font-medium">📸 Foto Profil Profesional</p>
                        <p className="text-nxe-text text-sm">Gunakan foto asli, tidak anime atau karakter game</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-cyan-500/30">
                        <p className="text-cyan-400 font-medium">📝 Bio Yang Informatif</p>
                        <p className="text-nxe-text text-sm">Tulis pengalaman gaming, spesialisasi, dan contact</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-cyan-500/30">
                        <p className="text-cyan-400 font-medium">🏆 Showcase Achievement</p>
                        <p className="text-nxe-text text-sm">Tampilkan rank tertinggi dan prestasi gaming</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-cyan-500/30">
                        <p className="text-cyan-400 font-medium">📱 Link Social Media</p>
                        <p className="text-nxe-text text-sm">Connect Instagram/TikTok gaming untuk kredibilitas</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">⭐ Membangun Rating Tinggi</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Mulai Dengan Harga Murah</p>
                          <p className="text-nxe-text text-sm">Jual akun murah dulu untuk dapat review positif pertama</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Over-Deliver Value</p>
                          <p className="text-nxe-text text-sm">Kasih bonus diamond atau skin extra tanpa diminta</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Komunikasi Excellent</p>
                          <p className="text-nxe-text text-sm">Respon cepat, sopan, dan helpful dalam chat</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">4</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Follow-up Service</p>
                          <p className="text-nxe-text text-sm">Tanya kabar buyer setelah transaksi selesai</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-900/20 p-4 rounded-lg border-l-4 border-cyan-500">
                  <h5 className="text-cyan-400 font-semibold mb-2">🎯 Advanced Trust Building</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Upload video review dari customer puas</li>
                      <li>• Buat konten edukasi gaming di social media</li>
                      <li>• Join komunitas dan aktif helping newbie</li>
                      <li>• Kolaborasi dengan content creator gaming</li>
                    </ul>
                    <ul className="text-nxe-text text-sm space-y-1">
                      <li>• Consistency posting akun berkualitas</li>
                      <li>• Transparent tentang account history</li>
                      <li>• Offer trial/demo sebelum deal</li>
                      <li>• Build personal brand sebagai expert</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panduan Komunitas & Aturan Lengkap */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-indigo-600 rounded-lg mr-4">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Komunitas & Aturan Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Panduan berperilaku di komunitas NubiluXchange yang aman, sopan, dan produktif untuk semua member
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">✅ Aturan Wajib (Do's)</h4>
                    <div className="space-y-3">
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">🤝 Komunikasi Sopan & Profesional</p>
                        <p className="text-nxe-text text-sm">Gunakan bahasa yang baik, tidak kasar atau menyinggung</p>
                      </div>
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">📝 Listing Akun Jujur & Akurat</p>
                        <p className="text-nxe-text text-sm">Deskripsikan akun sesuai kondisi asli, tidak bohong</p>
                      </div>
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">⚡ Respon Cepat & Helpful</p>
                        <p className="text-nxe-text text-sm">Balas chat dalam 2-6 jam, bantu jawab pertanyaan buyer</p>
                      </div>
                      <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium">🛡️ Gunakan Sistem Escrow</p>
                        <p className="text-nxe-text text-sm">Selalu transaksi via platform untuk perlindungan mutual</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🚫 Larangan Keras (Don'ts)</h4>
                    <div className="space-y-3">
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">💸 Minta Transfer Direct</p>
                        <p className="text-nxe-text text-sm">Transaksi wajib via escrow, tidak boleh transfer langsung</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">📢 Spam & Fake Listing</p>
                        <p className="text-nxe-text text-sm">Tidak boleh posting berulang atau akun palsu</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">🔥 Toxic Behavior</p>
                        <p className="text-nxe-text text-sm">Dilarang hate speech, bullying, atau diskriminasi</p>
                      </div>
                      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">🎭 Multi Account Abuse</p>
                        <p className="text-nxe-text text-sm">1 orang = 1 akun, tidak boleh buat fake account</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-900/20 p-4 rounded-lg border-l-4 border-indigo-500">
                  <h5 className="text-indigo-400 font-semibold mb-2">⚖️ Sistem Pelanggaran & Hukuman</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <AlertTriangle className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">Warning</p>
                      <p className="text-nxe-text text-sm">Pelanggaran ringan: Chat kasar, spam kecil</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">Suspend</p>
                      <p className="text-nxe-text text-sm">7-30 hari untuk pelanggaran berulang</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <AlertTriangle className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-white font-medium">Permanent Ban</p>
                      <p className="text-nxe-text text-sm">Penipuan, scam, atau pelanggaran berat</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Keamanan Akun Pengguna */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-red-600 rounded-lg mr-4">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  Keamanan Akun & Password Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Tips esensial melindungi akun NubiluXchange dan akun gaming Anda dari hacker dan penyalahgunaan
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🔐 Password & Login Security</h4>
                    <div className="space-y-3">
                      <div className="bg-nxe-dark p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">💪 Strong Password Formula</p>
                        <p className="text-nxe-text text-sm">Min 12 karakter: huruf besar, kecil, angka, simbol</p>
                        <p className="text-nxe-text text-xs text-gray-400">Contoh: MyGaming@2024!Secure</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">🔄 Unique Password per Account</p>
                        <p className="text-nxe-text text-sm">Jangan pakai password yang sama untuk semua akun</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">📱 Enable 2FA (Two-Factor Auth)</p>
                        <p className="text-nxe-text text-sm">Aktifkan Google Authenticator atau SMS verification</p>
                      </div>
                      <div className="bg-nxe-dark p-3 rounded-lg border border-red-500/30">
                        <p className="text-red-400 font-medium">🔒 Use Password Manager</p>
                        <p className="text-nxe-text text-sm">Install Bitwarden, LastPass, atau 1Password</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🛡️ Anti-Phishing & Scam Protection</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Check URL Authenticity</p>
                          <p className="text-nxe-text text-sm">Pastikan URL = nubiluxchange.com (bukan typo)</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Verify SSL Certificate</p>
                          <p className="text-nxe-text text-sm">Lihat ikon gembok hijau di browser sebelum login</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Ignore Suspicious Links</p>
                          <p className="text-nxe-text text-sm">Jangan klik link dari email/DM yang mencurigakan</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">4</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Never Share Login Details</p>
                          <p className="text-nxe-text text-sm">Admin tidak akan pernah minta password Anda</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
                  <h5 className="text-red-400 font-semibold mb-2">🚨 What To Do If Account Compromised</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <p className="text-white font-medium text-sm">Change Password</p>
                      <p className="text-nxe-text text-xs">Immediately dari device lain</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <p className="text-white font-medium text-sm">Enable 2FA</p>
                      <p className="text-nxe-text text-xs">Extra layer security</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <p className="text-white font-medium text-sm">Contact Support</p>
                      <p className="text-nxe-text text-xs">Lapor ke CS dengan bukti</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">4</span>
                      </div>
                      <p className="text-white font-medium text-sm">Check Activities</p>
                      <p className="text-nxe-text text-xs">Review transaksi mencurigakan</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panduan Best Practices */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="p-3 bg-emerald-600 rounded-lg mr-4">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  Best Practices untuk Sukses di NubiluXchange
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-nxe-text">
                  Kumpulan tips terbaik dari seller dan buyer sukses untuk memaksimalkan pengalaman di platform
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">🎯 Untuk New Member</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-emerald-400 font-medium">• Complete profile dengan foto asli</p>
                      <p className="text-nxe-text">• Verifikasi KTP untuk badge trusted</p>
                      <p className="text-emerald-400 font-medium">• Mulai beli akun murah dulu (testing)</p>
                      <p className="text-nxe-text">• Join komunitas Telegram/Discord</p>
                      <p className="text-emerald-400 font-medium">• Baca semua panduan dengan teliti</p>
                      <p className="text-nxe-text">• Tanya CS jika ada yang bingung</p>
                      <p className="text-emerald-400 font-medium">• Follow social media untuk update</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">💰 Untuk Active Trader</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-emerald-400 font-medium">• Diversifikasi portfolio game</p>
                      <p className="text-nxe-text">• Track market trends & seasonal demand</p>
                      <p className="text-emerald-400 font-medium">• Build network dengan trader lain</p>
                      <p className="text-nxe-text">• Optimize listing dengan SEO keywords</p>
                      <p className="text-emerald-400 font-medium">• Maintain rating 4.5+ consistently</p>
                      <p className="text-nxe-text">• Invest di akun high-value occasionally</p>
                      <p className="text-emerald-400 font-medium">• Reinvest profit untuk scale business</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold mb-3">👑 Untuk Pro Seller</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-emerald-400 font-medium">• Apply untuk verified seller badge</p>
                      <p className="text-nxe-text">• Gunakan AI tools untuk market analysis</p>
                      <p className="text-emerald-400 font-medium">• Develop personal branding strategy</p>
                      <p className="text-nxe-text">• Create content untuk attract followers</p>
                      <p className="text-emerald-400 font-medium">• Mentor newbie trader (reputation++)</p>
                      <p className="text-nxe-text">• Partner dengan gaming influencer</p>
                      <p className="text-emerald-400 font-medium">• Expand ke multiple marketplace</p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-900/20 p-4 rounded-lg border-l-4 border-emerald-500">
                  <h5 className="text-emerald-400 font-semibold mb-2">🏆 Success Metrics & Goals</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-nxe-dark p-3 rounded-lg">
                      <p className="text-2xl font-bold text-white">4.5+</p>
                      <p className="text-nxe-text text-xs">Rating Target</p>
                    </div>
                    <div className="bg-nxe-dark p-3 rounded-lg">
                      <p className="text-2xl font-bold text-white">{'<'} 6h</p>
                      <p className="text-nxe-text text-xs">Response Time</p>
                    </div>
                    <div className="bg-nxe-dark p-3 rounded-lg">
                      <p className="text-2xl font-bold text-white">95%</p>
                      <p className="text-nxe-text text-xs">Success Rate</p>
                    </div>
                    <div className="bg-nxe-dark p-3 rounded-lg">
                      <p className="text-2xl font-bold text-white">10+</p>
                      <p className="text-nxe-text text-xs">Monthly Deals</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}