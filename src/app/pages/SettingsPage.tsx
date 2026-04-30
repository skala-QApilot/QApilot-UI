import { PageTitle } from '../components/common/PageTitle';
import { mockScenarios } from '../data/mockData';

export const SettingsPage = () => (
  <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
    <PageTitle title="설정" />
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Git 연동</label>
          <input type="text" placeholder="GitHub Repository URL" className="w-full p-2 border border-[#f0f0f0] rounded mb-2" />
          <input type="password" placeholder="API Key" className="w-full p-2 border border-[#f0f0f0] rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">야간 자동 루프</label>
          <div className="flex gap-4">
            <input type="time" className="p-2 border border-[#f0f0f0] rounded" defaultValue="22:00" />
            <select className="p-2 border border-[#f0f0f0] rounded">
              <option>매일</option>
              <option>주중만</option>
              <option>주말만</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">실행 대상 시나리오 범위</label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-[#f0f0f0] rounded p-3">
            {mockScenarios.map(scenario => (
              <label key={scenario.id} className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span className="text-sm">{scenario.id} - {scenario.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">결과 수신 방법</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="w-4 h-4" /><span className="text-sm">알림</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="w-4 h-4" /><span className="text-sm">이메일</span></label>
          </div>
          <input type="email" placeholder="email@example.com" className="w-full p-2 border border-[#f0f0f0] rounded" />
        </div>
        <button className="w-full px-4 py-3 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded font-medium">
          저장
        </button>
      </div>
    </div>
  </div>
);
