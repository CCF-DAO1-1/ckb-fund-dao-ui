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
import { useProposalStatus } from "@/hooks/useProposalStatus";
import { formatNumber } from "@/utils/proposalUtils";
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

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFirstRenderRef = useRef(true);

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
    state: selectedStatus ? parseInt(selectedStatus, 10) : null,
  });

  // 处理搜索
  const handleSearch = () => {
    setCurrentSearchQuery(searchQuery.trim());
    refetch({
      cursor: null,
      limit: 20,
      viewer: userInfo?.did || null,
      q: searchQuery.trim() || null,
      state: selectedStatus ? parseInt(selectedStatus, 10) : null,
    });
  };

  // 处理回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 状态改变时重新请求数据
  useEffect(() => {
    // 跳过初始挂载时的请求（初始数据已由 useProposalList 获取）
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    refetch({
      cursor: null,
      limit: 20,
      viewer: userInfo?.did || null,
      q: currentSearchQuery || null,
      state: selectedStatus ? parseInt(selectedStatus, 10) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

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

  // 获取提案状态统计
  const { data: statusData } = useProposalStatus();

  return (
    <div className="container">
      <main>
        <ul className="dao_info">
          <li>
            <h3>{messages.homepage.ongoingProjects}</h3>
            <p>{statusData?.in_progress_num ?? '-'}</p>
          </li>
          <li>
            <h3>{messages.homepage.ongoingBudget}</h3>
            <p>{statusData ? `${formatNumber(statusData.budget_amount_in_progress / 100000000)} CKB` : '-'}</p>
          </li>
        </ul>
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
                <select
                  name="proposal-status-filter"
                  id="proposal-status-filter"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                  }}
                >
                  <option value="">{messages.homepage.all}</option>
                  <option value={String(ProposalStatus.DRAFT)}>
                    {messages.homepage.draft}
                  </option>
                  <option value={String(ProposalStatus.INITIATION_VOTE)}>
                    {messages.homepage.voting}
                  </option>
                  <option value={String(ProposalStatus.IN_PROGRESS)}>
                    {messages.homepage.milestoneDelivery}
                  </option>
                  <option value={String(ProposalStatus.COMPLETED)}>
                    {messages.homepage.approved}
                  </option>
                  <option value={String(ProposalStatus.END)}>
                    {messages.homepage.rejected}
                  </option>
                </select>
              </div>
            </nav>

            <ul className="proposal_list_content">
              {proposalsError ? (
                <li
                  style={{ textAlign: "center", padding: "20px", color: "red" }}
                >
                  {messages.homepage.loadFailed} {proposalsError}
                </li>
              ) : proposals.length > 0 ? (
                proposals.map((proposal, index) => (
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
