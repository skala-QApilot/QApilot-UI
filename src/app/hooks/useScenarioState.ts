import { useState, useRef } from 'react';
import type { UiScenario, UiScenarioVersion, UiTestCase } from '../../store/scenarioStore';

/** ScenarioPage 의 in-flight TC 편집 버퍼 — store 의 testCasesByTs 와 같은 shape. */
type TestCaseMap = Record<string, UiTestCase[]>;

/**
 * ScenarioPage 의 로컬 UI 상태 + in-flight 편집 상태 묶음.
 *
 * dynamicScenarios/dynamicAIItems/dynamicTestCases 는 API 가 채워주기 전까진 빈 컨테이너.
 * 사용 측은 trace polling 완료 시 setDynamic* 로 store 데이터를 주입.
 */
export function useScenarioState() {
  const [selectedScenario, setSelectedScenario] = useState('TS1');
  const [scenarioPageTab, setScenarioPageTab] = useState<'TOTAL' | 'CHANGE'>('TOTAL');
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState('');
  const [scenarioChangeFilter, setScenarioChangeFilter] = useState(false);
  const [selectedScenarioVersion, setSelectedScenarioVersion] = useState('change-2');
  const [scenarioVersions, setScenarioVersions] = useState<UiScenarioVersion[]>([]);
  const [favoriteVersionIds, setFavoriteVersionIds] = useState<Set<string>>(new Set());
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null);
  const [selectedNetworkNodeId, setSelectedNetworkNodeId] = useState<string | null>(null);
  const [expandedTSForTC, setExpandedTSForTC] = useState<string[]>(['TS1']);
  const [selectedTCIds, setSelectedTCIds] = useState<string[]>([]);
  const [expandedTC, setExpandedTC] = useState<string[]>(['TC1']);
  const [showTestGroupModal, setShowTestGroupModal] = useState(false);
  const [showLinkedFiles, setShowLinkedFiles] = useState(false);
  const [changeItemActions, setChangeItemActions] = useState<Record<number, 'approved' | 'deferred'>>({});
  const [aiItemActions, setAiItemActions] = useState<Record<string, 'approved' | 'deferred' | 'rejected'>>({});
  const [showDeferredAIItems, setShowDeferredAIItems] = useState(false);
  const [codeChangeDetected, setCodeChangeDetected] = useState(false);
  const [dynamicScenarios, setDynamicScenarios] = useState<UiScenario[]>([]);
  const [dynamicAIItems, setDynamicAIItems] = useState<Record<string, { reason: string; trigger: 'file' | 'chatbot' | 'code'; timestamp: string }>>({});
  const [dynamicTestCases, setDynamicTestCases] = useState<TestCaseMap>({});
  const [loadingItemKey, setLoadingItemKey] = useState<string | null>(null);
  const [editingDetailItem, setEditingDetailItem] = useState<{ type: 'ts' | 'tc' | 'tv'; key: string; value: string } | null>(null);
  const [selectedTvId, setSelectedTvId] = useState<string | null>(null);
  const [selectedScenarioNode, setSelectedScenarioNode] = useState<{ level: 'TS' | 'TC' | 'TV'; tsId: string; tcId?: string; tvId?: string }>({ level: 'TS', tsId: 'TS1' });
  const [highlightedScenarioRow, setHighlightedScenarioRow] = useState<string | null>(null);
  const [scenarioQuickOpen, setScenarioQuickOpen] = useState(false);
  const [scenarioHistoryOpen, setScenarioHistoryOpen] = useState(false);
  const [detailPanelRow, setDetailPanelRow] = useState<{ level: 'TS' | 'TC' | 'TV'; tsId: string; tcId?: string; tvId?: string } | null>(null);
  const [expandedTSMain, setExpandedTSMain] = useState<string[]>(['TS1', 'TS2', 'TS3', 'TS4']);
  const [expandedTCMain, setExpandedTCMain] = useState<string[]>([]);
  const [scenarioViewMode, setScenarioViewMode] = useState<'table' | 'graph'>('table');
  const [fileChangeDetected, setFileChangeDetected] = useState(false);

  const codeChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return {
    selectedScenario, setSelectedScenario,
    scenarioPageTab, setScenarioPageTab,
    scenarioSearchQuery, setScenarioSearchQuery,
    scenarioChangeFilter, setScenarioChangeFilter,
    selectedScenarioVersion, setSelectedScenarioVersion,
    scenarioVersions, setScenarioVersions,
    favoriteVersionIds, setFavoriteVersionIds,
    hoveredVersionId, setHoveredVersionId,
    selectedNetworkNodeId, setSelectedNetworkNodeId,
    expandedTSForTC, setExpandedTSForTC,
    selectedTCIds, setSelectedTCIds,
    expandedTC, setExpandedTC,
    showTestGroupModal, setShowTestGroupModal,
    showLinkedFiles, setShowLinkedFiles,
    changeItemActions, setChangeItemActions,
    aiItemActions, setAiItemActions,
    showDeferredAIItems, setShowDeferredAIItems,
    codeChangeDetected, setCodeChangeDetected,
    dynamicScenarios, setDynamicScenarios,
    dynamicAIItems, setDynamicAIItems,
    dynamicTestCases, setDynamicTestCases,
    loadingItemKey, setLoadingItemKey,
    editingDetailItem, setEditingDetailItem,
    selectedTvId, setSelectedTvId,
    selectedScenarioNode, setSelectedScenarioNode,
    highlightedScenarioRow, setHighlightedScenarioRow,
    scenarioQuickOpen, setScenarioQuickOpen,
    scenarioHistoryOpen, setScenarioHistoryOpen,
    detailPanelRow, setDetailPanelRow,
    expandedTSMain, setExpandedTSMain,
    expandedTCMain, setExpandedTCMain,
    scenarioViewMode, setScenarioViewMode,
    fileChangeDetected, setFileChangeDetected,
    codeChangeTimerRef,
    fileChangeTimerRef,
  };
}
