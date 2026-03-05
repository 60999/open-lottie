"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Type, ImagePlus, Video, Sparkles, Wand2, Zap, ZapOff, Clock, DollarSign, Link } from "lucide-react";
import LottiePreview from "./LottiePreview";
import FileUpload from "./FileUpload";
import ParameterControls, {
  GenerationParams,
  DEFAULT_PARAMS,
} from "./ParameterControls";

type Mode = "text" | "image-text" | "video";
type Backend = "modal" | "huggingface";
type GpuStatus = "checking" | "active" | "inactive";

const MODES: { id: Mode; label: string; icon: typeof Type; description: string }[] = [
  {
    id: "text",
    label: "Text to Lottie",
    icon: Type,
    description: "Generate animations from text descriptions",
  },
  {
    id: "image-text",
    label: "Image + Text to Lottie",
    icon: ImagePlus,
    description: "Guide animation with a reference image and prompt",
  },
  {
    id: "video",
    label: "Video to Lottie",
    icon: Video,
    description: "Convert video content into vector animations",
  },
];

const EXAMPLE_PROMPTS: Record<Mode, string[]> = {
  text: [
    "A red heart beating with a gentle pulse animation",
    "A loading spinner with rotating dots that fade in and out",
    "A rocket launching upward with trailing flames",
    "A waving hand emoji with smooth back-and-forth motion",
    "A sun rising over mountains with rays extending outward",
  ],
  "image-text": [
    "Animate this icon with a bouncing motion",
    "Add a spinning rotation to this shape",
    "Make this character wave hello",
    "Add a glowing pulse effect to this logo",
  ],
  video: [],
};

// Estimate complexity from max tokens parameter
function getTimeEstimate(maxlen: number): string {
  if (maxlen <= 3000) return "~30-60s";
  if (maxlen <= 5556) return "~2-4 min";
  return "~5-10 min";
}

