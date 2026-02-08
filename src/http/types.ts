export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

export interface RequestOptions {
  headers?: Record<string, string>;
}
