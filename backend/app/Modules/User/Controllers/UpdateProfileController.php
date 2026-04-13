<?php

namespace App\Modules\User\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\User\Requests\UpdateProfileRequest;
use App\Modules\User\Resources\ProfileResource;
use App\Modules\User\Services\ProfileService;

class UpdateProfileController extends Controller
{
    public function __construct(private readonly ProfileService $service) {}

    public function __invoke(UpdateProfileRequest $request): ProfileResource
    {
        /** @var User $user */
        $user = $request->user();

        $updated = $this->service->update($user, $request->validated());

        return new ProfileResource($updated, $updated);
    }
}
