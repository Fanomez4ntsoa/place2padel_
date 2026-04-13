<?php

namespace App\Modules\User\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // User core
            'first_name' => ['sometimes', 'string', 'min:1', 'max:100'],
            'last_name' => ['sometimes', 'string', 'min:1', 'max:100'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'club_uuid' => ['sometimes', 'nullable', 'uuid', Rule::exists('clubs', 'uuid')->where('is_active', true)],

            // UserProfile — padel_points / ranking / tenup_* volontairement EXCLUS
            // (seuls FFTSyncJob et admin peuvent les modifier).
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'position' => ['sometimes', 'nullable', Rule::in(['left', 'right', 'both'])],
            'padel_level' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
            'license_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'max_radius_km' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'max_radius_training_km' => ['sometimes', 'integer', 'min:1', 'max:500'],

            // Collections pivots — sémantique "replace" : la liste fournie écrase la précédente.
            'preferred_levels' => ['sometimes', 'array', 'max:7'],
            'preferred_levels.*' => ['string', Rule::in(['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000'])],

            'availabilities' => ['sometimes', 'array', 'max:7'],
            'availabilities.*' => ['integer', 'between:1,7'],
        ];
    }

    public function messages(): array
    {
        return [
            'club_uuid.exists' => "Le club sélectionné n'existe pas ou est désactivé.",
            'padel_level.between' => 'Le niveau padel doit être entre 1 et 5.',
        ];
    }
}
