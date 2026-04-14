<?php

namespace App\Modules\Feed\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // autorisation métier gérée dans le controller (rôle/organisateur).
    }

    public function rules(): array
    {
        return [
            'text' => ['nullable', 'string', 'max:5000'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'tournament_uuid' => ['nullable', 'uuid', 'exists:tournaments,uuid'],
        ];
    }

    public function withValidator(Validator $v): void
    {
        $v->after(function (Validator $v) {
            if (! $this->filled('text') && ! $this->filled('image_url')) {
                $v->errors()->add('text', 'Un post doit contenir du texte ou une image.');
            }
        });
    }
}
