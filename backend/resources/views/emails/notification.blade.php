<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
</head>
<body style="margin:0;padding:0;background:#FFF8F4;font-family:Arial,sans-serif;color:#1A2A4A;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F4;padding:24px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #F0EBE8;">
                    <tr>
                        <td style="background:#1A2A4A;padding:20px 24px;">
                            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">Place2Padel</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 24px;">
                            <h2 style="margin:0 0 16px;font-size:22px;color:#1A2A4A;">{{ $title }}</h2>
                            <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#2A4A6A;">{{ $body }}</p>

                            @if($ctaUrl)
                                <a href="{{ $ctaUrl }}"
                                   style="display:inline-block;padding:12px 24px;background:#E8650A;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
                                    Voir le détail
                                </a>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 24px;background:#FFF8F4;text-align:center;font-size:12px;color:#2A4A6A;">
                            Place2Padel — la plateforme des tournois de padel.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
