<?php

namespace App\Modules\Matchmaking\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeclareSeekingPartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'message' => ['nullable', 'string', 'max:500'],
        ];
    }
}
