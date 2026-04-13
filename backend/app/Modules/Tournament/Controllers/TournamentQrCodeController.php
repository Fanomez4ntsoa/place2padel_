<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use Illuminate\Http\JsonResponse;

class TournamentQrCodeController extends Controller
{
    public function __invoke(Tournament $tournament): JsonResponse
    {
        $tournament->load('club');

        // Backend retourne seulement le payload — la génération de l'image QR
        // est déléguée au client (mobile/web) via une lib comme qrcode.js.
        return response()->json([
            'data' => [
                'share_link' => $tournament->share_link,
                'tournament' => [
                    'uuid' => $tournament->uuid,
                    'name' => $tournament->name,
                    'date' => $tournament->date?->toDateString(),
                    'status' => $tournament->status,
                ],
                'club' => [
                    'name' => $tournament->club->name,
                    'city' => $tournament->club->city,
                ],
            ],
        ]);
    }
}
