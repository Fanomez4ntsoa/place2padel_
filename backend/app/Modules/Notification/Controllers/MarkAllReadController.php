<?php

namespace App\Modules\Notification\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarkAllReadController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $count = $request->user()->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Toutes les notifications marquées comme lues.',
            'marked' => $count,
        ]);
    }
}
