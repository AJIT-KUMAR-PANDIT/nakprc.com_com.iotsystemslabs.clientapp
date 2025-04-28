// CardSwitch Component
import { useState } from "react";

export function CardSwitch({
  title,
  devices,
  active,
  connected,
  button,
  icon,
  handleToggle
}) {
  const [enabled, setEnabled] = useState(active);

  const handleToggleSwitch = () => {
    if(connected === false) return
    setEnabled(!enabled);
    handleToggle(!enabled);
  };

  return (
    <div
      onClick={handleToggleSwitch} // Card click toggles as well
      className={`flex flex-row-reverse items-center justify-around ${
        enabled ? "bg-[#22bb7b] " : "bg-azure"
      } rounded-2xl p-4 border-2 cursor-pointer
      ${connected ? "border-green-500" : "border-red-800 border-8"}
      `}
    >
      <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors">
        {button && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click conflict
              handleToggleSwitch();
            }}
            className={`${
              enabled ? "bg-green-600" : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            <span className="sr-only">Enable {title}</span>
            <span
              className={`${
                enabled ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-0.5 bg-gray-800" />
              </div>
            </span>
          </button>
        )}
      </div>
      <div className="mt-4 text-center">
        {icon && (
          <div className="bg-[#7000A6] rounded-full w-[41px] h-[41px] flex justify-center items-center text-blue-50 mb-2">
            {icon}
          </div>
        )}
        <h1 className={`text-2xl font-bold text-[#7000A6]`}>{title}</h1>
        <p className="text-sm text-[#7000A6]">
          {devices} Device{devices > 1 ? "s" : ""}
          {connected? " Connected" : " Disconnected"}
        </p>
      </div>
    </div>
  );
}
