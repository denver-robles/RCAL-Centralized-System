import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import FormActions from '@/Components/FormActions';
import { PageProps } from '@/types';
import { CreditCard, CheckCircle, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface Attachment {
    id: number;
    document_type: string;
    file_path: string;
}

interface Schedule {
    id: number;
    title: string;
    starts_at: string;
    payment_method: string | null;
    payment_status: string;
    attachments: Attachment[];
}

interface Props extends PageProps {
    schedule: Schedule;
    flash: {
        payment_recorded?: boolean;
        success?: string;
    };
}

export default function SchedulePayment({ schedule, flash }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        payment_method: 'cash',
        receipt: null as File | null,
    });

    const [showDocs, setShowDocs] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/portal/schedule-requests/${schedule.id}/payment`, {
            forceFormData: true,
        });
    };

    if (flash.payment_recorded || schedule.payment_method) {
        return (
            <PortalLayout title="Payment Confirmed" subtitle="Next steps for your request">
                <Head title="Payment Confirmed - RCAL PIMS" />
                <div className="max-w-2xl mx-auto mt-8 bg-white border border-green-200 rounded-2xl p-8 shadow-sm">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <h2 className="text-2xl font-bold text-slate-900">Your payment method has been successfully recorded.</h2>
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm leading-relaxed text-left flex items-start gap-3 mt-4">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p>
                                To proceed with your scheduling request, you must bring the <strong>original copies</strong> of all the required documents you uploaded during your next visit to the parish office. Your request will remain on hold until these physical documents are verified by the parish staff.
                            </p>
                        </div>

                        <div className="w-full mt-6 text-left border rounded-xl overflow-hidden">
                            <button 
                                onClick={() => setShowDocs(!showDocs)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition text-slate-800 font-semibold text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    View Required Documents
                                </div>
                                {showDocs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            
                            {showDocs && (
                                <div className="p-4 bg-white border-t divide-y text-sm">
                                    {schedule.attachments && schedule.attachments.length > 0 ? (
                                        schedule.attachments.map(att => (
                                            <div key={att.id} className="py-2 flex items-center gap-2 text-slate-700">
                                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                <span className="capitalize">{att.document_type.replace(/_/g, ' ')}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 py-2">No documents were attached to this request.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <a href="/portal/dashboard" className="mt-8 inline-block bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
                            Return to Dashboard
                        </a>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout title="Schedule Payment" subtitle={`Complete payment for: ${schedule.title}`}>
            <Head title="Payment - RCAL PIMS" />
            <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-6 shadow-sm mt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <CreditCard className="w-5 h-5 text-amber-600" /> Select Payment Method
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`border-2 rounded-xl p-4 flex flex-col items-center cursor-pointer transition ${data.payment_method === 'cash' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
                                <input type="radio" name="payment_method" value="cash" className="sr-only" onChange={(e) => setData('payment_method', e.target.value)} checked={data.payment_method === 'cash'} />
                                <span className="font-bold text-slate-800">Cash at Parish Office</span>
                                <span className="text-xs text-slate-500 mt-1">Pay in person when you bring your documents</span>
                            </label>
                            
                            <label className={`border-2 rounded-xl p-4 flex flex-col items-center cursor-pointer transition ${data.payment_method === 'online' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
                                <input type="radio" name="payment_method" value="online" className="sr-only" onChange={(e) => setData('payment_method', e.target.value)} checked={data.payment_method === 'online'} />
                                <span className="font-bold text-slate-800">Online Transfer (GCash/Bank)</span>
                                <span className="text-xs text-slate-500 mt-1">Upload your proof of payment</span>
                            </label>
                        </div>
                        {errors.payment_method && <p className="text-rose-600 text-xs mt-1">{errors.payment_method}</p>}
                    </div>

                    {data.payment_method === 'online' && (
                        <div className="border-t pt-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Upload Payment Receipt
                            </label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => setData('receipt', e.target.files ? e.target.files[0] : null)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm"
                            />
                            {errors.receipt && <p className="text-rose-600 text-xs mt-1">{errors.receipt}</p>}
                        </div>
                    )}

                    <FormActions submitLabel="Confirm Payment Method" cancelHref="/portal/dashboard" processing={processing} />
                </form>
            </div>
        </PortalLayout>
    );
}
