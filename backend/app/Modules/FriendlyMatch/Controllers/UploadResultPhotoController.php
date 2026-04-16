<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FriendlyMatch;
use App\Modules\FriendlyMatch\Resources\FriendlyMatchResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadResultPhotoController extends Controller
{
    public function __invoke(Request $request, FriendlyMatch $friendlyMatch): FriendlyMatchResource
    {
        if (! $friendlyMatch->hasParticipant($request->user()->id)) {
            throw new AuthorizationException("Tu n'es pas dans ce match.");
        }

        $data = $request->validate([
            'photo' => ['required', 'image', 'max:5120'], // 5 MB
        ]);

        $path = $data['photo']->store('friendly-matches/results', 's3');
        $url = Storage::disk('s3')->url($path);

        $friendlyMatch->update(['result_photo_url' => $url]);

        return new FriendlyMatchResource($friendlyMatch->fresh(['participants.user', 'creator']));
    }
}
