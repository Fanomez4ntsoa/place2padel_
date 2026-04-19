<?php

namespace App\Modules\Club\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClaimClubRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && in_array($user->role, ['club_owner', 'admin'], true);
    }

    public function rules(): array
    {
        return [
            'club_uuid' => ['nullable', 'uuid', Rule::exists('clubs', 'uuid')->where('is_active', true)],
            'club_name' => ['nullable', 'string', 'max:191'],
            'club_type' => ['required', Rule::in(['associatif', 'prive'])],
        ];
    }

    public function messages(): array
    {
        return [
            'club_uuid.exists' => "Le club sélectionné n'existe pas ou est désactivé.",
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (! $this->filled('club_uuid') && ! $this->filled('club_name')) {
                $v->errors()->add('club_uuid', 'Tu dois fournir club_uuid ou club_name.');
            }
        });
    }
}
