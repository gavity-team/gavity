import type { Org, OrgMember } from '#shared/utils/orgs';
import { queryOptions } from '@tanstack/vue-query';

export const orgsQueryOptions = queryOptions({
  queryKey: ['orgs'] as const,
  queryFn: () => $fetch<Org[]>('/api/orgs'),
});
export function orgQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['orgs', id] as const,
    queryFn: () => $fetch<Org>(`/api/orgs/${id}`),
    enabled: Boolean(id),
  });
}
export function orgMembersQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['orgs', id, 'members'] as const,
    queryFn: () => $fetch<OrgMember[]>(`/api/orgs/${id}/members`),
    enabled: Boolean(id),
  });
}