function getComplexityLabel(maxlen: number): string {
  if (maxlen <= 3000) return "Simple";
  if (maxlen <= 5556) return "Medium";
  return "Complex";
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export default function Playground() {
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<Backend>("modal");
  const [gpuStatus, setGpuStatus] = useState<GpuStatus>("checking");

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Last generation stats
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [lastCost, setLastCost] = useState<number | null>(null);

  // Check GPU status on mount and periodically
  useEffect(() => {
    const checkGpu = async () => {
      try {
        const res = await fetch("/api/generate", { method: "GET" });
        const data = await res.json();
        setGpuStatus(data.status === "active" ? "active" : "inactive");
      } catch {
        setGpuStatus("inactive");
      }
    };

    checkGpu();
    const interval = setInterval(checkGpu, 30000);
    return () => clearInterval(interval);
  }, []);

  // Timer effect
  useEffect(() => {
    if (isGenerating) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  const canGenerate = useCallback(() => {
    switch (mode) {
      case "text":
        return prompt.trim().length > 0;
      case "image-text":
        return imageFile !== null || imageUrl.trim().length > 0;
      case "video":
        return videoFile !== null;
    }
  }, [mode, prompt, imageFile, imageUrl, videoFile]);

  const handleGenerate = async () => {
    if (!canGenerate()) return;
    setIsGenerating(true);
    setError(null);
    setLastDuration(null);
    setLastCost(null);

    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("backend", backend);
      if (prompt) formData.append("prompt", prompt);
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imageUrl.trim()) {
        formData.append("image_url", imageUrl.trim());
      }
      if (videoFile) formData.append("video", videoFile);
      formData.append("temperature", params.temperature.toString());
      formData.append("top_p", params.top_p.toString());
      formData.append("top_k", params.top_k.toString());
      formData.append("repetition_penalty", params.repetition_penalty.toString());
      formData.append("num_candidates", params.num_candidates.toString());
      formData.append("maxlen", params.maxlen.toString());

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.lottie_json) {
        setAnimationData(data.lottie_json);
        if (backend === "modal") setGpuStatus("active");

        // Auto-save to library
        fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lottie_json: data.lottie_json,
            prompt: prompt || "",
            mode,
            duration_sec: data.duration_sec || 0,
            gpu_cost_usd: data.gpu_cost_usd || 0,
          }),
        }).catch(() => {});
      }

      if (data.duration_sec != null) setLastDuration(data.duration_sec);
      if (data.gpu_cost_usd != null) setLastCost(data.gpu_cost_usd);
    } catch {
      setError("Failed to generate. Check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* GPU Status + Backend selector */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          {/* GPU status indicator */}
          <div className="flex items-center gap-1.5">
            {gpuStatus === "active" ? (
              <Zap size={13} className="text-green-400" />
            ) : gpuStatus === "checking" ? (
              <div className="w-3 h-3 rounded-full border border-muted/40 border-t-muted animate-spin" />
            ) : (
              <ZapOff size={13} className="text-muted/50" />
            )}
            <span className="text-[11px] text-muted">
              GPU{" "}
              <span
                className={
                  gpuStatus === "active"
                    ? "text-green-400"
                    : gpuStatus === "checking"
                    ? "text-muted"
                    : "text-muted/50"
                }
              >
                {gpuStatus === "active"
                  ? "Active"
                  : gpuStatus === "checking"
                  ? "Checking..."
                  : "Standby"}
              </span>
            </span>
          </div>

          {gpuStatus === "inactive" && backend === "modal" && (
            <span className="text-[10px] text-muted/60">
              First request wakes GPU (~2 min cold start)
            </span>
          )}
        </div>

        {/* Backend toggle */}
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
          <button
            onClick={() => setBackend("modal")}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${
              backend === "modal"
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Modal GPU
          </button>
          <button
            onClick={() => setBackend("huggingface")}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${
              backend === "huggingface"
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            HF Space (Free)
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl mb-6">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-surface-2 text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main playground area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Input panel */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium">
              {MODES.find((m) => m.id === mode)?.label}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {MODES.find((m) => m.id === mode)?.description}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Image upload for image-text mode */}
            {mode === "image-text" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted block">
                  Reference Image
                </label>
                <FileUpload
                  accept="image/png,image/jpeg,image/webp"
                  type="image"
                  file={imageFile}
                  onFileChange={(f) => {
                    setImageFile(f);
                    if (f) setImageUrl("");
                  }}
                />
                {!imageFile && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted/50">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                {!imageFile && (
                  <div className="flex items-center gap-2">
                    <Link size={14} className="text-muted/50 shrink-0" />
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Video upload for video mode */}
            {mode === "video" && (
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">
                  Source Video
                </label>
                <FileUpload
                  accept="video/mp4,video/webm"
                  type="video"
                  file={videoFile}
                  onFileChange={setVideoFile}
                />
              </div>
            )}

            {/* Text prompt (always shown for text & image-text, hidden for video) */}
            {mode !== "video" && (
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">
                  {mode === "text" ? "Describe your animation" : "Animation instructions (optional)"}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "text"
                      ? "A red heart beating with a gentle pulse animation..."
                      : "Animate this with a bouncing motion..."
                  }
                  rows={4}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors resize-none"
                />

                {/* Example prompts */}
                {EXAMPLE_PROMPTS[mode].length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {EXAMPLE_PROMPTS[mode].map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(example)}
                        className="px-2 py-1 text-[10px] rounded-md bg-surface-2 text-muted hover:text-foreground hover:bg-border transition-colors"
                      >
                        {example.length > 40
                          ? example.slice(0, 40) + "..."
                          : example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Parameters */}
            <ParameterControls params={params} onChange={setParams} />

            {/* Time estimate */}
            <div className="flex items-center gap-2 text-[11px] text-muted/70">
              <Clock size={12} />
              <span>
                Estimated: <span className="text-muted">{getTimeEstimate(params.maxlen)}</span>
                {" "}({getComplexityLabel(params.maxlen)} — {params.maxlen} tokens)
              </span>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate() || isGenerating}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                canGenerate() && !isGenerating
                  ? "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20"
                  : "bg-surface-2 text-muted cursor-not-allowed"
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>
                    {backend === "modal" && gpuStatus === "inactive" && elapsed < 10
                      ? "Waking GPU..."
                      : `Generating... ${formatTimer(elapsed)}`}
                  </span>
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Generate Animation
                </>
              )}
            </button>

            {/* Generation stats (after completion) */}
            {lastDuration != null && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2 border border-border text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-muted">
                    <Clock size={11} />
                    {formatTimer(lastDuration)}
                  </span>
                  {lastCost != null && backend === "modal" && (
                    <span className="flex items-center gap-1 text-muted">
                      <DollarSign size={11} />
                      ${lastCost < 0.01 ? lastCost.toFixed(4) : lastCost.toFixed(3)} GPU cost
                    </span>
                  )}
                </div>
                <span className="text-muted/50">A10G @ $1.10/hr</span>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="px-3 py-2 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview panel */}
        <div
          className={`bg-surface rounded-xl border border-border overflow-hidden ${
            isGenerating ? "generating" : ""
          }`}
        >
          <LottiePreview
            animationData={animationData}
            isGenerating={isGenerating}
          />
        </div>
      </div>

      {/* Technical details */}
      <div className="mt-6 px-4 py-3 bg-surface rounded-xl border border-border">
        <div className="flex items-start gap-3">
          <Sparkles size={14} className="text-accent mt-0.5 shrink-0" />
          <div className="text-xs text-muted leading-relaxed">
            <strong className="text-foreground">How it works:</strong>{" "}
            OmniLottie extends Qwen2.5-VL with a specialized Lottie tokenizer
            that transforms JSON animation files into structured sequences of
            commands and parameters — shapes, animation functions, and control
            values. The model generates these parameterized Lottie tokens
            autoregressively, which are then decoded back into valid Lottie JSON
            for rendering as scalable vector animations.
          </div>
        </div>
      </div>
    </div>
  );
}
