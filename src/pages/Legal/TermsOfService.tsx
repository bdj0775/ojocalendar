import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const EFFECTIVE_DATE = '2026-06-19';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-10 h-14 flex items-center gap-3 px-6 border-b border-border bg-card/80 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          뒤로
        </button>
        <span className="text-sm font-semibold">이용약관</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 text-[14px] leading-relaxed text-foreground">
        <h1 className="text-2xl font-bold mb-2">이용약관</h1>
        <p className="text-muted-foreground mb-8">시행일: {EFFECTIVE_DATE}</p>

        <div className="mb-8 p-4 rounded-xl border border-amber-300/60 bg-amber-50 text-amber-900 text-[13px]">
          본 문서는 일반 템플릿을 기반으로 작성된 초안입니다. 실제 서비스 운영 전 법무 전문가(변호사 또는 법무 자문)의 검토를 받으시기 바랍니다.
          유료 결제 기능을 도입하는 경우 환불·정산 관련 조항을 반드시 추가해야 합니다.
        </div>

        <Section title="제1조 (목적)">
          <p>
            본 약관은 OZO Calendar(이하 "회사")가 제공하는 예약 관리 서비스(이하 "서비스")의 이용과 관련하여
            회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </Section>

        <Section title="제2조 (용어의 정의)">
          <ul className="list-disc pl-5 space-y-1">
            <li>"서비스"란 회사가 제공하는 숙소 예약 관리 및 수익 분석 웹/앱 서비스를 말합니다.</li>
            <li>"이용자"란 본 약관에 따라 회사와 이용계약을 체결하고 서비스를 이용하는 자를 말합니다.</li>
          </ul>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <p>
            본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 회사는 필요한 경우 관련 법령에 위배되지
            않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
          </p>
        </Section>

        <Section title="제4조 (서비스의 제공 및 변경)">
          <p>
            회사는 예약 캘린더, 대시보드 통계, iCal 연동을 통한 외부 채널(Airbnb, Booking.com, Naver 등)
            예약 동기화 기능을 제공합니다. 회사는 서비스의 내용을 변경할 수 있으며, 이 경우 사전에 공지합니다.
          </p>
        </Section>

        <Section title="제5조 (서비스 이용의 제한 및 중단)">
          <p>
            회사는 시스템 점검, 외부 채널(OTA) API 정책 변경 등 불가피한 사유가 있는 경우 서비스 제공을
            일시적으로 중단할 수 있습니다.
          </p>
        </Section>

        <Section title="제6조 (이용자의 의무)">
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자는 본인의 계정 정보를 제3자에게 누설하거나 양도할 수 없습니다.</li>
            <li>이용자는 등록하는 예약 정보의 정확성에 대한 책임을 부담합니다.</li>
            <li>iCal 연동을 통해 수집되는 외부 채널 데이터의 정확성은 해당 채널의 정책에 따릅니다.</li>
          </ul>
        </Section>

        <Section title="제7조 (회사의 책임 제한)">
          <p>
            회사는 외부 OTA(Airbnb, Booking.com 등) 채널의 정책 변경, API 중단 등 회사의 통제 범위를 벗어난
            사유로 발생한 데이터 동기화 오류에 대해서는 책임을 지지 않습니다. 서비스는 예약 관리를 보조하는
            도구이며, 실제 예약 확정·취소 등 거래는 각 OTA 플랫폼의 정책을 따릅니다.
          </p>
        </Section>

        <Section title="제8조 (계약 해지 및 회원 탈퇴)">
          <p>
            이용자는 설정 화면에서 언제든지 회원 탈퇴를 신청할 수 있으며, 탈퇴 시 관련 법령이 정하는 경우를
            제외하고 보유하던 개인정보 및 등록 데이터는 지체 없이 삭제됩니다.
          </p>
        </Section>

        <Section title="제9조 (분쟁 해결)">
          <p>
            본 약관과 관련하여 분쟁이 발생할 경우 회사와 이용자는 우선 협의를 통해 해결하며, 협의가 이루어지지
            않을 경우 관련 법령 및 상관례에 따릅니다.
          </p>
        </Section>

        <Section title="문의">
          <p>이메일: support@ozocalendar.com</p>
        </Section>
      </main>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h2 className="text-base font-semibold mb-2">{title}</h2>
    <div className="text-muted-foreground">{children}</div>
  </section>
);

export default TermsOfService;
