import { api } from './client';

export interface DomainFile {
  file_id: string;
  name: string;
  version: string;
  version_number: number;
  reflected: boolean;
  uploaded_at: string;
  size_bytes: number;
  mime_type: string;
  storage_path: string;
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/files`;
}

export async function listFiles(serviceId: string): Promise<DomainFile[]> {
  const res = await api.get<{ files: DomainFile[]; count: number }>(basePath(serviceId));
  return res.data.files;
}

export async function uploadFile(serviceId: string, file: File): Promise<DomainFile> {
  const form = new FormData();
  form.append('file', file);
  // api 인스턴스의 기본 Content-Type('application/json')을 해제해야
  // axios가 FormData를 JSON으로 직렬화하지 않고 그대로 전송하며,
  // 브라우저가 boundary 를 포함한 'multipart/form-data; boundary=...'
  // 헤더를 자동 생성한다.
  const res = await api.post<{ file: DomainFile }>(basePath(serviceId), form, {
    headers: { 'Content-Type': undefined },
  });
  return res.data.file;
}

export async function addFileVersion(serviceId: string, fileId: string, file: File): Promise<DomainFile> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ file: DomainFile }>(`${basePath(serviceId)}/${encodeURIComponent(fileId)}/versions`, form, {
    headers: { 'Content-Type': undefined },
  });
  return res.data.file;
}
