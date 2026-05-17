import { X } from 'lucide-react';

export interface EventInputData {
  title: string;
  startDate: string;
  endDate: string;
  type: 'booking' | 'maintenance' | 'note';
  notes: string;
}

interface EventInputModalProps {
  onClose: () => void;
  onSubmit?: (data: EventInputData) => void;
}

const EventInputModal = ({ onClose, onSubmit }: EventInputModalProps) => {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-overlay flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-modal w-[480px] border border-border animate-[fadeIn_0.2s_ease]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground tracking-wide">이벤트 추가</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-10 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">이벤트 입력 폼 준비 중입니다.</p>
        </div>
      </div>
    </div>
  );
};

export default EventInputModal;
