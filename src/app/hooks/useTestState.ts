import { useState } from 'react';

export function useTestState() {
  const [runningTests, setRunningTests] = useState<Array<{
    id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed';
  }>>([
    { id: 'run-001', name: '나의 진행 중인 테스트', groupId: 'TG-001', startTime: '2026-05-12 14:32', status: 'running' },
  ]);
  const [selectedRunningTestId, setSelectedRunningTestId] = useState<string | null>('run-001');
  const [retestCheckedIds, setRetestCheckedIds] = useState<Set<string>>(new Set());
  const [showRetestNavModal, setShowRetestNavModal] = useState(false);
  const [selectedScenarioGroupId, setSelectedScenarioGroupId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledAlarms, setScheduledAlarms] = useState<Array<{ time: string; id: string }>>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedRunningForDetail, setSelectedRunningForDetail] = useState<string | null>(null);
  const [selectedFailTC, setSelectedFailTC] = useState<string | null>(null);
  const [historyDetailTab, setHistoryDetailTab] = useState<'FAIL' | 'PASS'>('FAIL');

  return {
    runningTests, setRunningTests,
    selectedRunningTestId, setSelectedRunningTestId,
    retestCheckedIds, setRetestCheckedIds,
    showRetestNavModal, setShowRetestNavModal,
    selectedScenarioGroupId, setSelectedScenarioGroupId,
    selectedGroupIds, setSelectedGroupIds,
    showScheduleModal, setShowScheduleModal,
    scheduledAlarms, setScheduledAlarms,
    historyFilter, setHistoryFilter,
    historySearchQuery, setHistorySearchQuery,
    selectedExecutionId, setSelectedExecutionId,
    selectedRunningForDetail, setSelectedRunningForDetail,
    selectedFailTC, setSelectedFailTC,
    historyDetailTab, setHistoryDetailTab,
  };
}
