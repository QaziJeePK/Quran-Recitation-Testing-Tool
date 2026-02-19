interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
}

export function TranscriptDisplay({ 
  transcript, 
  interimTranscript, 
  isListening 
}: TranscriptDisplayProps) {
  const hasContent = transcript.trim() || interimTranscript.trim();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-emerald-100">
      <h3 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center gap-2">
        <span className="text-xl">🎙️</span>
        Your Recitation
        {isListening && (
          <span className="flex items-center gap-1 text-red-500 text-sm font-normal ml-auto">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Listening...
          </span>
        )}
      </h3>

      <div 
        className="min-h-[100px] p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-right"
        style={{ fontFamily: "'Amiri', serif" }}
        dir="rtl"
      >
        {hasContent ? (
          <p className="text-2xl leading-relaxed text-gray-800">
            {transcript}
            {interimTranscript && (
              <span className="text-gray-400 italic"> {interimTranscript}</span>
            )}
          </p>
        ) : (
          <p className="text-gray-400 text-center py-4">
            {isListening 
              ? "Speak now... Your recitation will appear here" 
              : "Click 'Start Reciting' and begin your recitation"}
          </p>
        )}
      </div>
    </div>
  );
}
