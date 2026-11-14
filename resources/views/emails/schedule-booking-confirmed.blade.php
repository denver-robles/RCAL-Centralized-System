<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sacrament Appointment Confirmed</title>
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
                <span style="background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                    Ceremony Confirmed
                </span>
                <h2 style="font-size: 22px; color: #0f172a; margin: 16px 0 4px 0;">Sacrament Appointment Confirmed</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0;">Booking Code: <strong style="font-family: monospace; color: #0f172a;">SCH-{{ $schedule->id }}</strong></p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>{{ $schedule->requester_name }}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Your appointment for the Holy Sacrament of <strong>{{ ucfirst($schedule->sacrament_type) }}</strong> has been officially confirmed on the parish liturgical calendar.
            </p>

            <!-- Appointment Details -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Sacrament:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1e293b;">{{ ucfirst($schedule->sacrament_type) }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Date &amp; Time:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">
                            {{ $schedule->scheduled_date?->format('l, F j, Y') ?? 'TBA' }} at {{ $schedule->scheduled_time ?? 'TBA' }}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Parish Church:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">{{ $schedule->parish?->name ?? 'St. Joseph the Worker Parish' }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Presiding Clergy:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">
                            {{ $schedule->presidingClergy?->titled_name ?? $schedule->presidingClergy?->full_name ?? 'Assigned Parish Clergy' }}
                        </td>
                    </tr>
                </table>
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <h4 style="color: #92400e; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">Important Reminders:</h4>
                <ul style="color: #78350f; font-size: 12px; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Please arrive at the parish church at least 15 minutes before your scheduled appointment.</li>
                    <li>Ensure all original documents (PSA Birth Certificate, Pre-Sacramental Seminar permits) are brought if pending verification.</li>
                    <li>Maintain reverent liturgical attire inside the church compound.</li>
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