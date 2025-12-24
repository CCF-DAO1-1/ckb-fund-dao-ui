"use client";

import "react-tooltip/dist/react-tooltip.css";
import ProposalItem from "../../components/proposal/ProposalItem";
import { useProposalList } from "../../hooks/useProposalList";
import useUserInfoStore from "@/store/userInfo";
import { useEffect, useRef, useState } from "react";
import { ProposalStatus } from "@/utils/proposalUtils";
import UserGovernance from "@/components/common/UserGovernance";
import { useI18n } from "@/contexts/I18nContext";
import isMobile from "is-mobile";
import { FiSearch } from "react-icons/fi";

export default function Treasury() {
  const { userInfo } = useUserInfoStore();
  const { messages } = useI18n();
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      // 检测设备类型或窗口宽度
      const isMobileDeviceType = isMobile();
      const isSmallScreen = window.innerWidth <= 1024;
      setIsMobileDevice(isMobileDeviceType || isSmallScreen);
    };

    // 初始检测
    checkMobile();

    // 监听窗口大小变化
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);
  // 搜索关键词状态
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>("");

  // 使用hooks获取提案列表
  const {
    proposals,
    loading: proposalsLoading,
    error: proposalsError,
    loadMore,
    hasMore,
    refetch,
  } = useProposalList({
    cursor: null,
    limit: 20,
    viewer: userInfo?.did || null,
    q: currentSearchQuery || null,
  });

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 处理搜索
  const handleSearch = () => {
    setCurrentSearchQuery(searchQuery.trim());
    refetch({
      cursor: null,
      limit: 2,
      viewer: userInfo?.did || null,
      q: searchQuery.trim() || null,
    });
  };

  // 处理回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 根据选中的状态过滤 proposals
  const filteredProposals = selectedStatus
    ? proposals.filter((proposal) => {
      // 使用顶层的 state 字段
      const proposalState = proposal.state;
      const statusValue = parseInt(selectedStatus, 10);
      return proposalState === statusValue;
    })
    : proposals;

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const sentinel = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (hasMore && !proposalsLoading) {
            // 即使有状态过滤，也继续加载更多数据
            // 但显示时只显示符合选中状态的提案
            loadMore();
          }
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [hasMore, proposalsLoading, loadMore]);

  // 加载与错误状态改为仅在列表区域显示

  return (
    <div className="container">
      <main>
        {/* <ul className="dao_info">
          <li>
            <h3>申请中提案</h3>
            <p>{stats.pending}</p>
          </li>
          <li>
            <h3>总申请预算</h3>
            <p>{formatNumber(stats.totalBudget)} CKB</p>
          </li>
          <li>
            <h3>待拨款提案</h3>
            <p>{stats.pending}</p>
          </li>
          <li>
            <h3>待拨款预算</h3>
            <p>{formatNumber(stats.pendingBudget)} CKB</p>
          </li>
        </ul> */}
        <div className="proposal_list_container">
          {/* 移动端：my_info 在前 */}
          {isMobileDevice && (
            <div className="my_info">
              <UserGovernance />
            </div>
          )}

          <section className="proposal_list">
            <nav>
              <h3>{messages.homepage.proposalList}</h3>
              <div className="nav-controls">
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder={messages.homepage.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    className="search-icon-button"
                    onClick={handleSearch}
                    disabled={proposalsLoading}
                    aria-label={messages.homepage.searchPlaceholder}
                  >
                    <FiSearch />
                  </button>
                </div>
                {/* <select
                  name="proposal-status-filter"
                  id="proposal-status-filter"
                  value={selectedStatus}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedStatus(value);
                    // 状态改变时，重置到列表顶部（可选：如果需要重新加载数据）
                    // 当前实现：只过滤已加载的数据
                  }}
                >
                  <option value="">{messages.homepage.all}</option>
                  <option value={String(ProposalStatus.REVIEW)}>
                    {messages.homepage.communityReview}
                  </option>
                  <option value={String(ProposalStatus.VOTE)}>{messages.homepage.voting}</option>
                  <option value={String(ProposalStatus.MILESTONE)}>
                    {messages.homepage.milestoneDelivery}
                  </option>
                  <option value={String(ProposalStatus.APPROVED)}>
                    {messages.homepage.approved}
                  </option>
                  <option value={String(ProposalStatus.REJECTED)}>
                    {messages.homepage.rejected}
                  </option>
                  <option value={String(ProposalStatus.ENDED)}>{messages.homepage.ended}</option>
                </select> */}
              </div>
            </nav>

            <ul className="proposal_list_content">
              {proposalsError ? (
                <li
                  style={{ textAlign: "center", padding: "20px", color: "red" }}
                >
                  {messages.homepage.loadFailed} {proposalsError}
                </li>
              ) : filteredProposals.length > 0 ? (
                filteredProposals.map((proposal, index) => (
                  <ProposalItem key={proposal.cid || proposal.uri || `proposal-${index}`} proposal={proposal} />
                ))
              ) : proposalsLoading ? (
                <li
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#8A949E",
                  }}
                >
                  {messages.homepage.loading}
                </li>
              ) : (
                <li
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#888",
                  }}
                >
                  {messages.homepage.noProposals}
                </li>
              )}
            </ul>
            <div ref={loadMoreRef} style={{ height: 1 }} />
            {!proposalsLoading && hasMore && !currentSearchQuery && (
              <div style={{ textAlign: "center", padding: "12px" }}>
                <button
                  className="view_treasury_button"
                  onClick={() => loadMore()}
                >
                  {messages.homepage.loadMore}
                </button>
              </div>
            )}
          </section>

          {/* 桌面端：my_info 在后 */}
          {!isMobileDevice && (
            <div className="my_info">
              <UserGovernance />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
