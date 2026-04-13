<?php

namespace App\Modules\User\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Requests\SearchTenupRequest;
use App\Modules\User\Resources\TenupRankingResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class SearchTenupController extends Controller
{
    public function __invoke(SearchTenupRequest $request): AnonymousResourceCollection
    {
        $q = $request->string('q')->toString();
        $perPage = (int) $request->integer('per_page', 20);
        $gender = $request->input('gender');

        $query = DB::table('tenup_rankings')
            // Préfix LIKE sur last_name → utilise l'index composé (last_name, first_name).
            // first_name/name en fallback pour saisies type "jean dupont".
            ->where(function ($q2) use ($q): void {
                $q2->where('last_name', 'like', $q.'%')
                    ->orWhere('first_name', 'like', $q.'%')
                    ->orWhere('name', 'like', '%'.$q.'%');
            })
            ->when($gender, fn ($qq, $g) => $qq->where('gender', $g))
            ->orderByDesc('points');

        return TenupRankingResource::collection($query->paginate($perPage));
    }
}
