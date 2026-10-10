import React, { useState, useEffect } from 'react';
import type { StoryboardResponse, StoryboardCard } from '../services/apiService';
import { apiService } from '../services/apiService';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Clock,
  Layers,
  FileSearch,
  BookOpen
} from 'lucide-react';

interface AIIncidentStoryboardProps {
  incidentId: string;
  onSelectEvent?: (eventId: string) => void;
  onOpenInspector?: (eventId: string) => void;
}

export const AIIncidentStoryboard: React.FC<AIIncidentStoryboardProps> = ({
  incidentId,
  onOpenInspector
}) => {
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    card_1_observed: true,
    card_2_sequence: true,
    card_4_possible_explanation: true
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService.getIncidentExplain(incidentId)
      .then((data) => {
        if (isMounted) {
          setStoryboard(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load incident explanation');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const getBadgeStyle = (label: StoryboardCard['label']) => {
    switch (label) {
      case 'CONFIRMED OBSERVATION':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          desc: 'Directly recorded in source logs'
        };
      case 'CORROBORATED FINDING':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-300',
          icon: <ShieldCheck className="w-4 h-4 text-sky-600" />,
          desc: 'Cross-verified across multiple channels'
        };
      case 'POSSIBLE INTERPRETATION':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          desc: 'Evidence-supported hypothesis'
        };
      case 'UNKNOWN / INSUFFICIENT EVIDENCE':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <HelpCircle className="w-4 h-4 text-slate-500" />,
          desc: 'Unrecorded or ambiguous'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <Info className="w-4 h-4 text-slate-500" />,
          desc: 'General note'
        };
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Generating plain-English incident summary...</p>
          <p className="text-xs text-slate-500 mt-0.5">Synthesizing evidence across NODE_A, NODE_B, and NODE_C</p>
        </div>
      </div>
    );
  }

  if (error || !storyboard) {
    return (
      <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Unable to Load Incident Explanation</h4>
          <p className="text-xs text-rose-600 mt-0.5">{error || 'Unknown error occurred.'}</p>
        </div>
      </div>
    );
  }

  const plain = storyboard.plain_english_summary;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                AI Incident Explanation
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-sky-100 text-sky-800 border border-sky-200">
                Plain-English Summary
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Designed for both technical and non-technical readers • Backed by 100% source evidence
            </p>
          </div>
        </div>

        {/* Engine Transparency Badge */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600">
          <Cpu className="w-4 h-4 text-sky-600" />
          <span>{storyboard.llm_provider_status.provider}</span>
        </div>
      </div>

      {/* 5-Section Plain English Storyboard */}
      <div className="space-y-4">
        {/* Section A: What Happened */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Section A • What Happened?
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              CONFIRMED OBSERVATION
            </span>
          </div>
          <p className="text-sm font-sans text-slate-800 leading-relaxed font-medium">
            {plain?.section_a_what_happened || storyboard.confidence_explanation}
          </p>
        </div>

        {/* Section B: How Did It Unfold (Numbered Chronological Steps) */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Section B • How Did It Unfold? (Chronological Sequence)
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
              CORROBORATED FINDING
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {plain?.section_b_how_it_unfolded.map((step) => (
              <div
                key={step.step}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
              >
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {step.step}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="font-bold text-slate-900">{step.node}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {step.timestamp}
                      </span>
                    </div>
                    <p className="text-xs font-sans text-slate-800 mt-1 leading-normal">
                      {step.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenInspector && onOpenInspector(step.source_record_id)}
                  className="self-end sm:self-center px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-slate-300 hover:border-sky-300 rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors"
                >
                  <FileSearch className="w-3 h-3" /> Evidence
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section C: What Evidence Supports This */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Section C • What Evidence Supports This?
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              {storyboard.event_count} Verified Records
            </span>
          </div>
          <p className="text-xs font-sans text-slate-700">
            Every statement is backed by immutable HTML log entries. Click any reference below to inspect the original engineering row:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {storyboard.cards[0]?.evidence_references.slice(0, 8).map((refId) => (
              <button
                key={refId}
                onClick={() => onOpenInspector && onOpenInspector(refId)}
                className="px-2.5 py-1 rounded bg-slate-50 hover:bg-sky-50 text-slate-800 hover:text-sky-800 border border-slate-300 hover:border-sky-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <span>{refId}</span>
                <ExternalLink className="w-3 h-3 text-sky-600" />
              </button>
            ))}
            {storyboard.event_count > 8 && (
              <span className="px-2.5 py-1 rounded bg-slate-50 text-slate-500 border border-slate-200 text-xs font-mono">
                +{storyboard.event_count - 8} more verified source records
              </span>
            )}
          </div>
        </div>

        {/* Section D: What Do We Know vs What Remains Uncertain */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center space-x-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                What We Know (Direct Facts)
              </h4>
            </div>
            <p className="text-xs font-sans text-slate-700 leading-relaxed">
              {plain?.section_d_known_vs_uncertain.what_is_known}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center space-x-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                What Remains Uncertain (No Speculation)
              </h4>
            </div>
            <p className="text-xs font-sans text-slate-700 leading-relaxed">
              {plain?.section_d_known_vs_uncertain.what_is_uncertain}
            </p>
          </div>
        </div>

        {/* Section E: What Happened Afterward */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Section E • What Happened Afterward? (Recovery Status)
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              OUTCOME
            </span>
          </div>
          <p className="text-xs font-sans text-slate-800 leading-relaxed">
            {plain?.section_e_what_happened_afterward || 'Subsequent log records show normal operational transitions.'}
          </p>
        </div>
      </div>

      {/* Technical Engineering Expander (Collapsible) */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            Technical Engineering Cards & Epistemic Badges ({storyboard.cards.length} Cards)
          </span>
          <div className="flex items-center gap-1 text-sky-700">
            <span>{showTechnicalDetails ? 'Hide Technical Details' : 'Show Technical Details'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTechnicalDetails && (
          <div className="space-y-3 pt-3 border-t border-slate-200 animate-fadeIn">
            {storyboard.cards.map((card) => {
              const badge = getBadgeStyle(card.label);
              const isExp = !!expandedCards[card.card_id];

              return (
                <div key={card.card_id} className="rounded-lg bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div
                    onClick={() => toggleCard(card.card_id)}
                    className="p-3.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      {badge.icon}
                      <span className="text-xs font-bold text-slate-900 font-sans">{card.title}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.bg}`}>
                        {card.label}
                      </span>
                      {isExp ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </div>

                  {isExp && (
                    <div className="p-3.5 pt-0 text-xs text-slate-700 space-y-2 border-t border-slate-100 font-sans">
                      <p className="mt-2 text-slate-800">{card.text}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
                        <div className="p-2 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                          <strong>Strengths:</strong> {card.strengths.join('; ')}
                        </div>
                        <div className="p-2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                          <strong>Limitations:</strong> {card.limitations.join('; ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
