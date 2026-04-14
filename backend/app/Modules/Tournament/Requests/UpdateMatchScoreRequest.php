<?php

namespace App\Modules\Tournament\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMatchScoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Autorisation métier gérée dans le controller (captain/partner d'une équipe).
    }

    public function rules(): array
    {
        return [
            'team1_games' => ['required', 'integer', 'min:0', 'max:9'],
            'team2_games' => ['required', 'integer', 'min:0', 'max:9'],
            'tiebreak_team1' => ['nullable', 'integer', 'min:0'],
            'tiebreak_team2' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $g1 = (int) $this->input('team1_games');
            $g2 = (int) $this->input('team2_games');
            $tb1 = $this->input('tiebreak_team1');
            $tb2 = $this->input('tiebreak_team2');

            $tbRequired = $g1 === 8 && $g2 === 8;

            if ($tbRequired && ($tb1 === null || $tb2 === null)) {
                $v->errors()->add('tiebreak_team1', 'Tie-break obligatoire à 8-8.');
                return;
            }

            if (! $tbRequired && ($tb1 !== null || $tb2 !== null)) {
                $v->errors()->add('tiebreak_team1', 'Tie-break uniquement autorisé à 8-8.');
                return;
            }

            if ($tbRequired && abs((int) $tb1 - (int) $tb2) < 2) {
                $v->errors()->add('tiebreak_team1', 'Écart tie-break >= 2 requis.');
            }
        });
    }
}
