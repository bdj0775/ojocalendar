import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const EFFECTIVE_DATE = '2026-06-19';

const PrivacyPolicy = () => {
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
        <span className="text-sm font-semibold">개인정보처리방침</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 text-[14px] leading-relaxed text-foreground">
        <h1 className="text-2xl font-bold mb-2">개인정보처리방침</h1>
        <p className="text-muted-foreground mb-8">시행일: {EFFECTIVE_DATE}</p>

        <div className="mb-8 p-4 rounded-xl border border-amber-300/60 bg-amber-50 text-amber-900 text-[13px]">
          본 문서는 일반 템플릿을 기반으로 작성된 초안입니다. 실제 서비스 운영 전 법무 전문가(변호사 또는 법무 자문)의 검토를 받으시기 바랍니다.
        </div>

        <p className="mb-6">
          OZO Calendar(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
          회사는 본 개인정보처리방침을 통해 이용자가 제공하는 개인정보가 어떠한 목적과 방식으로 이용되고 있으며,
          개인정보 보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
        </p>

        <Section title="1. 수집하는 개인정보 항목">
          <p>회사는 회원가입, 서비스 이용 과정에서 다음과 같은 개인정보를 수집합니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>필수 항목: 이메일 주소, 비밀번호(또는 소셜 로그인 식별자)</li>
            <li>서비스 이용 항목: 등록한 숙소 정보, 예약 정보(게스트명, 체크인/체크아웃 일자, 예약 채널 등)</li>
            <li>자동 수집 항목: 접속 로그, 쿠키, 서비스 이용 기록</li>
          </ul>
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적">
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 식별 및 본인 확인, 서비스 제공을 위한 로그인 처리</li>
            <li>예약 관리, 대시보드 통계 등 핵심 서비스 기능 제공</li>
            <li>서비스 개선, 고객 문의 응대</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <p>
            회사는 이용자가 회원 탈퇴를 요청하거나 수집·이용 목적이 달성된 경우 해당 개인정보를 지체 없이 파기합니다.
            단, 관계 법령에서 일정 기간 보관을 요구하는 경우 해당 기간 동안 보관합니다.
          </p>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 이용자가 사전에 동의한 경우,
            또는 법령의 규정에 의거한 경우에는 예외로 합니다.
          </p>
        </Section>

        <Section title="5. 개인정보 처리의 위탁">
          <p>
            회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 외부 업체에 위탁하고 있습니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Supabase Inc. — 데이터베이스 호스팅 및 인증 처리</li>
            <li>Vercel Inc. — 웹 애플리케이션 호스팅</li>
          </ul>
        </Section>

        <Section title="6. 이용자의 권리와 행사 방법">
          <p>
            이용자는 언제든지 등록된 본인의 개인정보를 조회, 수정할 수 있으며, 회원 탈퇴를 통해 개인정보 삭제를
            요청할 수 있습니다. 회원 탈퇴는 설정 화면에서 직접 진행할 수 있습니다.
          </p>
        </Section>

        <Section title="7. 개인정보의 안전성 확보 조치">
          <p>
            회사는 개인정보 보호를 위해 Row-Level Security(RLS) 등 접근 제어 기술을 적용하여 본인 외 타인이
            이용자의 데이터에 접근할 수 없도록 조치하고 있습니다. 다만 이용자가 고객 지원을 요청한 경우,
            문의 응대를 위해 운영자가 관련 예약·숙소 정보를 열람할 수 있습니다. 이 경우에도 이용자의
            동의 없이 정보를 수정하지 않으며, 열람 내역은 내부적으로 기록·관리됩니다.
          </p>
        </Section>

        <Section title="8. 개인정보 보호책임자">
          <p>
            개인정보 관련 문의는 아래 연락처로 접수해 주시기 바랍니다.
            <br />
            이메일: support@ozocalendar.com
          </p>
        </Section>

        <Section title="9. 고지의 의무">
          <p>
            본 방침은 법령, 정책 또는 보안 기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있으며 변경 시
            서비스 내 공지사항을 통해 고지합니다.
          </p>
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

export default PrivacyPolicy;
