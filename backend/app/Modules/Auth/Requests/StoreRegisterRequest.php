<?php

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('email')) {
            $this->merge([
                'email' => strtolower(trim($this->input('email'))),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc,dns', 'max:191', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
            'first_name' => ['required', 'string', 'min:1', 'max:100'],
            'last_name' => ['required', 'string', 'min:1', 'max:100'],

            // role : whitelist strict player|referee|club_owner. admin et organizer refusés
            // (422) pour empêcher toute privilege escalation via le register public.
            'role' => ['nullable', Rule::in(['player', 'referee', 'club_owner'])],

            'city' => ['nullable', 'string', 'max:100'],
            'club_uuid' => ['nullable', 'uuid', Rule::exists('clubs', 'uuid')->where('is_active', true)],

            'license_number' => ['nullable', 'string', 'max:50'],
            'max_radius_km' => ['nullable', 'integer', 'min:1', 'max:500'],
            'max_radius_training_km' => ['nullable', 'integer', 'min:1', 'max:500'],

            'preferred_levels' => ['nullable', 'array', 'max:7'],
            'preferred_levels.*' => ['string', Rule::in(['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000'])],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Cet email est déjà utilisé.',
            'email.email' => "Le format de l'email est invalide.",
            'password.min' => 'Le mot de passe doit faire au moins 8 caractères.',
            'club_uuid.exists' => "Le club sélectionné n'existe pas ou est désactivé.",
        ];
    }
}
