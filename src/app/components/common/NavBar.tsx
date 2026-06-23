import { useNavigate, useLocation } from 'react-router';
import { ChevronRight, Clock } from 'lucide-react';

interface Notification {
  id: string | number;
  message: string;
  time: string;
  read: boolean;
}

interface NavBarProps {
  selectedService: { name: string } | null;
  scheduledAlarms: Array<{ time: string; id: string }>;
  notificationOpen: boolean;
  setNotificationOpen: (fn: (prev: boolean) => boolean) => void;
  unreadNotifications: number;
  notifications: Notification[];
  agentImageSrc: string;
}

export function NavBar({
  selectedService,
  scheduledAlarms,
  notificationOpen,
  setNotificationOpen,
  notifications,
  agentImageSrc,
}: NavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isServicesPage = location.pathname === '/services';
  const isSetupPage = location.pathname === '/setup';
  const isAppShell = !isServicesPage && !isSetupPage;

  return (
    <div className="h-[72px] bg-white border-b border-[#e5e7eb] flex items-center px-5 gap-4 z-10 flex-shrink-0">
      {/* 로고 + 서비스 breadcrumb */}
      <div className={`flex items-center gap-2 flex-shrink-0 ${!isAppShell ? 'ml-[20px]' : ''}`}>
        {isAppShell && (
          <button
            onClick={() => navigate('/services')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#374151] hover:bg-gray-100 transition-colors"
            title="대시보드로 이동"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        <button
          onClick={() => navigate('/services')}
          className="text-[18px] font-extrabold text-[#3615CF] tracking-tight hover:opacity-80 transition-opacity"
        >
          QApilot
        </button>
        {selectedService && isAppShell && (
          <>
            <div className="w-px h-4 bg-[#e5e7eb]" />
            <span className="text-sm font-medium text-[#374151]">{selectedService.name}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* 우측: 예약알람 + pill + 캐릭터 + 벨 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {scheduledAlarms.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3615CF]/8 rounded-lg ">
            <Clock className="w-3.5 h-3.5 text-[#3615CF]" />
            <span className="text-xs font-medium text-[#3615CF]">
              {scheduledAlarms.map(a => a.time).join(', ')}
            </span>
          </div>
        )}

        {/* 알림 버튼 */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setNotificationOpen(prev => !prev)}
            className="relative w-11 h-11 rounded-full flex items-center justify-center select-none focus:outline-none transition-all"
            aria-label="알람 열기"
          >
            <img src={agentImageSrc} alt="QApilot" className="w-full h-full object-cover rounded-full" />
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary-blue text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
              1
            </span>
          </button>
          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50">
              <div className="p-4 border-b border-[#f0f0f0] font-semibold text-[#1a1a2e]">알림</div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map(notif => (
                  <div key={notif.id} className={`p-4 border-b border-[#f0f0f0] hover:bg-gray-50 ${!notif.read ? 'bg-[#3615CF]/5' : ''}`}>
                    <div className="text-sm text-[#1a1a2e]">{notif.message}</div>
                    <div className="text-xs text-[#6b7280] mt-1">{notif.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
