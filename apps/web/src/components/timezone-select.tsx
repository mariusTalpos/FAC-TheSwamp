import {
  DEFAULT_EVENT_TIMEZONE,
  EVENT_TIMEZONE_OPTIONS,
} from "@/lib/events/timezone-options";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function TimezoneSelect({ id, value, onChange, required }: Props) {
  const options =
    EVENT_TIMEZONE_OPTIONS.some((o) => o.value === value) || !value
      ? EVENT_TIMEZONE_OPTIONS
      : [
          { value, label: `${value} (custom)` },
          ...EVENT_TIMEZONE_OPTIONS,
        ];

  return (
    <select
      id={id}
      required={required}
      value={value || DEFAULT_EVENT_TIMEZONE}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
