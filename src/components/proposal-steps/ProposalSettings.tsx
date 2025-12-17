import React from 'react';
import { IoIosArrowDown } from "react-icons/io";
import CustomDatePicker from '@/components/ui/DatePicker';
import { useI18n } from '@/contexts/I18nContext';

interface ProposalSettingsProps {
  formData: {
    proposalType: string;
    title: string;
    releaseDate: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onDateChange: (date: Date | null) => void;
}

const ProposalSettings: React.FC<ProposalSettingsProps> = ({ formData, onInputChange, onDateChange }) => {
  const { messages } = useI18n();
  
  return (
    <div className="form-fields">
      <div>
        <label htmlFor="proposalType" className="form-label">
          {messages.proposalSteps.proposalSettings.proposalType}
        </label>
        <div className="input-container">
          <select
            id="proposalType"
            name="proposalType"
            value={formData.proposalType}
            onChange={onInputChange}
            className="form-select"
            required
          >
            <option value="">{messages.proposalSteps.proposalSettings.selectType}</option>
            <option value="funding">{messages.proposalSteps.proposalSettings.types.funding}</option>
            <option value="governance">{messages.proposalSteps.proposalSettings.types.governance}</option>
          </select>
          <div className="select-arrow">
            <IoIosArrowDown size={16} />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="title" className="form-label">
          {messages.proposalSteps.proposalSettings.proposalTitle}
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={onInputChange}
          className="form-input"
          placeholder={messages.proposalSteps.proposalSettings.titlePlaceholder}
          required
        />
      </div>

      <div>
        <label htmlFor="releaseDate" className="form-label">
          {messages.proposalSteps.proposalSettings.releaseDate}
        </label>
        <CustomDatePicker
          selected={formData.releaseDate ? new Date(formData.releaseDate) : null}
          onChange={onDateChange}
          placeholderText={messages.proposalSteps.proposalSettings.datePlaceholder}
          minDate={new Date()}
        />
      </div>
    </div>
  );
};

export default ProposalSettings;
