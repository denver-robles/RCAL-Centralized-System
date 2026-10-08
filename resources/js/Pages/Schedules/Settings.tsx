import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { PageProps } from '@/types';
import FormActions from '@/Components/FormActions';
import { Settings, Clock } from 'lucide-react';

interface SacramentSetting {
    id?: number;
    sacrament_type: string;
    is_available: boolean;
    time_slots: string[];
}

interface Props extends PageProps {
    settings: SacramentSetting[];
}

const DEFAULT_SACRAMENTS = ['baptism', 'matrimony', 'anointing', 'confirmation'];
const DEFAULT_SLOTS = ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00"];

export default function SchedulesSettings({ settings }: Props) {
    // Merge existing settings with defaults
    const initialSettings = DEFAULT_SACRAMENTS.map(type => {
        const existing = settings.find(s => s.sacrament_type === type);
        return {
            sacrament_type: type,
            is_available: existing ? existing.is_available : true,
            time_slots: existing && existing.time_slots ? existing.time_slots : DEFAULT_SLOTS
        };
    });

    const { data, setData, post, processing } = useForm({
        settings: initialSettings
    });

    const handleToggle = (index: number) => {
        const newSettings = [...data.settings];
        newSettings[index].is_available = !newSettings[index].is_available;
        setData('settings', newSettings);
    };

    const handleSlotChange = (index: number, val: string) => {
        const newSettings = [...data.settings];
        newSettings[index].time_slots = val.split(',').map(s => s.trim());
        setData('settings', newSettings);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/schedules/settings');
    };

    return (
        <PortalLayout
            title="Sacrament Availability & Settings"
        >
            <Head title="Sacrament Settings" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {data.settings.map((setting, index) => (
                            <div key={setting.sacrament_type} className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-lg font-bold capitalize">{setting.sacrament_type}</h3>
                                    </div>
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={setting.is_available} onChange={() => handleToggle(index)} />
                                            <div className={`block w-14 h-8 rounded-full ${setting.is_available ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${setting.is_available ? 'transform translate-x-6' : ''}`}></div>
                                        </div>
                                        <span className="ml-3 text-sm font-medium text-gray-900">
                                            {setting.is_available ? 'Accepting Requests' : 'Disabled'}
                                        </span>
                                    </label>
                                </div>
                                
                                {setting.is_available && (
                                    <div className="mt-4">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                            <Clock className="w-4 h-4" /> Time Slots (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={setting.time_slots.join(', ')}
                                            onChange={(e) => handleSlotChange(index, e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            placeholder="08:00-09:00, 09:00-10:00"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-25 transition ease-in-out duration-150"
                            >
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </PortalLayout>
    );
}
