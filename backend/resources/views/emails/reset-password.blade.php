<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Réinitialise ton mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#FFF8F4;font-family:Arial,sans-serif;color:#1A2A4A;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F4;padding:24px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #F0EBE8;">
                    <tr>
                        <td style="background:#1A2A4A;padding:20px 24px;">
                            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">PlaceToPadel</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 24px;">
                            <h2 style="margin:0 0 16px;font-size:22px;color:#1A2A4A;">Salut {{ $firstName }},</h2>
                            <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#2A4A6A;">
                                Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau. Ce lien expire dans 60 minutes.
                            </p>

                            <a href="{{ $resetUrl }}"
                               style="display:inline-block;padding:12px 24px;background:#E8650A;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
                                Réinitialiser mon mot de passe
                            </a>

                            <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;">
                                Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br>
                                <a href="{{ $resetUrl }}" style="color:#E8650A;word-break:break-all;">{{ $resetUrl }}</a>
                            </p>

                            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">
                                Si tu n'es pas à l'origine de cette demande, ignore ce mail — ton mot de passe restera inchangé.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 24px;background:#FFF8F4;text-align:center;font-size:12px;color:#2A4A6A;">
                            PlaceToPadel — la plateforme des tournois de padel.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
