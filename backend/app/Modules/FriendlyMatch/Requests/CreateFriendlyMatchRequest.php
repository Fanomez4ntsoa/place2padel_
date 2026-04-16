<?php

namespace App\Modules\FriendlyMatch\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateFriendlyMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'partner_uuid' => ['required', 'uuid', Rule::exists('users', 'uuid')],
            'opponent1_uuid' => ['required', 'uuid', Rule::exists('users', 'uuid')],
            'opponent2_uuid' => ['required', 'uuid', Rule::exists('users', 'uuid')],
        ];
    }
}
