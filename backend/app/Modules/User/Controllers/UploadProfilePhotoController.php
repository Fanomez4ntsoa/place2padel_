<?php

namespace App\Modules\User\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\User\Requests\UploadProfilePhotoRequest;
use App\Modules\User\Resources\ProfileResource;
use App\Modules\User\Services\ProfileService;

class UploadProfilePhotoController extends Controller
{
    public function __construct(private readonly ProfileService $service) {}

    public function __invoke(UploadProfilePhotoRequest $request): ProfileResource
    {
        /** @var User $user */
        $user = $request->user();

        $updated = $this->service->updatePhoto($user, $request->file('image'));

        return new ProfileResource($updated, $updated);
    }
}
