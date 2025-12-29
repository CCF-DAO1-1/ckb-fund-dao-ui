"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../../utils/i18n";
import "@/styles/proposal.css";
import "@/styles/quill-editor.css";
import { IoMdInformationCircleOutline } from "react-icons/io";
import "react-quill-new/dist/quill.snow.css";
import PreviewModal from "@/components/proposal/PreviewModal";
import ProposalSettings from "@/components/proposal-steps/ProposalSettings";
import ProjectBackground from "@/components/proposal-steps/ProjectBackground";
import ProjectGoals from "@/components/proposal-steps/ProjectGoals";
import TeamIntroduction from "@/components/proposal-steps/TeamIntroduction";
import ProjectBudget from "@/components/proposal-steps/ProjectBudget";
import ProjectMilestones from "@/components/proposal-steps/ProjectMilestones";
import { createPDSRecord } from "@/server/pds";
import useUserInfoStore from "@/store/userInfo";
import { useI18n } from "@/contexts/I18nContext";
import { postUriToHref } from "@/lib/postUriHref";
import toast from "react-hot-toast";
import storage from "@/lib/storage";

export default function CreateProposal() {
  const { t } = useTranslation();

  const router = useRouter();
  const { locale } = useI18n();
  const { userInfo } = useUserInfoStore();

  const steps = [
    {
      id: 1,
      name: t("proposalCreate.steps.proposalSettings"),
      description: t("proposalCreate.stepDescriptions.proposalSettings"),
    },
    {
      id: 2,
      name: t("proposalCreate.steps.projectBackground"),
      description: t("proposalCreate.stepDescriptions.projectBackground"),
    },
    {
      id: 3,
      name: t("proposalCreate.steps.projectGoals"),
      description: t("proposalCreate.stepDescriptions.projectGoals"),
    },
    {
      id: 4,
      name: t("proposalCreate.steps.teamIntroduction"),
      description: t("proposalCreate.stepDescriptions.teamIntroduction"),
    },
    {
      id: 5,
      name: t("proposalCreate.steps.projectBudget"),
      description: t("proposalCreate.stepDescriptions.projectBudget"),
    },
    {
      id: 6,
      name: t("proposalCreate.steps.milestones"),
      description: t("proposalCreate.stepDescriptions.milestones"),
    },
  ];
  const [isClient, setIsClient] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    proposalType: "",
    title: "",
    releaseDate: "",
    background: "",
    goals: "",
    team: "",
    budget: "",
    milestones: [] as Array<{
      id: string;
      index: number;
      title: string;
      description: string;
      date: string;
    }>,
  });

  // 跟踪上次保存的数据，避免重复保存相同内容
  const lastSavedDataRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // 检查表单是否有内容
  const hasContent = useCallback((data: typeof formData) => {
    return !!(
      data.title ||
      data.background ||
      data.goals ||
      data.team ||
      data.budget ||
      data.milestones.length > 0
    );
  }, []);

  // 比较数据是否发生变化
  const hasDataChanged = useCallback((newData: typeof formData, oldDataString: string) => {
    if (!oldDataString) return true;
    try {
      const oldData = JSON.parse(oldDataString);
      return JSON.stringify(newData) !== JSON.stringify(oldData);
    } catch {
      return true;
    }
  }, []);

  // 草稿保存和加载功能（基于用户 DID）
  const saveDraft = useCallback(
    async (data: typeof formData, force = false) => {
      if (!userInfo?.did) {
        // 未登录用户不保存草稿
        return;
      }

      // 检查是否有内容
      if (!hasContent(data)) {
        return;
      }

      // 检查数据是否变化（除非强制保存）
      const dataString = JSON.stringify(data);
      if (!force && !hasDataChanged(data, lastSavedDataRef.current)) {
        return; // 数据未变化，不保存
      }

      // 如果正在保存，跳过
      if (isSavingRef.current) {
        return;
      }

      try {
        isSavingRef.current = true;
        setIsDraftSaving(true);
        storage.setProposalDraft(data, userInfo.did);
        lastSavedDataRef.current = dataString;
        setLastSaved(new Date());
      } catch (error) {
        console.error(t("proposalCreate.errors.saveDraftFailed"), error);
        toast.error(t("proposalCreate.errors.saveDraftFailed") || "保存草稿失败");
      } finally {
        isSavingRef.current = false;
        setIsDraftSaving(false);
      }
    },
    [t, userInfo?.did, hasContent, hasDataChanged]
  );

  // 防抖保存函数
  const debouncedSaveDraft = useCallback(
    (data: typeof formData) => {
      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 设置新的定时器
      debounceTimerRef.current = setTimeout(() => {
        saveDraft(data);
      }, 3000); // 3秒防抖延迟
    },
    [saveDraft]
  );

  useEffect(() => {
    setIsClient(true);
    
    // 清理所有过期的草稿
    storage.clearExpiredDrafts();
    
    // 加载当前用户的草稿
    if (userInfo?.did) {
      try {
        const draftData = storage.getProposalDraft(userInfo.did);
        if (draftData) {
          // 移除缓存元数据，只保留表单数据
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { savedAt, version, ...formDataFromDraft } = draftData;
          setFormData(formDataFromDraft as typeof formData);
          // 初始化上次保存的数据引用
          lastSavedDataRef.current = JSON.stringify(formDataFromDraft);
          if (savedAt) {
            setLastSaved(new Date(savedAt));
          }
        }
      } catch (error) {
        console.error(t("proposalCreate.errors.loadDraftFailed"), error);
      }
    }

    // 清理定时器
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.did]);

  // const clearDraft = useCallback(() => {
  //   try {
  //     localStorage.removeItem(DRAFT_KEY);
  //     setLastSaved(null);
  //   } catch (error) {
  //     console.error(t("proposalCreate.errors.deleteDraftFailed"), error);
  //   }
  // }, [t]);

  // 自动保存功能（使用防抖）
  useEffect(() => {
    if (!isClient || !userInfo?.did) return;

    // 使用防抖保存
    debouncedSaveDraft(formData);

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, isClient, userInfo?.did, debouncedSaveDraft]);

  // 页面可见性变化时保存（用户切换标签页时）
  useEffect(() => {
    if (!isClient || !userInfo?.did) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时，立即保存（不使用防抖）
        if (hasContent(formData)) {
          saveDraft(formData, true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [formData, isClient, userInfo?.did, saveDraft, hasContent]);

  // 页面离开时保存草稿（同步保存，确保不丢失数据）
  useEffect(() => {
    if (!isClient || !userInfo?.did) return;

    const handleBeforeUnload = () => {
      // 只有在有内容且数据有变化时才保存
      if (hasContent(formData) && hasDataChanged(formData, lastSavedDataRef.current)) {
        // 同步保存（使用同步 API，因为异步在 beforeunload 中可能不执行）
        try {
          const draftData = {
            ...formData,
            savedAt: new Date().toISOString(),
            version: 1,
          };
          const cacheItem = {
            data: draftData,
            timestamp: Date.now(),
            expiry: Date.now() + 24 * 24 * 60 * 60 * 1000,
          };
          const draftKey = `@dao:proposal_draft:${userInfo.did}`;
          window.localStorage.setItem(draftKey, JSON.stringify(cacheItem));
        } catch (error) {
          console.error("页面离开时保存草稿失败:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, isClient, userInfo?.did, hasContent, hasDataChanged]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  // 草稿保存状态（可用于 UI 显示）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  // 最后保存时间（可用于 UI 显示）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 里程碑管理函数
  const addMilestone = () => {
    const newMilestone = {
      id: Date.now().toString(),
      index: formData.milestones.length,
      title: "",
      description: "",
      date: "",
    };
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }));
    // 自动切换到新添加的里程碑
    setActiveMilestoneIndex(formData.milestones.length);
  };

  const removeMilestone = (id: string) => {
    const indexToRemove = formData.milestones.findIndex((m) => m.id === id);
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones
        .filter((milestone) => milestone.id !== id)
        .map((m, idx) => ({ ...m, index: idx })), // 重新分配index
    }));

    // 调整活动里程碑索引
    if (indexToRemove <= activeMilestoneIndex && activeMilestoneIndex > 0) {
      setActiveMilestoneIndex(activeMilestoneIndex - 1);
    } else if (indexToRemove < activeMilestoneIndex) {
      // 不需要调整
    } else if (formData.milestones.length === 1) {
      // 如果删除的是最后一个里程碑
      setActiveMilestoneIndex(0);
    }
  };

  const updateMilestone = (id: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, [field]: value } : milestone
      ),
    }));
  };

  // 保留 quillModules 和 quillFormats 以保持向后兼容（虽然不再使用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillModules = useMemo(() => ({} as any), []);
  const quillFormats = useMemo(() => [] as string[], []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setFormData((prev) => ({
      ...prev,
      releaseDate: date ? date.toISOString().split("T")[0] : "",
    }));
  };

  const handleMilestoneDateChange = (
    milestoneId: string,
    date: Date | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone) =>
        milestone.id === milestoneId
          ? { ...milestone, date: date ? date.toISOString().split("T")[0] : "" }
          : milestone
      ),
    }));
  };

  const nextStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 辅助函数：去除 HTML 标签并检查是否有实际内容
  const hasTextContent = (html: string): boolean => {
    if (!html) return false;
    // 去除 HTML 标签
    const textContent = html.replace(/<[^>]*>/g, "").trim();
    return textContent.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果不是最后一步，不执行提交
    if (currentStep !== steps.length) {
      return;
    }

    // 检查用户是否登录
    if (!userInfo?.did) {
      toast.error(t("proposalCreate.errors.pleaseLoginFirst"));
      setError(t("proposalCreate.errors.pleaseLoginFirst"));
      return;
    }

    // 验证表单字段
    if (!formData.proposalType || formData.proposalType.trim() === "") {
      toast.error(t("proposalCreate.errors.proposalTypeRequired"));
      setError(t("proposalCreate.errors.proposalTypeRequired"));
      return;
    }

    if (!formData.title || formData.title.trim() === "") {
      toast.error(t("proposalCreate.errors.titleRequired"));
      setError(t("proposalCreate.errors.titleRequired"));
      return;
    }

    if (!formData.releaseDate || formData.releaseDate.trim() === "") {
      toast.error(t("proposalCreate.errors.releaseDateRequired"));
      setError(t("proposalCreate.errors.releaseDateRequired"));
      return;
    }

    if (!hasTextContent(formData.background)) {
      toast.error(t("proposalCreate.errors.backgroundRequired"));
      setError(t("proposalCreate.errors.backgroundRequired"));
      return;
    }

    if (!hasTextContent(formData.goals)) {
      toast.error(t("proposalCreate.errors.goalsRequired"));
      setError(t("proposalCreate.errors.goalsRequired"));
      return;
    }

    if (!hasTextContent(formData.team)) {
      toast.error(t("proposalCreate.errors.teamRequired"));
      setError(t("proposalCreate.errors.teamRequired"));
      return;
    }

    // 资金申请类提案需要验证预算和里程碑
    if (formData.proposalType === "funding") {
      if (!formData.budget || formData.budget.trim() === "") {
        toast.error(t("proposalCreate.errors.budgetRequired"));
        setError(t("proposalCreate.errors.budgetRequired"));
        return;
      }

      if (!formData.milestones || formData.milestones.length === 0) {
        toast.error(t("proposalCreate.errors.milestonesRequired"));
        setError(t("proposalCreate.errors.milestonesRequired"));
        return;
      }

      // 验证每个里程碑的必填字段
      for (let i = 0; i < formData.milestones.length; i++) {
        const milestone = formData.milestones[i];
        if (!milestone.title || milestone.title.trim() === "") {
          toast.error(t("proposalCreate.errors.milestoneTitleRequired"));
          setError(t("proposalCreate.errors.milestoneTitleRequired"));
          return;
        }
        if (!milestone.date || milestone.date.trim() === "") {
          toast.error(t("proposalCreate.errors.milestoneDateRequired"));
          setError(t("proposalCreate.errors.milestoneDateRequired"));
          return;
        }
        if (!hasTextContent(milestone.description)) {
          toast.error(t("proposalCreate.errors.milestoneDescriptionRequired"));
          setError(t("proposalCreate.errors.milestoneDescriptionRequired"));
          return;
        }
      }
    } else if (formData.proposalType === "governance") {
      // 元规则修改类提案：预算和里程碑是选填项，但如果填写了预算，就一定要有里程碑
      const hasBudget = formData.budget && formData.budget.trim() !== "";
      const hasMilestones = formData.milestones && formData.milestones.length > 0;

      if (hasBudget && !hasMilestones) {
        toast.error(t("proposalCreate.errors.milestonesRequiredWhenBudgetProvided") || "如果填写了预算，必须填写里程碑");
        setError(t("proposalCreate.errors.milestonesRequiredWhenBudgetProvided") || "如果填写了预算，必须填写里程碑");
        return;
      }

      // 如果填写了里程碑，验证每个里程碑的必填字段
      if (hasMilestones) {
        for (let i = 0; i < formData.milestones.length; i++) {
          const milestone = formData.milestones[i];
          if (!milestone.title || milestone.title.trim() === "") {
            toast.error(t("proposalCreate.errors.milestoneTitleRequired"));
            setError(t("proposalCreate.errors.milestoneTitleRequired"));
            return;
          }
          if (!milestone.date || milestone.date.trim() === "") {
            toast.error(t("proposalCreate.errors.milestoneDateRequired"));
            setError(t("proposalCreate.errors.milestoneDateRequired"));
            return;
          }
          if (!hasTextContent(milestone.description)) {
            toast.error(t("proposalCreate.errors.milestoneDescriptionRequired"));
            setError(t("proposalCreate.errors.milestoneDescriptionRequired"));
            return;
          }
        }
      }
    }

    setSubmitting(true);
    setError("");

    try {
      console.log("提交提案:", formData);

      // 调用 createPDSRecord 发布提案到 PDS
      const result = await createPDSRecord({
        record: {
          $type: "app.dao.proposal",
          data: {
            proposalType: formData.proposalType,
            title: formData.title,
            releaseDate: formData.releaseDate,
            background: formData.background,
            goals: formData.goals,
            team: formData.team,
            budget: formData.budget,
            milestones: formData.milestones,
          },
        },
        did: userInfo.did,
      });

      // 删除草稿
      if (userInfo?.did) {
        storage.removeProposalDraft(userInfo.did);
      }

      toast.success(t("proposalCreate.messages.submitSuccess"));
      // 跳转到详情页面，传递 cid 参数
      router.push(`/${locale}/proposal/${postUriToHref(result.uri)}`);
    } catch (err) {
      toast.error(t("proposalCreate.errors.submitFailed"));
      setError(t("proposalCreate.errors.submitFailed"));
      console.error(t("proposalCreate.errors.submitProposalFailed"), err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // 提案设置
        return (
          <ProposalSettings
            formData={formData}
            onInputChange={handleInputChange}
            onDateChange={handleDateChange}
          />
        );

      case 2: // 项目背景
        return (
          <ProjectBackground
            formData={formData}
            onInputChange={(value) =>
              setFormData((prev) => ({ ...prev, background: value }))
            }
            isClient={isClient}
            quillModules={quillModules}
            quillFormats={quillFormats}
          />
        );

      case 3: // 项目目标
        return (
          <ProjectGoals
            formData={formData}
            onInputChange={(value) =>
              setFormData((prev) => ({ ...prev, goals: value }))
            }
            isClient={isClient}
            quillModules={quillModules}
            quillFormats={quillFormats}
          />
        );

      case 4: // 团队介绍
        return (
          <TeamIntroduction
            formData={formData}
            onInputChange={(value) =>
              setFormData((prev) => ({ ...prev, team: value }))
            }
            isClient={isClient}
            quillModules={quillModules}
            quillFormats={quillFormats}
          />
        );

      case 5: // 项目预算
        return (
          <ProjectBudget
            formData={formData}
            onInputChange={handleInputChange}
          />
        );

      case 6: // 里程碑
        return (
          <ProjectMilestones
            formData={formData}
            activeMilestoneIndex={activeMilestoneIndex}
            setActiveMilestoneIndex={setActiveMilestoneIndex}
            addMilestone={addMilestone}
            removeMilestone={removeMilestone}
            updateMilestone={updateMilestone}
            onMilestoneDateChange={handleMilestoneDateChange}
            isClient={isClient}
            quillModules={quillModules}
            quillFormats={quillFormats}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="container">
      <main>
        <div className="main-content">
          {/* 步骤导航 */}
          <div className="steps-nav">
            <nav aria-label="Progress">
              <div className="steps-container">
                {steps.map((step) => (
                  <div
                    key={step.name}
                    className={
                      "step-item " +
                      `step-button ${currentStep === step.id ? "active" : ""}`
                    }
                    onClick={() => setCurrentStep(step.id)}
                  >
                    {step.name}
                  </div>
                ))}
              </div>
            </nav>
          </div>
          <div className="step-container">
            {/* 当前步骤标题 */}
            <div className="step-title-container">
              <h2 className="step-title">
                {steps[currentStep - 1]?.name}{" "}
                <IoMdInformationCircleOutline
                  data-tooltip-id="my-tooltip"
                  data-tooltip-content={steps[currentStep - 1]?.description}
                />
              </h2>
            </div>

            {/* 表单内容 */}
            <form onSubmit={handleSubmit} className="form-container">
              {renderStepContent()}

              {error && <div className="error-message">{error}</div>}

              {/* 导航按钮 */}
              <div className="button-container">
                {currentStep === steps.length ? (
                  <div className="button-group">
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="btn btn-secondary"
                    >
                      {t("proposalCreate.buttons.previewProposal")}
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                    >
                      {submitting
                        ? t("proposalCreate.buttons.submitting")
                        : t("proposalCreate.buttons.submitProposal")}
                    </button>
                  </div>
                ) : (
                  <div className="button-group">
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="btn btn-secondary"
                    >
                      {t("proposalCreate.buttons.previewProposal")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => nextStep(e)}
                      className="btn btn-primary"
                    >
                      {t("proposalCreate.buttons.nextStep")}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* 预览弹窗 */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        formData={formData}
      />
    </div>
  );
}
