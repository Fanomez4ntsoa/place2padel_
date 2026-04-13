<?php

namespace App\Modules\Tournament\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Partner optionnel → inscription solo autorisée (matching partenaire Phase 3).
            // Ne peut pas être soi-même.
            'partner_uuid' => [
                'nullable',
                'uuid',
                Rule::exists('users', 'uuid'),
                Rule::notIn([$this->user()?->uuid]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'partner_uuid.exists' => 'Partenaire introuvable.',
            'partner_uuid.not_in' => 'Tu ne peux pas être ton propre partenaire.',
        ];
    }
}
