'use client';

import { useSelectedPersonnel, useSetPersonnel } from '@/store/gameStore';
import personnelData from '@/data/personnel.json';

export default function PersonnelSelector() {
  const selectedPersonnel = useSelectedPersonnel();
  const setPersonnel = useSetPersonnel();

  const personnelOptions = Object.entries(personnelData).map(([key, data]) => ({
    value: key,
    label: data.name,
    description: data.description
  }));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        Personnel Package
      </label>
      <select
        value={selectedPersonnel}
        onChange={(e) => setPersonnel(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
      >
        {personnelOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-400">
        {personnelData[selectedPersonnel as keyof typeof personnelData]?.description}
      </p>
    </div>
  );
}