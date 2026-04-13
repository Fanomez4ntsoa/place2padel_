<?php

namespace App\Modules\Tournament\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTournamentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'club_uuid' => ['required', 'uuid', Rule::exists('clubs', 'uuid')->where('is_active', true)],

            'name' => ['required', 'string', 'min:3', 'max:191'],
            'location' => ['nullable', 'string', 'max:191'],

            'type' => ['required', Rule::in(['masculin', 'feminin', 'mixte', 'open'])],
            'level' => ['required', Rule::in(['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000'])],

            // `after_or_equal:today` = date >= aujourd'hui (pas de tournoi dans le passé).
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            // HH:MM strict.
            'start_time' => ['sometimes', 'date_format:H:i'],
            // Deadline <= date du tournoi (on ne peut pas s'inscrire après le tournoi).
            'inscription_deadline' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:date'],

            'max_teams' => ['required', 'integer', 'min:2', 'max:64'],
            'courts_available' => ['sometimes', 'integer', 'min:1', 'max:20'],

            'price' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'club_uuid.exists' => "Le club sélectionné n'existe pas ou est désactivé.",
            'date.after_or_equal' => 'La date du tournoi doit être future.',
            'inscription_deadline.before_or_equal' => 'La deadline d\'inscription doit précéder la date du tournoi.',
        ];
    }
}
