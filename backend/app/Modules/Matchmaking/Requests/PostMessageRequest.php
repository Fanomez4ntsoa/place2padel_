<?php

namespace App\Modules\Matchmaking\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PostMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Volontairement pas de champ 'type' : l'API exposée ne permet QUE du texte libre.
            // Les types 'system' et 'tournament_proposal' sont réservés au ConversationService
            // (création automatique par createProposal).
            'text' => ['required', 'string', 'min:1', 'max:5000'],
        ];
    }
}
