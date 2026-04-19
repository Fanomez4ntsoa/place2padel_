<?php

namespace App\Modules\Waitlist\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Modules\Waitlist\Requests\JoinWaitlistRequest;
use Illuminate\Http\JsonResponse;
use Laravel\Sanctum\PersonalAccessToken;

class JoinWaitlistController extends Controller
{
    public function __invoke(JoinWaitlistRequest $request): JsonResponse
    {
        // Auth optionnelle : si Bearer token valide, on lie user_id automatiquement.
        // La validation dans JoinWaitlistRequest rend email obligatoire sinon.
        $user = $this->resolveOptionalUser($request->bearerToken());

        $email = $request->input('email') ?: $user?->email;
        $feature = $request->input('feature');

        if (! $email) {
            abort(422, 'Email requis.');
        }

        $existing = WaitlistEntry::where('email', $email)
            ->where('feature', $feature)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => "Tu es déjà inscrit pour {$existing->featureLabel()} !",
                'already' => true,
            ]);
        }

        $entry = WaitlistEntry::create([
            'email' => $email,
            'feature' => $feature,
            'user_id' => $user?->id,
        ]);

        return response()->json([
            'message' => "Super ! On te préviendra dès que {$entry->featureLabel()} est disponible.",
            'already' => false,
        ], 201);
    }

    private function resolveOptionalUser(?string $bearerToken): ?User
    {
        if (! $bearerToken) {
            return null;
        }

        $token = PersonalAccessToken::findToken($bearerToken);

        if (! $token || ($token->expires_at !== null && $token->expires_at->isPast())) {
            return null;
        }

        $tokenable = $token->tokenable;

        return $tokenable instanceof User ? $tokenable : null;
    }
}
