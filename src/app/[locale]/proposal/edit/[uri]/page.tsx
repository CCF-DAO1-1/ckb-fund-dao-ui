"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../../../utils/i18n";
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
import { writesPDSOperation, updatesPDSOperation } from "@/app/posts/utils";
import useUserInfoStore from "@/store/userInfo";
import { useI18n } from "@/contexts/I18nContext";
import { postUriToHref, getPostUriHref } from "@/lib/postUriHref";
import { getProposalDetail } from "@/server/proposal";
import toast from "react-hot-toast";

interface EditProposalProps {
    params: Promise<{
        uri: string;
        locale: string;
    }>;
}

export default function EditProposal({ params }: EditProposalProps) {
    const { uri, locale: paramLocale } = use(params);
    const { t } = useTranslation();
    const router = useRouter();
    const { locale } = useI18n();
    const { userInfo } = useUserInfoStore();

    const [isLoading, setIsLoading] = useState(true);

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

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const fetchProposal = async () => {
            try {
                const decodedUri = decodeURIComponent(uri);
                const fullUri = getPostUriHref(decodedUri);
                const response = await getProposalDetail({
                    uri: fullUri,
                    viewer: userInfo?.did || null,
                });

                if (response && response.record && response.record.data) {
                    const data = response.record.data;

                    // 验证权限
                    if (userInfo?.did && response.author.did !== userInfo.did) {
                        router.push(`/${locale}/error/403`);
                        return;
                    }

                    setFormData({
                        proposalType: data.proposalType || "",
                        title: data.title || "",
                        releaseDate: data.releaseDate || "",
                        background: data.background || "",
                        goals: data.goals || "",
                        team: data.team || "",
                        budget: data.budget || "",
                        milestones: data.milestones || [],
                    });
                }
            } catch (err) {
                console.error("Failed to fetch proposal details:", err);
                toast.error(t("errors.fetchFailed"));
            } finally {
                setIsLoading(false);
            }
        };

        if (userInfo?.did) {
            fetchProposal();
        } else {
            // Handle case where user info might not be loaded yet or not logged in
            // Ideally we wait for userInfo to be loaded? 
            // For now, if no did, we might show loading or redirect. 
            // But userInfo might be null initially.
        }
    }, [uri, userInfo?.did]);


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
            // 不需要调整
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

    const quillModules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "code-block"],
            ["link", "image"],
            [{ color: [] }, { background: [] }],
            ["clean"],
        ],
    };

    const quillFormats = [
        "header",
        "bold",
        "italic",
        "underline",
        "strike",
        "list",
        "blockquote",
        "code-block",
        "link",
        "image",
        "color",
        "background",
    ];

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

    const hasTextContent = (html: string): boolean => {
        if (!html) return false;
        const textContent = html.replace(/<[^>]*>/g, "").trim();
        return textContent.length > 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (currentStep !== steps.length) {
            return;
        }

        if (!userInfo?.did) {
            toast.error(t("proposalCreate.errors.pleaseLoginFirst"));
            return;
        }

        // Basic validation (same as create)
        if (!formData.proposalType || formData.proposalType.trim() === "") {
            toast.error(t("proposalCreate.errors.proposalTypeRequired"));
            return;
        }
        // ... (Add other validations as needed, or reuse validation logic)
        if (!formData.title || formData.title.trim() === "") {
            toast.error(t("proposalCreate.errors.titleRequired"));
            return;
        }
        if (!formData.releaseDate) {
            toast.error(t("proposalCreate.errors.releaseDateRequired"));
            return;
        }
        // Simple validation for now

        setSubmitting(true);
        setError("");

        try {
            const decodedUri = decodeURIComponent(uri);
            const fullUri = getPostUriHref(decodedUri);
            // Extract rkey
            const rkey = fullUri.split('/').pop();
            if (!rkey) throw new Error("Invalid Proposal URI");

            await updatesPDSOperation({
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
                rkey: rkey,
            });

            toast.success(t("proposalCreate.messages.submitSuccess")); // Or "Update Success"
            router.push(`/${locale}/proposal/${uri}`);
        } catch (err) {
            toast.error(t("proposalCreate.errors.submitFailed"));
            console.error(t("proposalCreate.errors.submitProposalFailed"), err);
        } finally {
            setSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <ProposalSettings
                        formData={formData}
                        onInputChange={handleInputChange}
                        onDateChange={handleDateChange}
                    />
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

    if (isLoading) {
        return <div className="loading-container">Loading...</div>; // Or a nice spinner
    }

    return (
        <div className="container">
            <main>
                <div className="main-content">
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
                        <div className="step-title-container">
                            <h2 className="step-title">
                                {steps[currentStep - 1]?.name}{" "}
                                <IoMdInformationCircleOutline
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content={steps[currentStep - 1]?.description}
                                />
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="form-container">
                            {renderStepContent()}

                            {error && <div className="error-message">{error}</div>}

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
                                                : "Update Proposal"}
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

            <PreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                formData={formData}
            />
        </div>
    );
}
