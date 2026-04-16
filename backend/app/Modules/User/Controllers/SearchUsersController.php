<?php

namespace App\Modules\User\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\User\Requests\SearchUsersRequest;
use App\Modules\User\Resources\ProfileCollection;

class SearchUsersController extends Controller
{
    public function __invoke(SearchUsersRequest $request): ProfileCollection
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $q = $request->string('q')->toString();
        $perPage = (int) $request->integer('per_page', 15);

        $paginator = User::query()
            ->with(['profile', 'clubs.club', 'preferredLevels', 'availabilities'])
            ->where(function ($query) use ($q): void {
                $query->where('first_name', 'like', '%'.$q.'%')
                    ->orWhere('last_name', 'like', '%'.$q.'%')
                    ->orWhere('name', 'like', '%'.$q.'%');
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($perPage);

        return new ProfileCollection($paginator, $viewer);
    }
}
