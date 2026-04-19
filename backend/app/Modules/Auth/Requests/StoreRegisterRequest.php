<?php

namespace App\Modules\Auth\Requests;

use Illuminate\Contracts\Validation\Validator;
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

            // Club principal via UUID singleton (retro-compat payload legacy).
            'club_uuid' => ['nullable', 'uuid', Rule::exists('clubs', 'uuid')->where('is_active', true)],

            // Multi-clubs via pivot user_clubs (max 3, ordre = priority 1..3). Aligné avec
            // UpdateProfileRequest — si fourni, prime sur club_uuid.
            'clubs' => ['nullable', 'array', 'max:3'],
            'clubs.*' => ['uuid', 'distinct', Rule::exists('clubs', 'uuid')->where('is_active', true)],

            'license_number' => ['nullable', 'string', 'max:50'],
            'max_radius_km' => ['nullable', 'integer', 'min:1', 'max:500'],
            'max_radius_training_km' => ['nullable', 'integer', 'min:1', 'max:500'],

            'preferred_levels' => ['nullable', 'array', 'max:7'],
            'preferred_levels.*' => ['string', Rule::in(['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000'])],

            // Champs profil player. Persistés sur user_profiles via AuthService. Alignés
            // avec UpdateProfileRequest pour cohérence create/update.
            'position' => ['nullable', Rule::in(['left', 'right', 'both'])],
            'padel_level' => ['nullable', 'integer', 'between:1,5'],
            'bio' => ['nullable', 'string', 'max:1000'],

            // Disponibilités — tuples {day_of_week, period}. Règle Flexible (day null ⇔
            // period 'all') enforced par withValidator() ci-dessous.
            'availabilities' => ['nullable', 'array', 'max:10'],
            'availabilities.*' => ['array:day_of_week,period'],
            'availabilities.*.day_of_week' => ['nullable', 'integer', 'between:1,7'],
            'availabilities.*.period' => ['required', Rule::in(['morning', 'afternoon', 'evening', 'all'])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($v) {
            // Contrainte métier Flexible : day_of_week null ⇔ period 'all'.
            $slots = $this->input('availabilities', []);
            if (! is_array($slots)) {
                return;
            }
            foreach ($slots as $i => $slot) {
                if (! is_array($slot)) {
                    continue;
                }
                $day = $slot['day_of_week'] ?? null;
                $period = $slot['period'] ?? null;
                if ($day === null && $period !== 'all') {
                    $v->errors()->add("availabilities.$i.period", 'Un slot sans jour doit avoir period = all (Flexible).');
                }
                if ($day !== null && $period === 'all') {
                    $v->errors()->add("availabilities.$i.period", 'Period = all est réservé au slot Flexible (day_of_week null).');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Cet email est déjà utilisé.',
            'email.email' => "Le format de l'email est invalide.",
            'password.min' => 'Le mot de passe doit faire au moins 8 caractères.',
            'club_uuid.exists' => "Le club sélectionné n'existe pas ou est désactivé.",
            'clubs.max' => 'Tu peux déclarer au maximum 3 clubs.',
            'clubs.*.exists' => "Un des clubs sélectionnés n'existe pas ou est désactivé.",
            'padel_level.between' => 'Le niveau doit être entre 1 et 5.',
            'availabilities.max' => 'Maximum 10 créneaux de disponibilité.',
        ];
    }
}
