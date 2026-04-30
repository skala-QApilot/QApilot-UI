import { FileText, Plus, Upload } from 'lucide-react';
import { FourColorBar } from '../components/common/FourColorBar';
import { PageTitle } from '../components/common/PageTitle';
import { mockFiles, mockHITL, mockSummaryData, mockTestHistory } from '../data/mockData';

export function HomePage({
  setCurrentPage,
  navigateToHistory,
}: {
  setCurrentPage: (page: string) => void;
  navigateToHistory: (filter: string) => void;
}) {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <PageTitle title="대시보드" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div onClick={() => setCurrentPage('RTM')}
            className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-[#6b7280] text-sm mb-2">RTM 이행률</div>
            <div className="text-3xl font-semibold text-[#1a1a2e]">{mockSummaryData.requirementCoverage}%</div>
          </div>
          <div onClick={() => setCurrentPage('시나리오')}
            className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-[#6b7280] text-sm mb-2">전체 시나리오 수</div>
            <div className="text-3xl font-semibold text-[#1a1a2e]">{mockSummaryData.scenarioCount}개</div>
          </div>
          <div onClick={() => navigateToHistory('FAIL')}
            className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-[#6b7280] text-sm mb-2">에러</div>
            <div className="text-3xl font-semibold text-[#FF9A86]">{mockSummaryData.errorCount}건</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0]">
            <div className="font-semibold mb-4">HISTORY</div>
            <div className="space-y-5">
              {mockTestHistory.map(test => (
                <div key={test.id} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-sm">{test.id}</div>
                    <span className="text-[#6b7280] text-xs">{test.date}</span>
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    PASS {test.pass} · FAIL {test.fail} · HITL {test.hitlPending} · 미실행 {test.notRun}
                  </div>
                  <FourColorBar
                    pass={test.pass}
                    fail={test.fail}
                    hitl={test.hitlPending}
                    notRun={test.notRun}
                    onClickFail={() => navigateToHistory('FAIL')}
                    onClickHitl={() => navigateToHistory('HITL')}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0]">
              <div className="flex justify-between items-center mb-4">
                <div className="font-semibold">FILES</div>
                <button className="px-3 py-1.5 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 파일 추가
                </button>
              </div>
              <div className="space-y-3">
                {mockFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded border border-[#f0f0f0] hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#6b7280]" />
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-[#6b7280]">{file.version} • {file.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.reflected
                        ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">시나리오 반영됨</span>
                        : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">미반영</span>}
                      <button className="px-3 py-1 bg-white border border-[#f0f0f0] rounded text-sm hover:bg-gray-50 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> 업데이트 +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0]">
              <div className="font-semibold mb-4">HITL 처리</div>
              <div className="space-y-3">
                {mockHITL.map(item => (
                  <div key={item.id} className="p-4 rounded border border-[#f0f0f0] hover:bg-gray-50">
                    <div className="text-sm mb-3">{item.description}</div>
                    <div className="flex gap-2">
                      <button className="px-4 py-1.5 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded text-sm">승인</button>
                      <button className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded text-sm hover:bg-gray-50">거절</button>
                      <button className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded text-sm hover:bg-gray-50">수정 후 승인</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
