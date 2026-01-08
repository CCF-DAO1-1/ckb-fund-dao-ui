"use client";

import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export interface CustomDatePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  minDate?: Date | null;
  maxDate?: Date | null;
  dateFormat?: string;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
  showTimeSelect?: boolean;
  showTimeSelectOnly?: boolean;
  timeIntervals?: number;
  timeFormat?: string;
  timeCaption?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  selected,
  onChange,
  placeholderText,
  minDate,
  maxDate,
  dateFormat,
  className = "form-input",
  disabled = false,
  autoComplete = "off",
  showTimeSelect = false,
  showTimeSelectOnly = false,
  timeIntervals = 1,
  timeFormat = "HH:mm",
  timeCaption = "时间",
}) => {
  // 如果启用了时间选择，且没有指定 dateFormat，则使用包含时间的格式
  const defaultDateFormat = showTimeSelect ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd";
  const finalDateFormat = dateFormat || defaultDateFormat;

  return (
    <div className="input-container">
      <DatePicker
        selected={selected}
        onChange={onChange}
        dateFormat={finalDateFormat}
        placeholderText={placeholderText}
        minDate={minDate || undefined}
        maxDate={maxDate || undefined}
        className={className}
        disabled={disabled}
        showPopperArrow={false}
        popperClassName="react-datepicker-popper"
        calendarClassName="react-datepicker-calendar"
        autoComplete={autoComplete}
        showTimeSelect={showTimeSelect}
        showTimeSelectOnly={showTimeSelectOnly}
        timeIntervals={timeIntervals}
        timeFormat={timeFormat}
        timeCaption={timeCaption}
        portalId="root"
      />

    </div>
  );
};

export default CustomDatePicker;

