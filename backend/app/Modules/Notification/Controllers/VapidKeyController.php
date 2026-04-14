<?php

namespace App\Modules\Notification\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * Retourne la clé publique VAPID — attendue par le front pour PushManager.subscribe().
 * Phase 3 stub : si VAPID_PUBLIC_KEY absente de l'env, renvoie null.
 * Phase 4 : vraie génération + rotation via `php artisan webpush:vapid`.
 */
class VapidKeyController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'public_key' => config('services.vapid.public_key'),
        ]);
    }
}
