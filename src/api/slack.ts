import { api } from './client';

/** 수신자별 Slack DM 전송 결과 — sent / not_found / failed. */
export interface SlackNotifyResult {
  email: string;
  status: 'sent' | 'not_found' | 'failed' | string;
}

export async function sendSlackNotification(
  serviceId: string,
  runId: string,
  formData: FormData,
): Promise<SlackNotifyResult[]> {
  // api 인스턴스의 기본 Content-Type('application/json')을 명시적으로
  // 해제해야 한다. 해제하지 않으면 axios가 FormData를 JSON으로
  // 직렬화해버려(파일 데이터 소실) 서버 멀티파트 파싱이 실패하고
  // COMMON_003 (500) 으로 귀결된다. undefined로 덮어쓰면 axios/브라우저가
  // FormData에 boundary 를 포함한 'multipart/form-data; boundary=...'
  // 헤더를 자동 생성한다.
  const res = await api.post<{ results: SlackNotifyResult[] }>(
    `/api/services/${encodeURIComponent(serviceId)}/results/${encodeURIComponent(runId)}/slack-notify`,
    formData,
    { headers: { 'Content-Type': undefined } },
  );
  return res.data.results;
}
