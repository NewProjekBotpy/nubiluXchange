export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-4 py-2" data-testid="typing-indicator">
      <div className="flex items-center space-x-1 bg-gray-700/50 rounded-2xl px-4 py-3">
        <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
        <div className="typing-dot" style={{ animationDelay: '150ms' }}></div>
        <div className="typing-dot" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}
