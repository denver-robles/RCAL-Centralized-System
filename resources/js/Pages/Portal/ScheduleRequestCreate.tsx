import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import FormActions from '@/Components/FormActions';
import { PageProps, Parish } from '@/types';
import { Calendar, User, FileText, Upload } from 'lucide-react';

interface Props extends PageProps {
    parishes: Parish[];
}

export default function ScheduleRequestCreate({ parishes }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        // Phase 1: Requestor Details
        requester_name: '',
        requester_contact: '',
        requester_email: '',
        requester_relationship: 'Self',
        requester_address: '',
        
        // Phase 2: Schedule Details
        parish_id: '',
        sacrament_type: 'baptism',
        starts_at: '',
        alternative_starts_at: '',
        
        // Phase 3: Specific Data
        specific_data: {
            blessing_category: 'House Blessing',
            venue_type: 'Off-site/At the specified address',
            transport_arrangement: 'Requestor will pick up/drop off the priest'
        } as Record<string, string>,
        
        // Phase 4: Attachments
        gov_id: null as File | null,
        psa_birth_cert: null as File | null,
        cenomar: null as File | null,
        prev_certificate: null as File | null,
    });

    const handleSpecificDataChange = (key: string, value: string) => {
        setData('specific_data', { ...data.specific_data, [key]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/portal/schedule-requests', {
            forceFormData: true,
        });
    };

    return (
        <PortalLayout title="Sacramental Schedule Request" subtitle="Book a sacrament schedule">
            <Head title="Book Schedule - RCAL PIMS" />
            <div className="max-w-3xl mx-auto space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Phase 1 */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                            <User className="w-5 h-5 text-amber-600" /> 1. Requestor Details
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1">Full Name</label>
                                <input type="text" value={data.requester_name} onChange={e => setData('requester_name', e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-xs" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">Contact Number</label>
                                <input type="text" value={data.requester_contact} onChange={e => setData('requester_contact', e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-xs" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">Email Address</label>
                                <input type="email" value={data.requester_email} onChange={e => setData('requester_email', e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-xs" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">Relationship to Candidate / Subject</label>
                                <select value={data.requester_relationship} onChange={e => setData('requester_relationship', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-xs">
                                    <option value="Self">Self / Owner</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Sibling">Sibling</option>
                                    <option value="Child">Child</option>
                                    <option value="Representative">Representative</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold mb-1">Current Residential Address</label>
                                <input type="text" value={data.requester_address} onChange={e => setData('requester_address', e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-xs" />
                            </div>
                        </div>
                    </div>

                    {/* Phase 2 */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                            <Calendar className="w-5 h-5 text-amber-600" /> 2. Scheduling Details
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1">Parish</label>
                                <select value={data.parish_id} onChange={e => setData('parish_id', e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-xs">
                                    <option value="">-- Select Parish --</option>
                                    {parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">Sacrament / Service Type</label>
                                <select value={data.sacrament_type} onChange={e => setData('sacrament_type', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-xs">
                                    <option value="baptism">Baptism</option>
                                    <option value="matrimony">Matrimony</option>
                                    <option value="anointing">Anointing of the Sick</option>
                                    <option value="blessing">Blessing</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">Preferred Date & Time</label>
                                <input type="datetime-local" value={data.starts_at} onChange={e => setData('starts_at', e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-xs" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">Alternative Date & Time</label>
                                <input type="datetime-local" value={data.alternative_starts_at} onChange={e => setData('alternative_starts_at', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-xs" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold mb-1">Special Notes/Requests</label>
                                <textarea onChange={e => handleSpecificDataChange('special_notes', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-xs" placeholder="Any additional context (e.g. 'This is for a newly constructed 2-story house')"></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Phase 3 & 4 can be conditionally rendered based on sacrament_type */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                            <FileText className="w-5 h-5 text-amber-600" /> 3. Sacrament-Specific & 4. Attachments
                        </h2>
                        
                        {data.sacrament_type === 'baptism' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-semibold mb-1 block">Child's Name</label><input type="text" onChange={e => handleSpecificDataChange('child_name', e.target.value)} required className="w-full border rounded px-3 py-2 text-xs"/></div>
                                <div><label className="text-xs font-semibold mb-1 block">Date of Birth</label><input type="date" onChange={e => handleSpecificDataChange('dob', e.target.value)} required className="w-full border rounded px-3 py-2 text-xs"/></div>
                                <div><label className="text-xs font-semibold mb-1 block">Parents' Marriage Status</label><input type="text" onChange={e => handleSpecificDataChange('parents_status', e.target.value)} className="w-full border rounded px-3 py-2 text-xs"/></div>
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold">Upload PSA Birth Certificate</label>
                                    <input type="file" onChange={e => setData('psa_birth_cert', e.target.files?.[0] || null)} className="w-full text-xs mt-1" />
                                </div>
                            </div>
                        )}

                        {data.sacrament_type === 'blessing' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold mb-1 block">Type of Blessing</label>
                                        <select 
                                            value={data.specific_data.blessing_category || 'House Blessing'} 
                                            onChange={e => handleSpecificDataChange('blessing_category', e.target.value)} 
                                            className="w-full border rounded px-3 py-2 text-xs"
                                        >
                                            <option value="House Blessing">House Blessing</option>
                                            <option value="Car/Vehicle Blessing">Car/Vehicle Blessing</option>
                                            <option value="Office/Business Blessing">Office/Business Blessing</option>
                                        </select>
                                    </div>

                                    {data.specific_data.blessing_category === 'Car/Vehicle Blessing' && (
                                        <div className="col-span-2"><label className="text-xs font-semibold mb-1 block">Vehicle Make & Model</label><input type="text" onChange={e => handleSpecificDataChange('vehicle_make_model', e.target.value)} className="w-full border rounded px-3 py-2 text-xs"/></div>
                                    )}

                                    {data.specific_data.blessing_category === 'Office/Business Blessing' && (
                                        <div className="col-span-2"><label className="text-xs font-semibold mb-1 block">Name of the Business/Establishment</label><input type="text" onChange={e => handleSpecificDataChange('business_name', e.target.value)} className="w-full border rounded px-3 py-2 text-xs"/></div>
                                    )}

                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold mb-1 block">Venue Type</label>
                                        <select 
                                            value={data.specific_data.venue_type || 'Off-site/At the specified address'} 
                                            onChange={e => handleSpecificDataChange('venue_type', e.target.value)} 
                                            className="w-full border rounded px-3 py-2 text-xs"
                                        >
                                            <option value="At the Parish/Church Grounds">At the Parish/Church Grounds</option>
                                            <option value="Off-site/At the specified address">Off-site/At the specified address</option>
                                        </select>
                                    </div>

                                    {data.specific_data.venue_type !== 'At the Parish/Church Grounds' && (
                                        <>
                                            <div className="col-span-2"><label className="text-xs font-semibold mb-1 block">Complete Address</label><input type="text" onChange={e => handleSpecificDataChange('complete_address', e.target.value)} placeholder="Exact lot, block, street, subdivision, and barangay" className="w-full border rounded px-3 py-2 text-xs"/></div>
                                            <div className="col-span-2"><label className="text-xs font-semibold mb-1 block">Landmarks</label><input type="text" onChange={e => handleSpecificDataChange('landmarks', e.target.value)} placeholder="Helpful directions for the priest" className="w-full border rounded px-3 py-2 text-xs"/></div>
                                        </>
                                    )}

                                    <div><label className="text-xs font-semibold mb-1 block">On-Site Contact Person</label><input type="text" onChange={e => handleSpecificDataChange('onsite_contact_name', e.target.value)} className="w-full border rounded px-3 py-2 text-xs"/></div>
                                    <div><label className="text-xs font-semibold mb-1 block">On-Site Contact Number</label><input type="text" onChange={e => handleSpecificDataChange('onsite_contact_number', e.target.value)} className="w-full border rounded px-3 py-2 text-xs"/></div>
                                    
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold mb-1 block">Transportation Arrangement</label>
                                        <select 
                                            value={data.specific_data.transport_arrangement || 'Requestor will pick up/drop off the priest'} 
                                            onChange={e => handleSpecificDataChange('transport_arrangement', e.target.value)} 
                                            className="w-full border rounded px-3 py-2 text-xs"
                                        >
                                            <option value="Requestor will pick up/drop off the priest">Requestor will pick up/drop off the priest</option>
                                            <option value="Priest will use parish vehicle">Priest will use parish vehicle</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>

                    <FormActions submitLabel="Submit Request" cancelHref="/portal/dashboard" processing={processing} />
                </form>
            </div>
        </PortalLayout>
    );
}
