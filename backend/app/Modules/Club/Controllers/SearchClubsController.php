<?php

namespace App\Modules\Club\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Modules\Club\Requests\SearchClubsRequest;
use App\Modules\Club\Resources\ClubCollection;

class SearchClubsController extends Controller
{
    public function __invoke(SearchClubsRequest $request): ClubCollection
    {
        $perPage = (int) $request->integer('per_page', 20);

        $query = Club::query()
            ->where('is_active', true) // is_active=true forcé : seuls les clubs actifs
            ->when($request->filled('q'), function ($qq) use ($request): void {
                $q = $request->string('q')->toString();
                $qq->where(function ($w) use ($q): void {
                    $w->where('name', 'like', '%'.$q.'%')
                        ->orWhere('city', 'like', '%'.$q.'%');
                });
            })
            ->when($request->filled('city'), fn ($qq) => $qq->where('city', 'like', $request->string('city')->toString().'%'))
            ->when($request->filled('department'), fn ($qq) => $qq->where('department', $request->string('department')->toString()))
            ->when($request->filled('region'), fn ($qq) => $qq->where('region', $request->string('region')->toString()))
            ->orderBy('name');

        return new ClubCollection($query->paginate($perPage));
    }
}
