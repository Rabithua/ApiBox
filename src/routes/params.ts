import type { RequestParams } from "../types/index.ts";

/**
 * 从 URL 和额外路径段解析请求参数：pathParams, queryParams, headers
 */
export function parseRequestParams(
  url: URL,
  additionalParams: string[],
  config: any,
  endpoint: string
): RequestParams {
  const pathParams: Record<string, string> = {};
  const queryParams: Record<string, string> = {};
  const headers: Record<string, string> = {};

  const endpointConfig = config.endpoints[endpoint];

  // 从URL路径中提取 path 类型参数
  let paramIndex = 0;
  if (endpointConfig.parameters) {
    for (const [paramName, paramConfig] of Object.entries(
      endpointConfig.parameters
    )) {
      if ((paramConfig as any).type === "path") {
        if (paramIndex < additionalParams.length) {
          pathParams[paramName] = additionalParams[paramIndex];
          paramIndex++;
        }
      }
    }
  }

  // 查询参数
  for (const [key, value] of url.searchParams.entries()) {
    queryParams[key] = value;
  }

  return { pathParams, queryParams, headers };
}
