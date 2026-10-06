export type User = {
  id: string;
  username: string;
  name: string;
  avatar: number;
  email?: string;
  role?: 'user' | 'superadmin';
};
export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Playroom': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new Error('Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.');
  });
  const data = await response.json().catch(() => {
    throw new Error('Máy chủ chưa sẵn sàng. Vui lòng thử lại.');
  });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('auth:expired'));
    throw new Error(data.message || 'Không thể kết nối máy chủ.');
  }
  return data;
}
