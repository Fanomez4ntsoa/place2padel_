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

            // Clubs multi (jusqu'à 3, tri par priority) — remplace club_uuid singleton.
            // Sémantique "replace" : la liste fournie écrase la précédente. Liste vide = aucun club.
            'clubs' => ['sometimes', 'array', 'max:3'],
            'clubs.*' => ['uuid', Rule::exists('clubs', 'uuid')->where('is_active', true)],

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

            // Availabilities en tuples {day_of_week, period}. day_of_week null + period 'all' = Flexible.
            // Max 10 slots : 5 soirs semaine + 2 samedi (matin/ap-midi) + 2 dimanche + 1 flexible.
            'availabilities' => ['sometimes', 'array', 'max:10'],
            'availabilities.*' => ['array:day_of_week,period'],
            'availabilities.*.day_of_week' => ['nullable', 'integer', 'between:1,7'],
            'availabilities.*.period' => ['required', Rule::in(['morning', 'afternoon', 'evening', 'all'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $slots = $this->input('availabilities', []);
            if (! is_array($slots)) {
                return;
            }
            foreach ($slots as $i => $slot) {
                if (! is_array($slot)) {
                    continue;
                }
                $day = $slot['day_of_week'] ?? null;
                $period = $slot['period'] ?? null;
                // Règle métier : day_of_week null ⇔ period 'all' (slot Flexible).
                if ($day === null && $period !== 'all') {
                    $v->errors()->add("availabilities.$i.period", 'Un slot sans jour doit avoir period = all (Flexible).');
                }
                if ($day !== null && $period === 'all') {
                    $v->errors()->add("availabilities.$i.period", 'Period = all est réservé au slot Flexible (day_of_week null).');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'clubs.max' => 'Tu peux déclarer au maximum 3 clubs.',
            'clubs.*.exists' => "Un des clubs sélectionnés n'existe pas ou est désactivé.",
            'padel_level.between' => 'Le niveau padel doit être entre 1 et 5.',
        ];
    }
}
