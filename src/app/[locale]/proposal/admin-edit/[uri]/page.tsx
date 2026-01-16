"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "../../../../../utils/i18n";
import "@/components/proposal-phase/proposal.css";
import { IoMdInformationCircleOutline } from "react-icons/io";
import PreviewModal from "@/components/proposal/PreviewModal";
import ProposalSettings from "@/components/proposal-steps/ProposalSettings";
import ProjectBackground from "@/components/proposal-steps/ProjectBackground";
import ProjectGoals from "@/components/proposal-steps/ProjectGoals";
import TeamIntroduction from "@/components/proposal-steps/TeamIntroduction";
import ProjectBudget from "@/components/proposal-steps/ProjectBudget";
import ProjectMilestones from "@/components/proposal-steps/ProjectMilestones";
import useUserInfoStore from "@/store/userInfo";
import { useI18n } from "@/contexts/I18nContext";
import { getPostUriHref } from "@/lib/postUriHref";
import { submitRectification } from "@/server/task";
import toast from "react-hot-toast";
import { logger } from "@/lib/logger";
import { useProposalDetail } from "@/hooks/useProposalDetail";
import { generateSignature } from "@/lib/signature";

export default function AdminEditProposal() {
    const params = useParams();
    const uri = useMemo(() => params?.uri as string, [params?.uri]);

    const { t } = useTranslation();
    const router = useRouter();
    const { locale } = useI18n();
    const { userInfo } = useUserInfoStore();

    // 使用 hook 获取提案详情
    const { proposal, loading, error: fetchError } = useProposalDetail(uri);

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
    // Removed currentStep state

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
        progress: 0,
    });

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
    const [showPreview, setShowPreview] = useState(false);

    const quillModules = useMemo<Record<string, unknown>>(() => ({}), []);
    const quillFormats = useMemo(() => [] as string[], []);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // 当 proposal 加载成功时更新表单数据
    useEffect(() => {
        if (proposal && proposal.record && proposal.record.data) {
            const data = proposal.record.data;

            setFormData({
                proposalType: data.proposalType || "",
                title: data.title || "",
                releaseDate: data.releaseDate || "",
                background: data.background || "",
                goals: data.goals || "",
                team: data.team || "",
                budget: data.budget || "",
                milestones: data.milestones || [],
                progress: proposal?.progress ?? 0,
            });
        }
    }, [proposal]);

    if (loading) {
        return <div className="loading-container">Loading...</div>;
    }

    if (fetchError) {
        return <div className="error-container">{fetchError}</div>;
    }

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
        setActiveMilestoneIndex(formData.milestones.length);
    };

    const removeMilestone = (id: string) => {
        const indexToRemove = formData.milestones.findIndex((m) => m.id === id);
        setFormData((prev) => ({
            ...prev,
            milestones: prev.milestones
                .filter((milestone) => milestone.id !== id)
                .map((m, idx) => ({ ...m, index: idx })),
        }));

        if (indexToRemove <= activeMilestoneIndex && activeMilestoneIndex > 0) {
            setActiveMilestoneIndex(activeMilestoneIndex - 1);
        } else if (indexToRemove < activeMilestoneIndex) {
        } else if (formData.milestones.length === 1) {
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

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        setFormData((prev) => ({
            ...prev,
            progress: isNaN(value) ? 0 : value,
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Removed step check

        if (!userInfo?.did) {
            toast.error(t("proposalCreate.errors.pleaseLoginFirst"));
            return;
        }
        // debugger
        if (!proposal?.record) {
            logger.error("Proposal data missing during submission", { proposal });
            toast.error("Proposal data is not fully loaded. Please refresh and try again.");
            return;
        }
        // debugger
        // Strict check for required record fields
        // if (!proposal.record.$type || !proposal.record.created) {
        //     logger.error("Proposal record incomplete", { record: proposal.record });
        //     toast.error("Proposal data incomplete ($type or created missing). Cannot submit.");
        //     return;
        // }

        setSubmitting(true);
        setSubmitError("");

        try {
            // Sanitize formData to ensure no undefined values
            const proposalData = {
                proposalType: formData.proposalType || "",
                title: formData.title || "",
                releaseDate: formData.releaseDate || "",
                background: formData.background || "",
                goals: formData.goals || "",
                team: formData.team || "",
                budget: formData.budget || "",
                milestones: (formData.milestones || []).map(m => ({
                    id: m.id || "",
                    index: m.index ?? 0,
                    title: m.title || "",
                    description: m.description || "",
                    date: m.date || ""
                })),
            };

            const fullUri = uri ? getPostUriHref(uri) : "";

            // Log the params to be signed for debugging
            logger.info("Generating signature with params:", {
                $type: proposal.record.$type,
                created: proposal.record.created,
                proposalDataKeys: Object.keys(proposalData)
            });

            const params = {
                progress: formData.progress ?? 0,
                proposal_uri: fullUri || "",
                timestamp: Math.floor(Date.now() / 1000), // Seconds
                value: {
                    $type: proposal.record.$type,
                    created: proposal.record.created,
                    data: proposalData,
                }
            };

            // Double check for any undefined in params structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const checkUndefined = (obj: any, path = ""): string | null => {
                if (obj === undefined) return path;
                if (obj === null) return null;
                if (typeof obj === 'object') {
                    for (const key in obj) {
                        const result = checkUndefined(obj[key], path ? `${path}.${key}` : key);
                        if (result) return result;
                    }
                }
                return null;
            };

            const undefinedPath = checkUndefined(params);
            if (undefinedPath) {
                throw new Error(`Found undefined value at path: ${undefinedPath}`);
            }

            // Generate signature
            const { signed_bytes, signing_key_did } = await generateSignature(params);

            await submitRectification({
                did: userInfo.did,
                params,
                signed_bytes,
                signing_key_did,
            });

            toast.success(t("proposalCreate.messages.submitSuccess"));
            router.push(`/${locale}/proposal/${uri}`);
        } catch (err) {
            toast.error(t("proposalCreate.errors.submitFailed"));
            logger.error("提交整改报告失败:", err);
            setSubmitError(err instanceof Error ? err.message : "Submission failed");
        } finally {
            setSubmitting(false);
        }
    };

    const renderStepContent = (stepId: number) => {
        switch (stepId) {
            case 1:
                return (
                    <div>
                        <ProposalSettings
                            formData={formData}
                            onInputChange={handleInputChange}
                            onDateChange={handleDateChange}
                        />
                        <div className="form-group" style={{ marginTop: '20px', padding: '15px', borderRadius: '8px' }}>
                            <label className="form-label" style={{ fontWeight: 'bold' }}>
                                Progress (Current Milestone Index)
                            </label>
                            <input
                                type="number"
                                name="progress"
                                value={formData.progress}
                                onChange={handleProgressChange}
                                className="form-input"
                                min="0"
                            />
                            <p className="form-helper-text" style={{ fontSize: '12px', color: '#666' }}>
                                Specify the milestone index current project state corresponds to (0-based).
                            </p>
                        </div>
                    </div>
                );
            case 2:
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
            case 3:
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
            case 4:
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
            case 5:
                return (
                    <ProjectBudget
                        formData={formData}
                        onInputChange={handleInputChange}
                    />
                );
            case 6:
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

    if (loading) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '100px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Admin Rectification Editor</h1>
                <p style={{ color: '#666', marginTop: '10px' }}>
                    Modify proposal content and reset milestone progress.
                    Changes are submitted as a rectification report.
                </p>
            </div>

            <main>
                <div className="main-content">
                    <form onSubmit={handleSubmit} className="form-container">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className="step-section"
                                style={{
                                    marginBottom: '20px',
                                    padding: '20px',
                                    backgroundColor: '#2C2C2C',
                                    border: '1px solid #444',
                                    borderRadius: '12px'
                                }}
                            >
                                <div className="step-title-container" style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #444' }}>
                                    <h2 className="step-title" style={{ fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {step.name}
                                        <div
                                            data-tooltip-id="my-tooltip"
                                            data-tooltip-content={step.description}
                                            style={{ cursor: 'help', color: '#9ca3af', display: 'flex' }}
                                        >
                                            <IoMdInformationCircleOutline size={18} />
                                        </div>
                                    </h2>
                                </div>
                                {renderStepContent(step.id)}
                            </div>
                        ))}

                        {submitError && (
                            <div className="error-message" style={{ margin: '20px 0', padding: '15px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '8px' }}>
                                {submitError}
                            </div>
                        )}

                        <div className="button-container"
                            style={{
                                marginTop: '20px',
                                paddingTop: '10px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '15px'
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className="btn btn-secondary"
                                style={{ padding: '10px 24px' }}
                            >
                                {t("proposalCreate.buttons.previewProposal")}
                            </button>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary"
                                style={{ padding: '10px 24px' }}
                            >
                                {submitting
                                    ? t("proposalCreate.buttons.submitting")
                                    : "Submit Rectification"}
                            </button>
                        </div>
                    </form>
                </div>
            </main >

            <PreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                formData={formData}
            />
        </div >
    );
}
