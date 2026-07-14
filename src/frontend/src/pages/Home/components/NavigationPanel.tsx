import React from "react";
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  Flag,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square,
  Compass,
} from "lucide-react";
import { RouteStep } from "../hooks/useMapRouting";

interface NavigationPanelProps {
  steps: RouteStep[];
  currentStepIndex: number;
  distanceToNextStep: number; // meters
  totalDistanceKm: number;
  totalTimeMin: number;
  isVoiceMuted: boolean;
  onToggleVoice: () => void;
  isSimulationMode: boolean;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSimulationSpeed: (speed: number) => void;
  onStopNavigation: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export function NavigationPanel({
  steps,
  currentStepIndex,
  distanceToNextStep,
  totalDistanceKm,
  totalTimeMin,
  isVoiceMuted,
  onToggleVoice,
  isSimulationMode,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  onChangeSimulationSpeed,
  onStopNavigation,
  onNextStep,
  onPrevStep,
}: NavigationPanelProps) {
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  const getStepIcon = (type: string, modifier?: string) => {
    const iconSize = 36;
    if (type === "turn" || type === "end of road" || type === "fork") {
      if (modifier?.includes("left"))
        return <CornerUpLeft size={iconSize} className="text-blue-500" />;
      if (modifier?.includes("right"))
        return <CornerUpRight size={iconSize} className="text-blue-500" />;
    }
    if (type === "depart")
      return <Compass size={iconSize} className="text-emerald-500 animate-pulse" />;
    if (type === "arrive")
      return <Flag size={iconSize} className="text-red-500 animate-bounce" />;
    if (type === "rotary" || type === "roundabout")
      return <RotateCcw size={iconSize} className="text-violet-500" />;
    if (type === "merge" || type === "on ramp" || type === "off ramp")
      return <ArrowUp size={iconSize} className="text-blue-400 rotate-45" />;
    return <ArrowUp size={iconSize} className="text-slate-500" />;
  };

  const formatDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  return (
    <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-800 text-white p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
      
      {/* 1. KHU VỰC HƯỚNG DẪN CHÍNH (UPCOMING TURN BANNER) */}
      <div className="flex items-center gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/40">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner shrink-0">
          {currentStep ? getStepIcon(currentStep.maneuver.type, currentStep.maneuver.modifier) : <Compass size={36} className="text-blue-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-black text-blue-400">
            {distanceToNextStep > 0 ? formatDistance(distanceToNextStep) : "---"}
          </p>
          <p className="text-sm font-semibold text-slate-100 leading-snug mt-1 line-clamp-2">
            {currentStep?.maneuver.instruction || "Đi thẳng theo hướng dẫn"}
          </p>
          {nextStep && (
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              Tiếp theo: {nextStep.maneuver.instruction}
            </p>
          )}
        </div>
      </div>

      {/* 2. THÔNG TIN HÀNH TRÌNH TỔNG QUAN (SUMMARY) */}
      <div className="flex justify-between items-center bg-slate-800/30 px-4 py-3 rounded-xl border border-slate-800/50">
        <div>
          <span className="text-[9px] font-bold text-slate-500 tracking-wider block uppercase">Thời gian</span>
          <span className="text-base font-extrabold text-blue-400">{totalTimeMin} phút</span>
        </div>
        <div className="w-px h-6 bg-slate-800" />
        <div className="text-center">
          <span className="text-[9px] font-bold text-slate-500 tracking-wider block uppercase">Khoảng cách</span>
          <span className="text-base font-extrabold text-slate-200">{totalDistanceKm} km</span>
        </div>
        <div className="w-px h-6 bg-slate-800" />
        <div className="text-right">
          <span className="text-[9px] font-bold text-slate-500 tracking-wider block uppercase">Chế độ</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {isSimulationMode ? "Mô phỏng" : "GPS thực tế"}
          </span>
        </div>
      </div>

      {/* 3. BỘ ĐIỀU KHIỂN ÂM THANH & CÁC BƯỚC ĐI */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <button
          onClick={onToggleVoice}
          className={`p-3 rounded-xl transition-all border ${
            isVoiceMuted
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
          }`}
          title={isVoiceMuted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {isVoiceMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Nút Skip bước đi (Hữu ích khi test hoặc đi thực tế) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevStep}
            disabled={currentStepIndex <= 0}
            className="p-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 rounded-xl transition-colors"
            title="Màn trước"
          >
            <SkipBack size={16} />
          </button>
          <span className="text-xs font-bold text-slate-400 px-2">
            {currentStepIndex + 1}/{steps.length}
          </span>
          <button
            onClick={onNextStep}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 rounded-xl transition-colors"
            title="Màn sau"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>

      {/* 4. ĐIỀU KHIỂN MÔ PHỎNG (Chỉ hiển thị khi ở chế độ simulation) */}
      {isSimulationMode && (
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Tốc độ mô phỏng</span>
            <div className="flex gap-1">
              {[1, 2, 5, 10].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onChangeSimulationSpeed(speed)}
                  className={`text-[10px] font-black px-2 py-1 rounded-md transition-colors ${
                    simulationSpeed === speed
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onToggleSimulation}
            className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
              isSimulating
                ? "bg-amber-600/10 text-amber-400 border-amber-500/20 hover:bg-amber-600/20"
                : "bg-blue-600 text-white border-transparent hover:bg-blue-700"
            }`}
          >
            {isSimulating ? (
              <>
                <Pause size={14} /> Tạm dừng mô phỏng
              </>
            ) : (
              <>
                <Play size={14} /> Chạy mô phỏng
              </>
            )}
          </button>
        </div>
      )}

      {/* 5. NÚT KẾT THÚC HÀNH TRÌNH */}
      <button
        onClick={onStopNavigation}
        className="w-full bg-red-600/15 border border-red-500/30 text-red-400 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-950/20"
      >
        <Square size={14} className="fill-current" />
        KẾT THÚC HÀNH TRÌNH
      </button>
    </div>
  );
}
