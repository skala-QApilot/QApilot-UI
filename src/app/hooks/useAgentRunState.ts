import { useState } from 'react';

export function useAgentRunState() {
  const [testDepth, setTestDepth] = useState<0 | 1>(0);
  const [selectedTestGroup, setSelectedTestGroup] = useState<string | null>(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [completedAgentStages, setCompletedAgentStages] = useState<string[]>([]);
  const [currentAgentStage, setCurrentAgentStage] = useState<string>('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [scenarioSidebarTab, setScenarioSidebarTab] = useState<'TOTAL' | 'PASS' | 'FILTERED'>('TOTAL');
  const [expandedScenarios, setExpandedScenarios] = useState<string[]>(['TS1']);
  const [expandedTestCases, setExpandedTestCases] = useState<string[]>(['TC1']);
  const [highlightedLogIdx, setHighlightedLogIdx] = useState<number | null>(null);

  return {
    testDepth, setTestDepth,
    selectedTestGroup, setSelectedTestGroup,
    groupSearchQuery, setGroupSearchQuery,
    editingGroupId, setEditingGroupId,
    editingGroupName, setEditingGroupName,
    groupNames, setGroupNames,
    isTestRunning, setIsTestRunning,
    completedAgentStages, setCompletedAgentStages,
    currentAgentStage, setCurrentAgentStage,
    showCompletionModal, setShowCompletionModal,
    scenarioSidebarTab, setScenarioSidebarTab,
    expandedScenarios, setExpandedScenarios,
    expandedTestCases, setExpandedTestCases,
    highlightedLogIdx, setHighlightedLogIdx,
  };
}
