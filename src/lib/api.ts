export type ApiResponse<T = any> = {
  data: T;
};

async function request<T = any>(
  method: string,
  url: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return {
    data: payload,
  };
}

export const api = {
  get<T = any>(url: string) {
    return request<T>('GET', url);
  },

  post<T = any>(url: string, body?: unknown) {
    return request<T>('POST', url, body);
  },

  put<T = any>(url: string, body?: unknown) {
    return request<T>('PUT', url, body);
  },

  delete<T = any>(url: string) {
    return request<T>('DELETE', url);
  },
};