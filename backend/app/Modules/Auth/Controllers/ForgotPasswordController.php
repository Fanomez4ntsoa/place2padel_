<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use App\Modules\Auth\Requests\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $email = $request->string('email')->value();
        $user = User::where('email', $email)->first();

        // Privacy: toujours renvoyer la même réponse, qu'un compte existe ou non.
        // Un comptage par email fuiterait l'existence d'un compte (énumération).
        $genericMessage = 'Si ce compte existe, un email a été envoyé.';

        if (! $user || $user->auth_type !== 'local') {
            // Google accounts n'ont pas de mot de passe à reset.
            return response()->json(['message' => $genericMessage]);
        }

        $token = Password::broker()->createToken($user);

        $resetUrl = rtrim(config('app.frontend_url', ''), '/')
            .'/reset-password?token='.urlencode($token)
            .'&email='.urlencode($email);

        Mail::to($user->email)->send(new ResetPasswordMail(
            resetUrl: $resetUrl,
            firstName: $user->first_name ?? 'toi',
        ));

        return response()->json(['message' => $genericMessage]);
    }
}
