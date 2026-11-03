import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { PageProps, SacramentSetting } from '@/types';
import { Settings, Clock, Calendar, CalendarDays, FileText } from 'lucide-react';

interface Props extends PageProps {
    settings: SacramentSetting[];
}

const DEFAULT_SACRAMENTS = ['baptism', 'matrimony', 'anointing', 'confirmation'];
const DEFAULT_SLOTS = ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00"];
const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
];

export default function SchedulesSettings({ settings }: Props) {
    // Merge existing settings with defaults
    const initialSettings = DEFAULT_SACRAMENTS.map(type => {
        const existing = settings.find(s => s.sacrament_type === type);
        return {
            sacrament_type: type,
            is_available: existing ? existing.is_available : true,
            allowed_days: existing?.allowed_days && existing.allowed_days.length > 0 
                ? existing.allowed_days 
                : (type === 'baptism' ? ['saturday', 'sunday'] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
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

    const handleDayToggle = (index: number, dayKey: string) => {
        const newSettings = [...data.settings];
        const currentDays = newSettings[index].allowed_days || [];
        if (currentDays.includes(dayKey)) {
            newSettings[index].allowed_days = currentDays.filter(d => d !== dayKey);
        } else {
            newSettings[index].allowed_days = [...currentDays, dayKey];
        }
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
            subtitle="Configure parish schedule rules, available celebration days, and ceremony time slots"
            activeTab="schedules_settings"
        >
            <Head title="Sacrament Settings - RCAL PIMS" />

            <div className="py-2 max-w-5xl mx-auto space-y-6">
                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Link
                        href="/schedules"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span>List View</span>
                    </Link>
                    <Link
                        href="/schedules/calendar"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <CalendarDays className="w-4 h-4 text-amber-600" />
                        <span>Calendar View</span>
                    </Link>
                    <Link
                        href="/schedules/settings"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-xs"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Sacrament Settings &amp; Days</span>
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {data.settings.map((setting, index) => (
                        <div key={setting.sacrament_type} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 capitalize">{setting.sacrament_type}</h3>
                                        <p className="text-xs text-slate-500">Configure scheduling availability rules</p>
                                    </div>
                                </div>
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={setting.is_available} onChange={() => handleToggle(index)} />
                                        <div className={`block w-12 h-6 rounded-full transition-colors ${setting.is_available ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${setting.is_available ? 'transform translate-x-6' : ''}`}></div>
                                    </div>
                                    <span className="ml-3 text-xs font-semibold text-slate-800">
                                        {setting.is_available ? 'Accepting Requests' : 'Disabled'}
                                    </span>
                                </label>
                            </div>
                            
                            {setting.is_available && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                                    {/* Days Available */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                            <Calendar className="w-4 h-4 text-amber-600" />
                                            Available Days for Scheduling
                                        </label>
                                        <p className="text-[11px] text-slate-500">
                                            Parishioners can only select preferred dates that fall on these active days.
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {DAYS_OF_WEEK.map(({ key, label }) => {
                                                const isSelected = (setting.allowed_days || []).includes(key);
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => handleDayToggle(index, key)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                            isSelected
                                                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {(setting.allowed_days || []).length === 0 && (
                                            <p className="text-xs text-rose-500">Please select at least one available day.</p>
                                        )}
                                    </div>

                                    {/* Time Slots */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                            <Clock className="w-4 h-4 text-amber-600" />
                                            Time Slots (Comma-separated)
                                        </label>
                                        <p className="text-[11px] text-slate-500">
                                            Designated ceremony hours for this sacrament.
                                        </p>
                                        <input
                                            type="text"
                                            value={setting.time_slots.join(', ')}
                                            onChange={(e) => handleSlotChange(index, e.target.value)}
                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                            placeholder="08:00-09:00, 09:00-10:00, 10:00-11:00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs disabled:opacity-50"
                        >
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </PortalLayout>
    );
}
