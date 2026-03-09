"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useTranslations } from 'next-intl';

export interface GenerationParams {
  temperature: number;
  top_p: number;
  top_k: number;
  repetition_penalty: number;
  num_candidates: number;
  maxlen: number;
}

interface ParameterControlsProps {
  params: GenerationParams;
  onChange: (params: GenerationParams) => void;
}

export const DEFAULT_PARAMS: GenerationParams = {
  temperature: 0.9,
  top_p: 0.25,
  top_k: 5,
  repetition_penalty: 1.0,
  num_candidates: 1,
  maxlen: 5556,
};

export default function ParameterControls({
  params,
  onChange,
}: ParameterControlsProps) {
  const t = useTranslations('params');
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof GenerationParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-2 transition-colors"
      >
        <span className="text-xs font-medium text-muted">
          {t('title')}
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-muted" />
        ) : (
          <ChevronDown size={14} className="text-muted" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">{t('temperature.label')}</label>
              <span className="text-xs font-mono text-foreground">
                {params.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={params.temperature}
              onChange={(e) =>
                update("temperature", parseFloat(e.target.value))
              }
              className="w-full"
            />
            <p className="text-[10px] text-muted/60 mt-0.5">
              {t('temperature.help')}
            </p>
          </div>

          {/* Top-p */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">{t('topP.label')}</label>
              <span className="text-xs font-mono text-foreground">
                {params.top_p.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={params.top_p}
              onChange={(e) => update("top_p", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[10px] text-muted/60 mt-0.5">
              {t('topP.help')}
            </p>
          </div>

          {/* Top-k */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">{t('topK.label')}</label>
              <span className="text-xs font-mono text-foreground">
                {params.top_k}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={params.top_k}
              onChange={(e) => update("top_k", parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-[10px] text-muted/60 mt-0.5">
              {t('topK.help')}
            </p>
          </div>

          {/* Repetition Penalty */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">{t('repetitionPenalty.label')}</label>
              <span className="text-xs font-mono text-foreground">
                {params.repetition_penalty.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="2"
              step="0.05"
              value={params.repetition_penalty}
              onChange={(e) =>
                update("repetition_penalty", parseFloat(e.target.value))
              }
              className="w-full"
            />
            <p className="text-[10px] text-muted/60 mt-0.5">
              {t('repetitionPenalty.help')}
            </p>
          </div>

          {/* Num Candidates (Best-of-N) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">
                {t('numCandidates.label')}
              </label>
              <span className="text-xs font-mono text-foreground">
                {params.num_candidates}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={params.num_candidates}
              onChange={(e) =>
                update("num_candidates", parseInt(e.target.value))
              }
              className="w-full"
            />
            <p className="text-[10px] text-muted/60 mt-0.5">
              {t('numCandidates.help')}
            </p>
          </div>

          {/* Max Token Length */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">{t('maxLen.label')}</label>
              <span className="text-xs font-mono text-foreground">
                {params.maxlen}
              </span>
            </div>
            <input
              type="range"
              min="1024"
              max="8192"
              step="256"
              value={params.maxlen}
              onChange={(e) => update("maxlen", parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-[10px] text-muted/60 mt-0.5">
              {t('maxLen.help')}
            </p>
          </div>

          {/* Reset button */}
          <button
            onClick={() => onChange(DEFAULT_PARAMS)}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            {t('reset')}
          </button>
        </div>
      )}
    </div>
  );
}
