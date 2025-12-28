import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import LexicalRichTextEditor from '@/components/common/LexicalRichTextEditor';
import useUserInfoStore from '@/store/userInfo';

interface TeamIntroductionProps {
  formData: {
    team: string;
  };
  onInputChange: (value: string) => void;
  isClient: boolean;
  quillModules: unknown;
  quillFormats: string[];
}

const TeamIntroduction: React.FC<TeamIntroductionProps> = ({ 
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
        <label htmlFor="team" className="form-label">
          {messages.proposalSteps.teamIntroduction.title}
        </label>
        <LexicalRichTextEditor
          value={formData.team}
          onChange={onInputChange}
          placeholder={messages.proposalSteps.teamIntroduction.placeholder}
          height="300px"
          did={userInfo?.did}
          toolbarPreset="full"
          loadingText={messages.proposalSteps.teamIntroduction.editorLoading}
        />
      </div>
    </div>
  );
};

export default TeamIntroduction;
