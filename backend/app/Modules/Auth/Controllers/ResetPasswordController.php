<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Requests\ResetPasswordRequest;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class ResetPasswordController extends Controller
{
    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'token') + ['password_confirmation' => $request->input('password')],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Invalide toutes les sessions actives (force relogin).
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            abort(400, match ($status) {
                Password::INVALID_TOKEN => 'Lien invalide ou expiré.',
                Password::INVALID_USER => 'Lien invalide ou expiré.',
                default => 'Impossible de réinitialiser le mot de passe.',
            });
        }

        return response()->json(['message' => 'Mot de passe mis à jour avec succès.']);
    }
}
