<?php

namespace App\Modules\FriendlyMatch\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ValidateFriendlyMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'team' => ['required', 'integer', 'in:1,2'],
        ];
    }
}
