import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import type { ChannelSetting } from '../../types';

const COLOR_PALETTE = [
  '#e11d48', '#f97316', '#eab308', '#22c55e',
  '#10b981', '#06b6d4', '#3b82f6', '#1e40af',
  '#6366f1', '#8b5cf6', '#ec4899', '#94a3b8',
];

interface ChannelCardProps {
  setting: ChannelSetting;
  onUpdate: (patch: Partial<Pick<ChannelSetting, 'channel' | 'color' | 'commission'>>) => void;
  onDelete: () => void;
  ko: boolean;
}

const ChannelCard = ({ setting, onUpdate, onDelete, ko }: ChannelCardProps) => {
  const [showPalette, setShowPalette] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [commInput, setCommInput] = useState(String(setting.commission));
  const [nameInput, setNameInput] = useState(setting.channel);

  const handleCommBlur = () => {
    const v = parseFloat(commInput);
    if (!isNaN(v) && v >= 0 && v <= 100) onUpdate({ commission: Math.round(v * 10) / 10 });
    else setCommInput(String(setting.commission));
  };

  const handleNameBlur = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== setting.channel) onUpdate({ channel: trimmed });
    else setNameInput(setting.channel);
  };

  return (
    <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 색상 도트 — 클릭 시 팔레트 토글 */}
        <button
          onClick={() => setShowPalette(v => !v)}
          className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white/50 shadow-sm ring-1 ring-border/40 hover:scale-110 transition-transform"
          style={{ backgroundColor: setting.color }}
          title={ko ? '색상 변경' : 'Change color'}
        />

        {/* 채널 이름 */}
        {setting.isBuiltIn ? (
          <span className="flex-1 text-[13px] font-semibold text-foreground">{setting.channel}</span>
        ) : (
          <input
            className="flex-1 text-[13px] font-semibold text-foreground bg-transparent border-b border-border/40 focus:border-primary focus:outline-none pb-0.5 min-w-0"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleNameBlur}
          />
        )}

        {/* 수수료 입력 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            className="w-12 text-right text-[13px] font-semibold text-foreground bg-muted/50 border border-border/30 rounded-md px-1.5 py-1 focus:outline-none focus:border-primary"
            value={commInput}
            onChange={e => setCommInput(e.target.value)}
            onBlur={handleCommBlur}
          />
          <span className="text-[12px] text-muted-foreground">%</span>
        </div>

        {/* 삭제 버튼 (커스텀 채널만) */}
        {!setting.isBuiltIn && (
          confirmDel ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onDelete()}
                className="text-[11px] font-bold text-white bg-destructive px-2 py-1 rounded-lg"
              >
                {ko ? '확인' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-[11px] text-muted-foreground"
              >
                {ko ? '취소' : 'No'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="text-[11px] text-destructive/70 hover:text-destructive transition-colors flex-shrink-0 ml-1"
            >
              {ko ? '삭제' : 'Del'}
            </button>
          )
        )}
      </div>

      {/* 색상 팔레트 */}
      {showPalette && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {COLOR_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => { onUpdate({ color: c }); setShowPalette(false); }}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
              style={{
                backgroundColor: c,
                boxShadow: setting.color === c ? `0 0 0 2px var(--card), 0 0 0 3.5px ${c}` : undefined,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Add form ──────────────────────────────────────────────────
interface AddFormProps {
  onSave: (channel: string, color: string, commission: number) => void;
  onCancel: () => void;
  ko: boolean;
}

const AddForm = ({ onSave, onCancel, ko }: AddFormProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [comm, setComm] = useState('0');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const commVal = parseFloat(comm);
    onSave(trimmed, color, isNaN(commVal) ? 0 : Math.min(100, Math.max(0, commVal)));
  };

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[12px] font-bold text-foreground">{ko ? '새 채널 추가' : 'Add Channel'}</p>
      <div className="flex gap-2">
        {/* 색상 */}
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 3px ${c}` : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-border/40 bg-muted/30 focus:outline-none focus:border-primary placeholder:text-muted-foreground/40"
          placeholder={ko ? '채널명 (예: 야놀자)' : 'Channel name'}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            min={0} max={100} step={0.5}
            className="w-14 text-right text-[13px] px-2 py-2 rounded-lg border border-border/40 bg-muted/30 focus:outline-none focus:border-primary"
            value={comm}
            onChange={e => setComm(e.target.value)}
          />
          <span className="text-[12px] text-muted-foreground">%</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1 py-2 rounded-lg text-[12px] font-bold bg-primary text-white disabled:opacity-40 transition-opacity"
        >
          {ko ? '추가' : 'Add'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-muted-foreground bg-muted/50 transition-colors hover:bg-muted"
        >
          {ko ? '취소' : 'Cancel'}
        </button>
      </div>
    </div>
  );
};

// ── Main section ──────────────────────────────────────────────
const ChannelSettingsSection = () => {
  const { channelSettings, addChannelSetting, updateChannelSetting, deleteChannelSetting } = useStore();
  const { language } = useTranslation();
  const ko = language === 'ko';
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {channelSettings.map(s => (
        <ChannelCard
          key={s.id}
          setting={s}
          onUpdate={patch => updateChannelSetting(s.id, patch)}
          onDelete={() => deleteChannelSetting(s.id)}
          ko={ko}
        />
      ))}

      {showAddForm ? (
        <AddForm
          ko={ko}
          onSave={(channel, color, commission) => {
            addChannelSetting({ channel, color, commission });
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border/50 text-[12px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <span className="text-[16px] leading-none">+</span>
          {ko ? '채널 추가' : 'Add Channel'}
        </button>
      )}

      {/* 헬프 텍스트 */}
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed px-0.5 mt-0.5">
        {ko
          ? '수수료율은 예약 등록 시 자유롭게 변경할 수 있습니다. 여기서 설정한 값은 예약 입력 화면에 자동으로 채워지는 기본값일 뿐, 절대적으로 고정되지 않습니다.'
          : 'Commission rates can be changed any time when adding a booking. Values here are defaults that auto-fill the booking form — they are not locked.'}
      </p>
    </div>
  );
};

export default ChannelSettingsSection;
