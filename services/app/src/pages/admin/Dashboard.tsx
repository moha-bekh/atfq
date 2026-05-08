import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/features/user/api';
import { wikiApi } from '@/features/wiki/api/wiki.api';
import { useAppStore } from '@/stores/app.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { RoleRequestHistoryEntry, ReviewRoleRequest } from '@/features/user/types';
import type { Version } from '@/features/wiki/types';

type ReviewStatus = {
  type: 'success' | 'error';
  message: string;
};
type DashboardSection = 'roles' | 'wiki';
type DashboardMode = 'pending' | 'history';
type WikiReviewGroup = {
  id: string;
  versions: Version[];
};

const parseDateValue = (value?: string | null) => {
  if (!value) return 0;

  const dotTimestamp = value.match(/^(\d+)\.(\d+)$/);
  const date = dotTimestamp
    ? new Date(Number(dotTimestamp[1]) * 1000)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatDate = (value?: string | null) => {
  if (!value) return 'unknown';

  const timestamp = parseDateValue(value);
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const groupWikiVersions = (versions: Version[]): WikiReviewGroup[] => {
  const sortedVersions = [...versions].sort((a, b) => (
    parseDateValue(a.created_at) - parseDateValue(b.created_at)
  ));
  const groups: WikiReviewGroup[] = [];
  const groupWindowMs = 3000;

  sortedVersions.forEach((version) => {
    const versionTime = parseDateValue(version.created_at);
    const lastGroup = groups[groups.length - 1];
    const lastVersion = lastGroup?.versions[lastGroup.versions.length - 1];
    const lastVersionTime = parseDateValue(lastVersion?.created_at);
    const belongsToLastGroup = lastGroup &&
      lastVersion?.author === version.author &&
      Math.abs(versionTime - lastVersionTime) <= groupWindowMs;

    if (belongsToLastGroup) {
      lastGroup.versions.push(version);
      return;
    }

    groups.push({
      id: `${version.author}-${version.created_at || version.version_id}-${version.version_id}`,
      versions: [version],
    });
  });

  return groups.reverse();
};

const roleTone = (role: string) => {
  const normalizedRole = role.toLowerCase();

  if (normalizedRole === 'admin') return 'border-error/30 bg-error/10 text-error';
  if (normalizedRole === 'moderator') return 'border-main/30 bg-main/10 text-main';

  return 'border-sub/20 bg-sub-alt/10 text-sub';
};

const statusTone = (status?: string) => {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === 'approved') return 'border-main/30 bg-main/10 text-main';
  if (normalizedStatus === 'rejected') return 'border-error/30 bg-error/10 text-error';

  return 'border-sub/20 bg-sub-alt/10 text-sub';
};

function RequestRow({
  request,
  isReviewing,
  canReview,
  onReview,
}: {
  request: RoleRequestHistoryEntry;
  isReviewing: boolean;
  canReview: boolean;
  onReview: (payload: ReviewRoleRequest) => void;
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const requestStatus = request.status || 'pending';
  const isPending = requestStatus.toLowerCase() === 'pending';
  const userLabel = request.user_username || request.user_email || request.user_id;

  return (
    <article className="grid gap-5 rounded-lg border border-main/10 bg-sub-alt/5 p-5 shadow-inner">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${roleTone(request.requested_role)}`}>
              {request.requested_role}
            </span>
            <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone(requestStatus)}`}>
              {requestStatus}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-sub">
              {formatDate(request.updated_at || request.created_at)}
            </span>
          </div>

          <p className="mt-4 font-mono text-[11px] text-sub">
            user:<span className="text-text">{userLabel}</span>
            {request.user_username && request.user_email && (
              <span className="ml-2 text-sub/70">{request.user_email}</span>
            )}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-text">
            {request.reason || 'No justification provided.'}
          </p>
        </div>

        {isPending && canReview && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              disabled={isReviewing}
              onClick={() => onReview({ request_id: request.request_id, approve: true })}
              className="text-[10px] uppercase tracking-widest"
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isReviewing}
              onClick={() => setShowReject((value) => !value)}
              className="border-error/40 text-error hover:bg-error/10 text-[10px] uppercase tracking-widest"
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      {isPending && !canReview && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-[10px] font-bold uppercase tracking-widest text-error">
          Only admins can review role requests.
        </div>
      )}

      {requestStatus.toLowerCase() === 'rejected' && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-error">Rejection Reason</p>
          <p className="text-sm leading-relaxed text-text">
            {request.rejection_reason || 'No rejection reason provided.'}
          </p>
        </div>
      )}

      {isPending && canReview && showReject && (
        <form
          className="grid gap-3 border-t border-main/10 pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            onReview({
              request_id: request.request_id,
              approve: false,
              rejection_reason: rejectionReason || 'Rejected from dashboard',
            });
          }}
        >
          <Input
            label="Rejection reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Explain why this role request is rejected..."
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="outline"
              disabled={isReviewing}
              className="border-error/40 text-error hover:bg-error/10 text-[10px] uppercase tracking-widest"
            >
              Confirm Reject
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}

