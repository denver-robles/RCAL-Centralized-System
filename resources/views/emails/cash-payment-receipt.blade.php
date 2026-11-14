<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Official Cash Payment Receipt</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background-color: #0b1727; padding: 28px 32px; text-align: center; border-bottom: 4px solid #f59e0b;">
            <h1 style="color: #ffffff; font-family: Georgia, serif; font-size: 20px; margin: 0; letter-spacing: 0.5px;">
                ARCHDIOCESE OF LIPA
            </h1>
            <p style="color: #fbbf24; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 6px 0 0 0; font-weight: bold;">
                Parish Information Management System (RCAL PIMS)
            </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                    Payment Verified (Cash Receipt)
                </span>
                <h2 style="font-size: 22px; color: #0f172a; margin: 16px 0 4px 0;">Official Cash Payment Receipt</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0;">Receipt Reference: <strong style="font-family: monospace; color: #0f172a;">{{ $schedule->payment_reference }}</strong></p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>{{ $schedule->requester_name }}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                This confirms that your cash payment for the <strong>{{ ucfirst($schedule->sacrament_type) }}</strong> ceremony has been successfully recorded in the parish financial ledger.
            </p>

            <!-- Receipt Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Official Receipt No:</td>
                        <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold; color: #b45309;">{{ $schedule->payment_reference }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Amount Paid:</td>
                        <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #047857;">₱{{ number_format((float) $schedule->payment_amount, 2) }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Sacrament:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1e293b;">{{ ucfirst($schedule->sacrament_type) }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Scheduled Date:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">{{ $schedule->scheduled_date?->format('F j, Y') ?? 'TBA' }} ({{ $schedule->scheduled_time ?? 'TBA' }})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Received By:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">
                            {{ $schedule->paymentRecorder?->display_name ?? $schedule->paymentRecorder?->username ?? 'Parish Staff' }}
                            ({{ $schedule->parish?->code ?? 'SJWP' }})
                        </td>
                    </tr>
                    @if($schedule->payment_notes)
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Remarks:</td>
                        <td style="padding: 8px 0; text-align: right; color: #64748b; font-style: italic;">{{ $schedule->payment_notes }}</td>
                    </tr>
                    @endif
                </table>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Please retain this email receipt for your records. You may present this confirmation along with your ID during your scheduled appointment at <strong>{{ $schedule->parish?->name ?? 'St. Joseph the Worker Parish' }}</strong>.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 4px 0;"><strong>Archdiocese of Lipa — Roman Catholic Archbishop of Lipa</strong></p>
            <p style="margin: 0 0 6px 0;">Confidential &amp; protected in compliance with Republic Act No. 10173 (Data Privacy Act of 2012).</p>
            <p style="margin: 0; color: #94a3b8;">This is an automated transaction notification. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>