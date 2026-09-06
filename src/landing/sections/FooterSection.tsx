import { MessageCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FooterSection = () => {
  return (
    <footer className="w-full bg-white border-t border-border/40 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col gap-5 text-[13px] text-muted-foreground/80 font-medium">
          <div className="flex items-center gap-4 text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">개인정보 취급방침</Link>
          </div>
          
          <p>Copyright &copy; OZO Calendar, inc. All right reserved.</p>
          
          <p>Contact us at <a href="mailto:support@ozocalendar.com" className="hover:text-foreground transition-colors">support@ozocalendar.com</a></p>
          
          <div className="flex items-center gap-3 mt-2">
            <a href="#" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <MessageCircle size={18} className="text-muted-foreground" />
            </a>
            <a href="#" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <Mail size={18} className="text-muted-foreground" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
