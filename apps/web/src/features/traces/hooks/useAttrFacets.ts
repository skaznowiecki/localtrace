import { useQuery } from "@tanstack/react-query"

import { attrKeysQuery, attrValuesQuery } from "../api/traces.api"

export function useAttrKeys() {
  const query = useQuery(attrKeysQuery())
  return {
    keys: query.data ?? [],
    isLoading: query.isLoading,
  }
}

export function useAttrValues(key: string | null) {
  const query = useQuery(attrValuesQuery(key))
  return {
    values: query.data ?? [],
    isLoading: query.isPending && key != null && key.length > 0,
  }
}
