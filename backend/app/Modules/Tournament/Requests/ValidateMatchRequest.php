<?php

namespace App\Modules\Tournament\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ValidateMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Métier dans le controller.
    }

    public function rules(): array
    {
        return [
            'team' => ['required', 'in:team1,team2'],
        ];
    }
}
