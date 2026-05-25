import { Share } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * iOS: Safari 하단 공유 버튼 안내 배너
 * Android: beforeinstallprompt 이벤트 배너
 * 이미 닫았거나 standalone 모드면 렌더링 안 함
 */
export const InstallPrompt = () => {
  const { iosReady, dismiss } = useInstallPrompt();

  if (!iosReady) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[var(--z-toast)] animate-[slideUp_0.3s_ease-out]">
      <div className="mx-auto max-w-lg px-4 pb-4">
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-card border border-border shadow-[var(--shadow-modal)] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <img src="/logo-mark.png" alt="" className="h-6 w-6" />
          </div>

          <div className="flex flex-1 flex-col gap-0.5">
            <p className="type-body-strong text-foreground">앱으로 설치하기</p>
            <p className="type-body text-muted-foreground">
              하단{' '}
              <span className="inline-flex items-center gap-0.5 align-middle">
                <Share size={13} className="text-primary" />
              </span>{' '}
              공유 버튼 탭 후 <strong className="text-foreground">홈 화면에 추가</strong>를 선택하세요.
            </p>
          </div>

          <button
            onClick={dismiss}
            aria-label="닫기"
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors type-body-strong leading-none"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
