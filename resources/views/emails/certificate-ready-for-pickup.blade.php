<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificate Ready for Pickup</title>
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
                    Ready for Collection
                </span>
                <h2 style="font-size: 22px; color: #0f172a; margin: 16px 0 4px 0;">Official Certificate Ready for Pickup</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0;">Claim Code: <strong style="font-family: monospace; color: #b45309; font-size: 16px;">{{ $documentRequest->tracking_code }}</strong></p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>{{ $documentRequest->parishioner?->display_name ?? $documentRequest->name_on_record }}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Great news! Your requested <strong>{{ ucfirst($documentRequest->sacrament_type) }} Certificate</strong> for <strong>{{ $documentRequest->name_on_record }}</strong> has been officially prepared, verified against the canonical registers, and embossed with the parish dry seal.
            </p>

            <!-- Claim Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Claim / Tracking Code:</td>
                        <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold; color: #b45309;">{{ $documentRequest->tracking_code }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Subject Name:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">{{ $documentRequest->name_on_record }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Sacrament:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">{{ ucfirst($documentRequest->sacrament_type) }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Pickup Location:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">
                            {{ $documentRequest->targetedParish?->name ?? 'St. Joseph the Worker Parish' }} Office
                        </td>
                    </tr>
                </table>
            </div>

            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <h4 style="color: #1e40af; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">What to Bring for In-Person Pickup:</h4>
                <ul style="color: #1e3a8a; font-size: 12px; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Present this email or your <strong>Tracking Code: {{ $documentRequest->tracking_code }}</strong>.</li>
                    <li>One (1) valid government-issued photo ID (or student ID if minor).</li>
                    <li>If sending an authorized representative: an authorization letter and photocopies of both parties' IDs.</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 4px 0;"><strong>Archdiocese of Lipa — Roman Catholic Archbishop of Lipa</strong></p>
            <p style="margin: 0;">Confidential &amp; protected in compliance with Republic Act No. 10173 (Data Privacy Act of 2012).</p>
        </div>
    </div>
</body>
</html>