<?php

namespace App\Modules\Matchmaking\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProposeToPartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_user_uuid' => ['required', 'uuid', 'exists:users,uuid'],
            'message' => ['nullable', 'string', 'max:500'],
        ];
    }
}
