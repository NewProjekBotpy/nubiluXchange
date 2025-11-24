import { Button } from "@/components/ui/button";
import { Gamepad2, Sword, Target, Flame, Shield, Sparkles, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categories = [
  { 
    id: "all", 
    label: "All Games",
    icon: Gamepad2,
    gradient: "from-green-500 via-emerald-400 to-green-600",
    glowColor: "rgba(34, 197, 94, 0.4)",
    particleColor: "#22c55e"
  },
  { 
    id: "mobile_legends", 
    label: "Mobile Legends",
    icon: Sword,
    gradient: "from-blue-500 via-cyan-400 to-blue-600",
    glowColor: "rgba(59, 130, 246, 0.4)",
    particleColor: "#3b82f6"
  },
  { 
    id: "pubg_mobile", 
    label: "PUBG Mobile",
    icon: Target,
    gradient: "from-orange-500 via-yellow-400 to-orange-600",
    glowColor: "rgba(249, 115, 22, 0.4)",
    particleColor: "#f97316"
  },
  { 
    id: "free_fire", 
    label: "Free Fire",
    icon: Flame,
    gradient: "from-red-500 via-orange-400 to-red-600",
    glowColor: "rgba(239, 68, 68, 0.4)",
    particleColor: "#ef4444"
  },
  { 
    id: "valorant", 
    label: "Valorant",
    icon: Shield,
    gradient: "from-red-600 via-pink-500 to-red-700",
    glowColor: "rgba(220, 38, 38, 0.4)",
    particleColor: "#dc2626"
  },
  { 
    id: "genshin_impact", 
    label: "Genshin Impact",
    icon: Sparkles,
    gradient: "from-teal-500 via-cyan-400 to-blue-500",
    glowColor: "rgba(20, 184, 166, 0.4)",
    particleColor: "#14b8a6"
  },
  { 
    id: "roblox", 
    label: "Roblox",
    icon: Box,
    gradient: "from-red-500 via-rose-400 to-red-600",
    glowColor: "rgba(239, 68, 68, 0.4)",
    particleColor: "#ef4444"
  },
];

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <section className="px-4 py-4">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3"
      >
        <h2 className="text-lg font-bold text-white mb-0.5">Browse by Game</h2>
        <p className="text-xs text-gray-400">Select your favorite game to see products</p>
      </motion.div>
      
      <div className="flex space-x-1.5 overflow-x-auto scrollbar-hide pb-2">
        {categories.map((category, index) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, type: "spring", stiffness: 120 }}
              className="relative flex-shrink-0"
            >
              <Button
                onClick={() => onCategoryChange(category.id)}
                variant="ghost"
                data-testid={`button-category-${category.id}`}
                className={`
                  relative overflow-hidden
                  px-2.5 py-2.5 rounded-xl
                  transition-all duration-500 ease-out
                  border-2 min-w-[68px] h-[68px]
                  ${isSelected 
                    ? 'border-transparent shadow-2xl' 
                    : 'border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl'
                  }
                  group flex flex-col items-center justify-center
                `}
                style={{
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Animated Background */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${category.gradient} z-0 pointer-events-none`}
                  initial={false}
                  animate={{
                    opacity: isSelected ? 1 : 0.1,
                    scale: isSelected ? 1 : 0.95,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                />

                {/* Glow Effect */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: [0.3, 0.5, 0.3],
                        scale: [1, 1.08, 1],
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatType: "loop"
                      }}
                      className="absolute inset-0 rounded-xl blur-lg z-0 pointer-events-none motion-reduce:animate-none motion-reduce:opacity-40"
                      style={{
                        background: category.glowColor,
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Shimmer Effect on Hover */}
                <div className={`
                  absolute inset-0 opacity-0 group-hover:opacity-100
                  transition-opacity duration-500
                  bg-gradient-to-r from-transparent via-white/10 to-transparent
                  -skew-x-12 group-hover:animate-shimmer
                  z-0 pointer-events-none
                `} />

                {/* Content */}
                <div className="flex flex-col items-center gap-1 relative z-10 w-full">
                  {/* Icon - simple, no rotation animation */}
                  <div 
                    className={`
                      p-1.5 rounded-lg transition-all duration-300
                      ${isSelected 
                        ? 'bg-white/20 shadow-lg backdrop-blur-sm' 
                        : 'bg-white/5 group-hover:bg-white/15'
                      }
                    `}
                  >
                    <Icon className={`
                      h-3.5 w-3.5 transition-all duration-300
                      ${isSelected 
                        ? 'text-white drop-shadow-lg' 
                        : 'text-gray-300 group-hover:text-white group-hover:scale-110'
                      }
                    `} />
                  </div>
                  
                  <span 
                    className={`
                      text-[9px] leading-tight font-semibold text-center
                      transition-all duration-300 max-w-[58px] truncate px-0.5
                      ${isSelected 
                        ? 'text-white drop-shadow-md' 
                        : 'text-gray-400 group-hover:text-white'
                      }
                    `}
                  >
                    {category.label}
                  </span>
                </div>

                {/* Black Fade-in Effect at Bottom - all categories */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/60 via-black/30 to-transparent rounded-b-xl z-20 pointer-events-none" />

                {/* Selection Indicator with Animation */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div 
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      exit={{ scaleX: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="absolute bottom-1 left-0 right-0 mx-auto w-10 h-1 bg-white/70 rounded-full shadow-lg z-30 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Ripple Effect on Click */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-0 rounded-xl z-20 pointer-events-none"
                    style={{
                      border: `2px solid ${category.particleColor}`,
                    }}
                  />
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
