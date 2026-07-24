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
import { TurnByTurnSteps } from "./RoutePanel";

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
    const iconSize = 32;
    if (type === "turn" || type === "end of road" || type === "fork") {
      if (modifier?.includes("left"))
        return <CornerUpLeft size={iconSize} className="text-white" />;
      if (modifier?.includes("right"))
        return <CornerUpRight size={iconSize} className="text-white" />;
    }
    if (type === "depart")
      return <Compass size={iconSize} className="text-white animate-pulse" />;
    if (type === "arrive")
      return <Flag size={iconSize} className="text-white animate-bounce" />;
    if (type === "rotary" || type === "roundabout")
      return <RotateCcw size={iconSize} className="text-white" />;
    if (type === "merge" || type === "on ramp" || type === "off ramp")
      return <ArrowUp size={iconSize} className="text-white rotate-45" />;
    return <ArrowUp size={iconSize} className="text-white" />;
  };

  const formatDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain custom-scrollbar">
      
      {/* 1. KHU VỰC HƯỚNG DẪN CHÍNH (UPCOMING TURN BANNER - GOOGLE MAPS STYLE) */}
      <div className="flex items-center gap-4 bg-emerald-600 dark:bg-emerald-700 p-4 rounded-2xl shadow-md text-white">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30 shrink-0">
          {currentStep ? getStepIcon(currentStep.maneuver.type, currentStep.maneuver.modifier) : <Compass size={32} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-black text-white">
            {distanceToNextStep > 0 ? formatDistance(distanceToNextStep) : "---"}
          </p>
          <p className="text-sm font-semibold text-white leading-snug mt-0.5 line-clamp-2">
            {currentStep?.maneuver.instruction || "Đi thẳng theo hướng dẫn"}
          </p>
          {nextStep && (
            <p className="text-[10px] text-emerald-200 mt-1 truncate">
              Tiếp theo: {nextStep.maneuver.instruction}
            </p>
          )}
        </div>
      </div>

      {/* 2. DANH SÁCH BƯỚC ĐI CHI TIẾT (COLLAPSIBLE TURN-BY-TURN STEPS) */}
      {steps && steps.length > 0 && (
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <TurnByTurnSteps steps={steps} />
        </div>
      )}

      {/* 3. THÔNG TIN HÀNH TRÌNH TỔNG QUAN (SUMMARY) */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
        <div>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider block uppercase">Thời gian</span>
          <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{totalTimeMin} phút</span>
        </div>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
        <div className="text-center">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider block uppercase">Khoảng cách</span>
          <span className="text-base font-extrabold text-slate-700 dark:text-slate-200">{totalDistanceKm} km</span>
        </div>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
        <div className="text-right">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider block uppercase">Chế độ</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30">
            {isSimulationMode ? "Mô phỏng" : "GPS thực tế"}
          </span>
        </div>
      </div>

      {/* 4. BỘ ĐIỀU KHIỂN ÂM THANH & CÁC BƯỚC ĐI */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={onToggleVoice}
          className={`p-3 rounded-xl transition-all border ${
            isVoiceMuted
              ? "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
          }`}
          title={isVoiceMuted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {isVoiceMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Nút Skip bước đi */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevStep}
            disabled={currentStepIndex <= 0}
            className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
            title="Màn trước"
          >
            <SkipBack size={16} />
          </button>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2">
            {currentStepIndex + 1}/{steps.length}
          </span>
          <button
            onClick={onNextStep}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
            title="Màn sau"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>

      {/* 5. ĐIỀU KHIỂN MÔ PHỎNG (Chỉ hiển thị khi ở chế độ simulation) */}
      {isSimulationMode && (
        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Tốc độ mô phỏng</span>
            <div className="flex gap-1">
              {[1, 2, 5, 10].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onChangeSimulationSpeed(speed)}
                  className={`text-[10px] font-black px-2 py-1 rounded-md transition-colors ${
                    simulationSpeed === speed
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onToggleSimulation}
            className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
              isSimulating
                ? "bg-amber-600/10 text-amber-500 border-amber-500/20 hover:bg-amber-600/20"
                : "bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-md shadow-blue-500/20"
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

      {/* 6. NÚT KẾT THÚC HÀNH TRÌNH */}
      <button
        onClick={onStopNavigation}
        className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/25 active:scale-[0.98]"
      >
        <Square size={14} className="fill-current" />
        KẾT THÚC HÀNH TRÌNH
      </button>
    </div>
  );
}
