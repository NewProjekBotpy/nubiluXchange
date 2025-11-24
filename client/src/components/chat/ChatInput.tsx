import { useRef, useCallback, useEffect } from "react";
import { Send, Camera, Paperclip, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  disabled: boolean;
  isTyping: boolean;
  onTyping: () => void;
  onAttachmentClick: () => void;
  onStickerClick: () => void;
  onCameraClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadPending: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isTyping,
  onTyping,
  onAttachmentClick,
  onStickerClick,
  onCameraClick,
  fileInputRef,
  onFileSelect,
  uploadPending
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMultiline = textareaRef.current && textareaRef.current.scrollHeight > 44;

  // Auto-resize textarea based on content
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = textarea.scrollHeight;
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Auto-resize textarea when content changes
  useEffect(() => {
    autoResizeTextarea();
  }, [value, autoResizeTextarea]);

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-nxe-dark/95 backdrop-blur-md border-t border-nxe-surface px-3 py-2">
      <form onSubmit={onSend} className="flex items-end space-x-2">
        {/* File Upload Input (Hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={onFileSelect}
          className="hidden"
          data-testid="input-file-attachment"
        />
        
        {/* Chat Bar with Icons Inside */}
        <div className={`flex-1 flex items-end bg-nxe-surface ${isMultiline ? 'rounded-2xl' : 'rounded-full'} px-2 py-1 border border-nxe-surface transition-all duration-200`}>
          {/* Sticker Button Inside Bar */}
          <button
            type="button"
            onClick={onStickerClick}
            disabled={uploadPending}
            className="text-gray-400 hover:text-white p-2 flex-shrink-0 transition-colors self-end"
            data-testid="button-sticker"
          >
            <Smile className="h-5 w-5" />
          </button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onTyping();
            }}
            placeholder="Need a Help Tag @admin"
            className="flex-1 bg-transparent border-0 text-white text-base leading-tight placeholder:text-sm placeholder:text-gray-400 px-2 py-2 resize-none overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[36px] max-h-[120px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
            disabled={disabled || uploadPending}
            rows={1}
            data-testid="input-message"
          />

          {/* Attachment Button Inside Bar */}
          <button
            type="button"
            onClick={onAttachmentClick}
            disabled={uploadPending}
            className="text-gray-400 hover:text-white p-2 flex-shrink-0 transition-colors self-end"
            data-testid="button-attachment"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </div>
        
        {/* Camera/Send Button */}
        {value.trim() ? (
          <Button
            type="submit"
            disabled={disabled || uploadPending}
            className="bg-nxe-primary hover:bg-nxe-primary/80 rounded-full p-3 flex-shrink-0"
            data-testid="button-send-message"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCameraClick}
            disabled={uploadPending}
            className="text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-full p-3 flex-shrink-0"
            data-testid="button-camera"
          >
            <Camera className="h-5 w-5" />
          </Button>
        )}
      </form>
      
      {/* Upload Progress */}
      {uploadPending && (
        <div className="mt-2 text-sm text-gray-400 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-nxe-primary"></div>
          <span>Uploading file...</span>
        </div>
      )}
    </div>
  );
}
