<?php

namespace App\Modules\Tournament\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ForfeitMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'forfeiting_team' => ['required', 'in:team1,team2'],
        ];
    }
}
