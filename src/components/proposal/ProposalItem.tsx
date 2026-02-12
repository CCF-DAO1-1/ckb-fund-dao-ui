'use client';

import { useRouter } from "next/navigation";
import { Proposal } from "@/utils/proposalUtils";
import { ProposalListItem } from "@/server/proposal";
import { formatNumber, formatDate, ProposalStatus } from "@/utils/proposalUtils";
import { postUriToHref } from "@/lib/postUriHref";
import { useI18n } from "@/contexts/I18nContext";
import Tag from "@/components/ui/tag/Tag";
import Avatar from "@/components/common/Avatar";
import { getAvatarByDid } from "@/utils/avatarUtils";
import { useTranslation } from "@/utils/i18n";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";

interface ProposalItemProps {
  proposal: Proposal | ProposalListItem;
}

export default function ProposalItem({ proposal }: ProposalItemProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const { t } = useTranslation();

  // 兼容两种数据结构 (mockProposals 和 API)
  const isAPIFormat = 'record' in proposal;

  const title = isAPIFormat ? proposal.record.data.title : (proposal as Proposal).title;

  let budget: number;
  if (isAPIFormat) {
    budget = parseFloat(proposal.record.data.budget || '0');
  } else {
    const mockBudget = (proposal as Proposal).budget;
    budget = typeof mockBudget === 'string' ? parseFloat(mockBudget) : mockBudget;
  }

  const createdAt = isAPIFormat ? proposal.record.created : (proposal as Proposal).createdAt;

  const author = isAPIFormat
    ? {
      name: getUserDisplayNameFromInfo({
        displayName: proposal.author.displayName,
        handle: proposal.author.handle,
        did: proposal.author.did,
      }),
      did: proposal.author.did,
      avatar: getAvatarByDid(proposal.author.did)
    }
    : (proposal as Proposal).proposer;

  // 处理里程碑数据
  // progress 字段是当前进行中的里程碑索引（0-based）
  const milestones = isAPIFormat && proposal.record.data.milestones && proposal.record.data.milestones.length > 0
    ? {
      current: ('progress' in proposal && typeof proposal.progress === 'number')
        ? proposal.progress + 1  // progress 是 0-based 索引，current 是 1-based 显示
        : 1,
      total: proposal.record.data.milestones.length,
      // progress 是当前里程碑索引，转换为百分比：(当前进行到的里程碑 / 总数) * 100
      // progress=1 表示在第2个里程碑，应算作2个里程碑的进度
      progressPercentage: ('progress' in proposal && typeof proposal.progress === 'number')
        ? ((proposal.progress + 1) / proposal.record.data.milestones.length) * 100
        : 0,
    }
    : ('milestones' in proposal ? (proposal as Proposal).milestones : undefined);

  // 处理点击跳转到详情页
  const handleClick = () => {
    // 优先使用 proposal.uri，如果没有则使用 proposal.id
    const uri = ('uri' in proposal && proposal.uri) ? proposal.uri : (('id' in proposal && proposal.id) ? proposal.id : '');
    const path = `/${locale}/proposal/${postUriToHref(uri)}`;

    router.push(path);
  };

  const voting = !isAPIFormat && 'voting' in proposal ? (proposal as Proposal).voting : undefined;

  return (
    <li
      className="proposal-item-clickable"
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <h4 style={{ display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginRight: '8px'
          }}
          data-tooltip-id="my-tooltip"
          data-tooltip-content={title}
        >
          {title}
        </span>
        <Tag status={proposal.state} size="sm" />
      </h4>
      <div className="proposal_person">
        <Avatar did={author.did} size={40} alt="avatar" />
        <div className="name">
          <h3>{author.name}</h3>
          <p>{author.did}</p>
        </div>
        <p>{formatDate(createdAt, locale)}</p>
      </div>

      <div className="proposal_detail">
        <p>{t("proposalItem.budgetApplication")}</p>
        <p>{formatNumber(budget)} CKB</p>
      </div>

      {/* 投票状态显示 */}
      {voting && (
        <div className="proposal_voting">
          <div className="vote-item approve">
            <p>{t("proposalItem.approve")}</p>
            <p>{voting.approve}%</p>
          </div>
          <div className="vote-item oppose">
            <p>{t("proposalItem.oppose")}</p>
            <p>{voting.oppose}%</p>
          </div>
        </div>
      )}

      {/* 进度显示 */}
      {/* 进度显示 (仅在项目执行阶段及之后显示) */}
      {/* 进度显示 (仅在项目执行阶段及投票阶段) */}
      {(proposal.state >= ProposalStatus.IN_PROGRESS || proposal.state === ProposalStatus.INITIATION_VOTE) && (
        <div className="proposal_progress">
          {milestones ? (
            <>
              <p>{t("proposalItem.progress")}: {t("proposalItem.milestone")} {milestones.current}/{milestones.total}</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${'progressPercentage' in milestones ? milestones.progressPercentage : 0}%` }}
                ></div>
              </div>
            </>
          ) : voting ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#00E599' }}>{t("proposalItem.approve")}: {voting.approve}%</span>
                <span style={{ color: '#FF4D4F' }}>{t("proposalItem.oppose")}: {voting.oppose}%</span>
              </div>
              <div className="progress-bar" style={{ display: 'flex', overflow: 'hidden', height: '8px', borderRadius: '4px', backgroundColor: '#FF4D4F' }}>
                <div
                  style={{ width: `${voting.approve}%`, height: '100%', backgroundColor: '#00E599' }}
                ></div>
                {/* Remaining part is background color which acts as oppose bar */}
              </div>
            </>
          ) : (
            <>
              <p>{t("proposalItem.progress")}: -</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '0%' }}></div>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
