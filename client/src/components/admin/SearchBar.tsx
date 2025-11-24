import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, placeholder = "Search...", onClear, className }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [localValue, setLocalValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const debounceTimerRef = React.useRef<NodeJS.Timeout>();

    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, 300);
    };

    const handleClear = () => {
      setLocalValue("");
      onChange("");
      onClear?.();
      inputRef.current?.focus();
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };

    React.useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    return (
      <div
        className={cn(
          "relative flex items-center w-full",
          "transition-transform duration-200 ease-out",
          isFocused && "scale-[1.01]",
          className
        )}
      >
        <div className="absolute left-3 flex items-center pointer-events-none z-10">
          <Search
            className={cn(
              "h-4 w-4 transition-colors duration-200",
              isFocused
                ? "text-primary"
                : "text-muted-foreground dark:text-muted-foreground"
            )}
          />
        </div>

        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-12 md:pr-10 h-11 w-full",
            "transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-primary",
            "focus-visible:border-primary dark:focus-visible:border-primary",
            "focus-visible:shadow-lg focus-visible:shadow-primary/20",
            "dark:bg-background dark:border-border",
            "dark:text-foreground dark:placeholder:text-muted-foreground",
            "min-h-[44px] md:min-h-[40px]",
            "text-base md:text-sm"
          )}
          data-testid="search-bar"
        />

        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              "absolute right-2 flex items-center justify-center",
              "w-8 h-8 md:w-6 md:h-6",
              "rounded-full transition-all duration-200",
              "hover:bg-muted dark:hover:bg-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0",
              "text-muted-foreground hover:text-foreground",
              "dark:text-muted-foreground dark:hover:text-foreground",
              "touch-manipulation",
              "animate-in fade-in zoom-in-95 duration-200"
            )}
            data-testid="button-clear-search"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";
