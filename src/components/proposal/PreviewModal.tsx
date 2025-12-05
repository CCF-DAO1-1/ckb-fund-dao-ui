import React from "react";
import { AiOutlineExport } from "react-icons/ai";
import Link from "next/link";
import CopyButton from "@/components/ui/copy/CopyButton";
import { Modal } from "@/components/ui/modal";
import Avatar from "@/components/common/Avatar";
import { useI18n } from '@/contexts/I18nContext';
interface Milestone {
  id: string;
  index: number;
  title: string;
  description: string;
  date: string;
}

interface FormData {
  proposalType: string;
  title: string;
  releaseDate: string;
  background: string;
  goals: string;
  team: string;
  budget: string;
  milestones: Milestone[];
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FormData;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  formData,
}) => {
  const { messages } = useI18n();
  console.log(formData)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formData.title}
      size="large"
      className="preview-modal"
    >
      <div className="proposal-header">
        <div className="proposal-info">
          <div className="user_info">
            <Avatar did="did:ckb:ckt1qvqr...7q2h" size={32} alt="avatar" />
            <div className="name">
              <h3>John</h3>
              <p>
                did:ckb:ckt1qvqr...7q2h
                <CopyButton
                  className="button-copy"
                  text={"did:ckb:ckt1qvqr...7q2h"}
                  ariaLabel="copy-treasury-address"
                >

                </CopyButton>
                <Link href="#" aria-label="export-treasury-address">
                  <AiOutlineExport />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="proposal-content">
        <div className="proposal-section">
          <h3>{messages.previewModal.basicInfo}</h3>
          <div className="proposal-field">
            <label>{messages.previewModal.proposalType}</label>
            <span>{formData.proposalType || messages.previewModal.notFilled}</span>
          </div>

          <div className="proposal-field">
            <label>{messages.previewModal.releaseDate}</label>
            <span>{formData.releaseDate || messages.previewModal.notFilled}</span>
          </div>
        </div>

        <div className="proposal-section">
          <h3>{messages.previewModal.projectBackground}</h3>
          <div
            className="proposal-html-content"
            dangerouslySetInnerHTML={{
              __html: formData.background || messages.previewModal.notFilled,
            }}
          />
        </div>

        <div className="proposal-section">
          <h3>{messages.previewModal.projectGoals}</h3>
          <div
            className="proposal-html-content"
            dangerouslySetInnerHTML={{ __html: formData.goals || messages.previewModal.notFilled }}
          />
        </div>

        <div className="proposal-section">
          <h3>{messages.previewModal.teamIntroduction}</h3>
          <div
            className="proposal-html-content"
            dangerouslySetInnerHTML={{ __html: formData.team || messages.previewModal.notFilled }}
          />
        </div>

        <div className="proposal-section">
          <h3>{messages.previewModal.projectBudget}</h3>
          <div className="proposal-field">
            <label>{messages.previewModal.budgetAmount}</label>
            <span>{formData.budget || messages.previewModal.notFilled}</span>
          </div>
        </div>

        <div className="proposal-section">
          <h3>{messages.previewModal.projectMilestones}</h3>
          {formData.milestones.length === 0 ? (
            <p>{messages.previewModal.noMilestonesAdded}</p>
          ) : (
            <div className="proposal-milestones">
              {formData.milestones.map((milestone, index) => (
                <div key={milestone.id} className="proposal-milestone">
                  <h4>
                    {messages.previewModal.milestone} {index + 1}: {milestone.title || messages.previewModal.notNamed}
                  </h4>
                  <div className="proposal-field">
                    <label>{messages.previewModal.expectedCompletionDate}</label>
                    <span>{milestone.date || messages.previewModal.notSet}</span>
                  </div>
                  <div className="proposal-field">
                    <label>{messages.previewModal.detailedDescription}</label>
                    <div
                      className="proposal-html-content"
                      dangerouslySetInnerHTML={{
                        __html: milestone.description || messages.previewModal.notFilled,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </Modal>
  );
};

export default PreviewModal;
