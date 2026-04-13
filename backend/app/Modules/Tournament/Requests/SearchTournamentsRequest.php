<?php

namespace App\Modules\Tournament\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchTournamentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['sometimes', 'string', 'min:2', 'max:100'],
            'club_uuid' => ['sometimes', 'uuid', Rule::exists('clubs', 'uuid')],
            'city' => ['sometimes', 'string', 'min:2', 'max:100'],
            'level' => ['sometimes', Rule::in(['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000'])],
            'type' => ['sometimes', Rule::in(['masculin', 'feminin', 'mixte', 'open'])],
            'status' => ['sometimes', Rule::in(['open', 'full', 'in_progress', 'completed'])],
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }
}
