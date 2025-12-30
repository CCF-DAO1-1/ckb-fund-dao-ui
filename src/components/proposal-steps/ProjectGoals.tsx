import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import VditorRichTextEditor from '@/components/common/VditorRichTextEditor';
import useUserInfoStore from '@/store/userInfo';

interface ProjectGoalsProps {
  formData: {
    goals: string;
  };
  onInputChange: (value: string) => void;
  isClient: boolean;
  quillModules: unknown;
  quillFormats: string[];
}

const ProjectGoals: React.FC<ProjectGoalsProps> = ({ 
  formData, 
  onInputChange, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isClient, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  quillModules, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  quillFormats 
}) => {
  const { messages } = useI18n();
  const { userInfo } = useUserInfoStore();
  
  return (
    <div className="form-fields">
      <div>
        <label htmlFor="goals" className="form-label">
          {messages.proposalSteps.projectGoals.title}
        </label>
        <VditorRichTextEditor
          value={formData.goals}
          onChange={onInputChange}
          placeholder={messages.proposalSteps.projectGoals.placeholder}
          height="300px"
          did={userInfo?.did}
          toolbarPreset="full"
          mode="ir"
          loadingText={messages.proposalSteps.projectGoals.editorLoading}
        />
      </div>
    </div>
  );
};

export default ProjectGoals;
