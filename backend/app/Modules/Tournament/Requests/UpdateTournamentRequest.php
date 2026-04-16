<?php

namespace App\Modules\Tournament\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTournamentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tournament = $this->route('tournament');
        $currentRegistered = $tournament?->registeredTeams()->count() ?? 0;

        return [
            'name' => ['sometimes', 'string', 'min:3', 'max:191'],
            'location' => ['sometimes', 'nullable', 'string', 'max:191'],

            'club_uuid' => ['sometimes', 'uuid', Rule::exists('clubs', 'uuid')->where('is_active', true)],

            'type' => ['sometimes', Rule::in(['masculin', 'feminin', 'mixte', 'open'])],
            'level' => ['sometimes', Rule::in(['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000'])],

            'date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'inscription_deadline' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'before_or_equal:date'],

            // max_teams ne peut descendre sous le nombre actuel d'équipes inscrites.
            'max_teams' => ['sometimes', 'integer', 'min:'.max(2, $currentRegistered), 'max:64'],
            'courts_available' => ['sometimes', 'integer', 'min:1', 'max:20'],

            'price' => ['sometimes', 'nullable', 'string', 'max:50'],
            'payment_method' => ['sometimes', 'nullable', 'in:on_site,online'],
        ];
    }

    public function messages(): array
    {
        return [
            'max_teams.min' => 'Impossible de réduire max_teams sous le nombre d\'équipes déjà inscrites.',
        ];
    }
}