function WikiReviewGroupRow({
  group,
  isReviewing,
  canReview,
  onApprove,
  onReject,
}: {
  group: WikiReviewGroup;
  isReviewing: boolean;
  canReview: boolean;
  onApprove: (versionIds: number[]) => void;
  onReject: (versionIds: number[]) => void;
}) {
  const [primaryVersion] = group.versions;
  const versionIds = group.versions.map((version) => version.version_id);
  const isGrouped = group.versions.length > 1;
  const preview = primaryVersion?.content?.trim() || 'No content provided.';

  return (
    <article className="grid gap-5 rounded-lg border border-main/10 bg-sub-alt/5 p-5 shadow-inner">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-main/30 bg-main/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-main">
              {isGrouped ? 'wiki change set' : 'wiki version'}
            </span>
            <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone(primaryVersion.status)}`}>
              {primaryVersion.status}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-sub">
              {formatDate(primaryVersion.created_at)}
            </span>
          </div>

          <h2 className="mt-4 break-words font-display text-2xl font-bold italic text-text">
            {primaryVersion.title || 'Untitled wiki change'}
          </h2>
          <p className="mt-2 break-all font-mono text-[11px] text-sub">
            author:{primaryVersion.author} versions:{versionIds.join(', ')}
          </p>
          <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-text">
            {preview}
          </p>
          {isGrouped && (
            <div className="mt-5 grid gap-2 border-t border-main/10 pt-4">
              {group.versions.map((version) => (
                <div key={version.version_id} className="rounded-lg border border-main/10 bg-bg/30 p-3">
                  <p className="break-words text-sm font-bold text-text">
                    {version.title || 'Untitled part'}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-sub">
                    node:{version.node_id} version:{version.version_id}
                  </p>
                  <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs leading-5 text-text/80">
                    {version.content?.trim() || 'No content provided.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {canReview && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              disabled={isReviewing}
              onClick={() => onApprove(versionIds)}
              className="text-[10px] uppercase tracking-widest"
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isReviewing}
              onClick={() => onReject(versionIds)}
              className="border-error/40 text-error hover:bg-error/10 text-[10px] uppercase tracking-widest"
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      {!canReview && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-[10px] font-bold uppercase tracking-widest text-error">
          Wiki moderation requires wiki:publish access.
        </div>
      )}
    </article>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const roles = useAppStore((state) => state.roles);
  const permissions = useAppStore((state) => state.permissions);
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [section, setSection] = useState<DashboardSection>('roles');
  const [roleMode, setRoleMode] = useState<DashboardMode>('pending');
  const normalizedRoles = useMemo(() => roles.map((role) => role.toLowerCase()), [roles]);
  const isAdmin = normalizedRoles.includes('admin');
  const isModerator = normalizedRoles.includes('moderator');

  const canReviewRoleRequests = useMemo(() => {
    return isAdmin;
  }, [isAdmin]);

  const canReviewWikiRequests = useMemo(() => {
    return isAdmin || isModerator || permissions.includes('wiki:publish');
  }, [isAdmin, isModerator, permissions]);
  const canAccessDashboard = canReviewRoleRequests || canReviewWikiRequests;
  const activeSection = !canReviewRoleRequests && canReviewWikiRequests ? 'wiki' : section;
  const dashboardSections: DashboardSection[] = [
    ...(canReviewRoleRequests ? (['roles'] as const) : []),
    ...(canReviewWikiRequests ? (['wiki'] as const) : []),
  ];

  const {
    data: roleRequestsData,
    isLoading: isRoleRequestsLoading,
    isError: isRoleRequestsError,
    refetch: refetchRoleRequests,
  } = useQuery({
    queryKey: ['role-requests', roleMode],
    queryFn: () => roleMode === 'pending' ? userApi.listRoleRequests() : userApi.listAllRoleRequests(),
    enabled: activeSection === 'roles' && canReviewRoleRequests,
  });

  const {
    data: wikiPendingData,
    isLoading: isWikiPendingLoading,
    isError: isWikiPendingError,
    refetch: refetchWikiPending,
  } = useQuery({
    queryKey: ['wiki', 'pending'],
    queryFn: () => wikiApi.getAllPending(),
    enabled: activeSection === 'wiki' && canReviewWikiRequests,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: ReviewRoleRequest) => userApi.reviewRoleRequest(payload),
    onSuccess: async (_profile, payload) => {
      setStatus({
        type: 'success',
        message: payload.approve ? 'Role request approved' : 'Role request rejected',
      });
      await queryClient.invalidateQueries({ queryKey: ['role-requests', 'pending'] });
      await queryClient.invalidateQueries({ queryKey: ['role-requests', 'history'] });
    },
    onError: () => {
      setStatus({ type: 'error', message: 'Unable to review this role request' });
    },
  });

  const approveWikiMutation = useMutation({
    mutationFn: async (versionIds: number[]) => {
      for (const versionId of versionIds) {
        await wikiApi.approveVersion(versionId);
      }
    },
    onSuccess: async (_result, versionIds) => {
      setStatus({
        type: 'success',
        message: versionIds.length > 1 ? 'Wiki change set approved' : 'Wiki change approved',
      });
      await queryClient.invalidateQueries({ queryKey: ['wiki', 'pending'] });
    },
    onError: () => {
      setStatus({ type: 'error', message: 'Unable to approve this wiki change set' });
    },
  });

  const rejectWikiMutation = useMutation({
    mutationFn: async (versionIds: number[]) => {
      for (const versionId of versionIds) {
        await wikiApi.rejectVersion(versionId);
      }
    },
    onSuccess: async (_result, versionIds) => {
      setStatus({
        type: 'success',
        message: versionIds.length > 1 ? 'Wiki change set rejected' : 'Wiki change rejected',
      });
      await queryClient.invalidateQueries({ queryKey: ['wiki', 'pending'] });
    },
    onError: () => {
      setStatus({ type: 'error', message: 'Unable to reject this wiki change set' });
    },
  });

  const roleRequests = roleRequestsData?.requests ?? [];
  const wikiVersions = wikiPendingData?.versions ?? [];
  const wikiReviewGroups = useMemo(() => groupWikiVersions(wikiVersions), [wikiVersions]);
  const isCurrentSectionLoading = activeSection === 'roles' ? isRoleRequestsLoading : isWikiPendingLoading;
  const refreshCurrentSection = () => {
    if (activeSection === 'roles') {
      refetchRoleRequests();
      return;
    }

    refetchWikiPending();
  };

  if (!canAccessDashboard) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-128px)] max-w-4xl flex-col justify-center px-4 pb-10 pt-16 font-main text-text md:px-8">
        <section className="rounded-lg border border-error/20 bg-error/5 p-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-error">
            Protected Dashboard
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold italic text-text">
            Access restricted
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-sub">
            You need admin, moderator, or wiki:publish access to open this dashboard.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-128px)] max-w-6xl flex-col gap-8 px-4 pb-10 pt-16 font-main text-text md:px-8">
      <header className="flex flex-col gap-6 border-b border-main/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold italic tracking-tight text-text">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sub">
            Review pending role requests and wiki contributions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dashboardSections.map((nextSection) => (
            <button
              key={nextSection}
              type="button"
              onClick={() => {
                setSection(nextSection);
                setStatus(null);
              }}
              className={`h-[42px] rounded-lg border-2 px-4 text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeSection === nextSection
                  ? 'border-main bg-main text-bg'
                  : 'border-sub text-sub hover:border-text hover:text-text'
              }`}
            >
              {nextSection}
            </button>
          ))}
          <button
            type="button"
            onClick={refreshCurrentSection}
            disabled={
              isCurrentSectionLoading ||
              (activeSection === 'roles' && !canReviewRoleRequests) ||
              (activeSection === 'wiki' && !canReviewWikiRequests)
            }
            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border-2 border-sub text-sub transition-all hover:border-text hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh dashboard"
            title="Refresh"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={`h-4 w-4 ${isCurrentSectionLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 1-15.1 6.6" />
              <path d="M3 12A9 9 0 0 1 18.1 5.4" />
              <path d="M18 2v4h-4" />
              <path d="M6 22v-4h4" />
            </svg>
          </button>
        </div>
      </header>

      {activeSection === 'roles' && (
        <section className="flex flex-wrap items-center gap-2">
          {(['pending', 'history'] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => setRoleMode(nextMode)}
              className={`h-[38px] rounded-lg border px-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                roleMode === nextMode
                  ? 'border-main bg-main/10 text-main'
                  : 'border-sub/40 text-sub hover:border-text hover:text-text'
              }`}
            >
              {nextMode}
            </button>
          ))}
        </section>
      )}

      {activeSection === 'roles' && !canReviewRoleRequests && (
        <section className="rounded-lg border border-error/20 bg-error/5 p-5 text-[10px] font-bold uppercase tracking-widest text-error">
          Only admins can review role requests and assign roles.
        </section>
      )}

      {activeSection === 'wiki' && !canReviewWikiRequests && (
        <section className="rounded-lg border border-error/20 bg-error/5 p-5 text-[10px] font-bold uppercase tracking-widest text-error">
          Wiki moderation requires admin, moderator, or wiki:publish access.
        </section>
      )}

      {status && (
        <section className={`rounded-lg border p-4 text-[10px] font-bold uppercase tracking-widest ${
          status.type === 'error'
            ? 'border-error/20 bg-error/5 text-error'
            : 'border-main/20 bg-main/5 text-main'
        }`}
        >
          {status.message}
        </section>
      )}

      {activeSection === 'roles' && (
        <section className="grid gap-4">
          {isRoleRequestsLoading ? (
            <div className="rounded-lg border border-main/10 bg-sub-alt/5 p-8 text-center text-[10px] font-bold uppercase tracking-widest text-sub animate-pulse">
              Loading role requests...
            </div>
          ) : isRoleRequestsError ? (
            <div className="rounded-lg border border-error/20 bg-error/5 p-8 text-center text-[10px] font-bold uppercase tracking-widest text-error">
              Unable to load role requests.
            </div>
          ) : roleRequests.length === 0 ? (
            <div className="rounded-lg border border-main/10 bg-sub-alt/5 p-8 text-center text-[10px] font-bold uppercase tracking-widest text-sub">
              {roleMode === 'pending' ? 'No pending role request.' : 'No role request history.'}
            </div>
          ) : (
            roleRequests.map((request) => (
              <RequestRow
                key={request.request_id}
                request={request}
                isReviewing={reviewMutation.isPending || !canReviewRoleRequests}
                canReview={canReviewRoleRequests}
                onReview={reviewMutation.mutate}
              />
            ))
          )}
        </section>
      )}

      {activeSection === 'wiki' && (
        <section className="grid gap-4">
          {isWikiPendingLoading ? (
          <div className="rounded-lg border border-main/10 bg-sub-alt/5 p-8 text-center text-[10px] font-bold uppercase tracking-widest text-sub animate-pulse">
            Loading wiki changes...
          </div>
        ) : isWikiPendingError ? (
          <div className="rounded-lg border border-error/20 bg-error/5 p-8 text-center text-[10px] font-bold uppercase tracking-widest text-error">
            Unable to load wiki changes.
          </div>
        ) : wikiReviewGroups.length === 0 ? (
          <div className="rounded-lg border border-main/10 bg-sub-alt/5 p-8 text-center text-[10px] font-bold uppercase tracking-widest text-sub">
            No pending wiki change.
          </div>
        ) : (
          wikiReviewGroups.map((group) => (
            <WikiReviewGroupRow
              key={group.id}
              group={group}
              isReviewing={approveWikiMutation.isPending || rejectWikiMutation.isPending || !canReviewWikiRequests}
              canReview={canReviewWikiRequests}
              onApprove={approveWikiMutation.mutate}
              onReject={rejectWikiMutation.mutate}
            />
          ))
        )}
        </section>
      )}
    </div>
  );
}
