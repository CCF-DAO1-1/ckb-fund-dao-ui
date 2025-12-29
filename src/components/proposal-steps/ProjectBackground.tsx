import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import VditorRichTextEditor from '@/components/common/VditorRichTextEditor';
import useUserInfoStore from '@/store/userInfo';

interface ProjectBackgroundProps {
  formData: {
    background: string;
  };
  onInputChange: (value: string) => void;
  isClient: boolean;
  quillModules: unknown;
  quillFormats: string[];
}

const ProjectBackground: React.FC<ProjectBackgroundProps> = ({ 
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
        <label htmlFor="background" className="form-label">
          {messages.proposalSteps.projectBackground.title}
        </label>
        <VditorRichTextEditor
          value={formData.background}
          onChange={onInputChange}
          placeholder={messages.proposalSteps.projectBackground.placeholder}
          height="300px"
          did={userInfo?.did}
          toolbarPreset="full"
          mode="ir"
          loadingText={messages.proposalSteps.projectBackground.editorLoading}
        />
      </div>
    </div>
  );
};

export default ProjectBackground;
