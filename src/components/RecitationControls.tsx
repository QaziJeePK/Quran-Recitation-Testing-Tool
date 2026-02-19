interface RecitationControlsProps {
  isListening: boolean;
  isSupported: boolean;
  hasAyah: boolean;
  hasTranscript: boolean;
  onStart: () => void;
  onStop: () => void;
  onCheck: () => void;
  onReset: () => void;
}

export function RecitationControls({
  isListening,
  isSupported,
  hasAyah,
  hasTranscript,
  onStart,
  onStop,
  onCheck,
  onReset
}: RecitationControlsProps) {
  if (!isSupported) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-600">
          ⚠️ Speech recognition is not supported in your browser. 
          Please use Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {/* Record Button */}
      <button
        onClick={isListening ? onStop : onStart}
        disabled={!hasAyah}
        className={`
          relative px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white scale-105 shadow-lg shadow-red-300' 
            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-300 hover:scale-105'
          }
          disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
        `}
      >
        {isListening ? (
          <>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
              Stop Recording
            </span>
            {/* Pulse animation */}
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></span>
          </>
        ) : (
          <span className="flex items-center gap-2">
            🎤 Start Reciting
          </span>
        )}
      </button>

      {/* Check Button */}
      <button
        onClick={onCheck}
        disabled={!hasTranscript || isListening}
        className="px-8 py-4 rounded-full font-bold text-lg bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-300 transition-all duration-300 hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
      >
        ✓ Check Recitation
      </button>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="px-6 py-4 rounded-full font-bold text-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all duration-300 hover:scale-105"
      >
        ↺ Reset
      </button>
    </div>
  );
}
